import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import logoMeowtfit from "../../../assets/logo.png";

import {
  obtenerOCrearCarritoActivo,
  listarLineasPorCarrito,
  actualizarLineaCarrito,
  eliminarLineaCarrito,
  type LineaCarrito,
} from "@/api/carritoApi";

import {
  obtenerVariantePorId,
  listarReglasPorProducto,
  type VarianteProductoDetalle,
  type ReglaDescuentoDTO,
} from "@/api/catalogoApi";

import {
  obtenerConfiguracionNegocio,
  type ConfiguracionNegocio,
} from "@/api/configuracionApi";

import { crearPedido } from "@/api/pedidosApi";

import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

type ItemCarrito = {
  linea: LineaCarrito;
  variante: VarianteProductoDetalle;
  reglasDescuento: ReglaDescuentoDTO[];
};

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(precio);
}

function normalizarImagen(url?: string | null) {
  if (!url) {
    return "https://images.unsplash.com/photo-1529139574466-a303027c1d8b";
  }
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

function obtenerSesionUsuario() {
  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");

  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");

  return {
    correo,
    rol,
    estaLogeado: Boolean(correo && rol),
  };
}

function limpiarSesionLocal() {
  localStorage.removeItem("meowtfit_correo");
  localStorage.removeItem("meowtfit_rol");
  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
}

function obtenerNombreColor(color: unknown) {
  if (!color) return "Sin color";
  if (typeof color === "string") return color;
  if (typeof color === "object") {
    const colorObj = color as { nombre?: string; nombreColor?: string };
    return colorObj.nombre ?? colorObj.nombreColor ?? "Sin color";
  }
  return "Sin color";
}

export default function CarritoPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(true);

  const [configuracion, setConfiguracion] =
    useState<ConfiguracionNegocio | null>(null);

  const [mostrarPopupCotizacion, setMostrarPopupCotizacion] =
    useState(true);

  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [mensajeFactura, setMensajeFactura] = useState<string | null>(null);
  const [modalVistaCliente, setModalVistaCliente] = useState(false);

  // Al inicio de tu componente, junto a tus otros states, agrega este useRef:
  const cargandoCarritoRef = useRef(false);

  // 1. CONTROL DE REDIRECCIÓN SI NO ESTÁ LOGUEADO AL ENTRAR
  useEffect(() => {
    const sesion = obtenerSesionUsuario();
    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    const inicializarPagina = async () => {
      // SI YA HAY UNA PETICIÓN EN CURSO, BLOQUEAMOS COMPLETAMENTE LA SEGUNDA
      if (cargandoCarritoRef.current) return;
      
      try {
        cargandoCarritoRef.current = true; // Encendemos el semáforo
        await cargarCarrito();
        await cargarConfiguracion();
      } catch (error) {
        console.error("Error cargando componentes de página", error);
      } finally {
        cargandoCarritoRef.current = false; // Apagamos el semáforo al terminar todo
      }
    };

    void inicializarPagina();

    // Ya no dependemos de variables locales volátiles
  }, [navigate]);

  // 2. ESCUCHAR CUANDO SE CIERRA SESIÓN DESDE EL USER SESSION MENU
  useEffect(() => {
    const verificarCambioSesion = () => {
      const sesion = obtenerSesionUsuario();
      // Si el menú borró las llaves de autenticación, lo mandamos al Home de inmediato
      if (!sesion.estaLogeado) {
        navigate("/", { replace: true });
      }
    };

    // Escucha cambios hechos desde otras pestañas o componentes
    window.addEventListener("storage", verificarCambioSesion);
    
    // Sobrescribimos temporalmente la mutación local para que funcione en la misma pestaña
    const intervalo = setInterval(verificarCambioSesion, 500);

    return () => {
      window.removeEventListener("storage", verificarCambioSesion);
      clearInterval(intervalo);
    };
  }, [navigate]);

  async function cargarConfiguracion() {
    try {
      const config = await obtenerConfiguracionNegocio();
      setConfiguracion(config);
    } catch (error) {
      console.error(error);
    }
  }

  async function cargarCarrito() {
    try {
      setLoading(true);
      const carrito = await obtenerOCrearCarritoActivo();
      const lineas = await listarLineasPorCarrito(carrito.idCarrito);

      const detalles = await Promise.all(
        lineas.map(async (linea) => {
          const variante = await obtenerVariantePorId(linea.idVariante);
          let reglasDescuento: ReglaDescuentoDTO[] = [];

          try {
            reglasDescuento = await listarReglasPorProducto(
              variante.producto.idProducto
            );
          } catch (err) {
            console.error(
              "No se pudieron cargar las reglas para el producto " +
              variante.producto.idProducto,
              err
            );
          }

          return {
            linea,
            variante,
            reglasDescuento,
          };
        })
      );

      setItems(detalles);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function stockReal(variante: VarianteProductoDetalle) {
    return Math.max(
      (variante.stockDisponible ?? 0) - (variante.stockReservado ?? 0),
      0
    );
  }

  function obtenerPorcentajeDescuento(item: ItemCarrito) {
    const cantidad = item.linea.cantidad;
    const regla = item.reglasDescuento.find(
      (r) => cantidad >= r.rangoMinimo && cantidad <= r.rangoMaximo
    );
    return regla ? regla.porcentaje : 0;
  }

  function calcularSubtotalSinDescuento(item: ItemCarrito) {
    return item.linea.precioUnitario * item.linea.cantidad;
  }

  function calcularDescuentoItem(item: ItemCarrito) {
    const subtotal = calcularSubtotalSinDescuento(item);
    const porcentaje = obtenerPorcentajeDescuento(item);
    return subtotal * (porcentaje / 100);
  }

  function calcularTotalItem(item: ItemCarrito) {
    return calcularSubtotalSinDescuento(item) - calcularDescuentoItem(item);
  }

  async function cambiarCantidad(item: ItemCarrito, nuevaCantidad: number) {
    const stockDisponible = stockReal(item.variante);

    if (nuevaCantidad <= 0 || nuevaCantidad > stockDisponible) {
      return;
    }

    const nuevoSubtotal = item.linea.precioUnitario * nuevaCantidad;

    try {
      await actualizarLineaCarrito(item.linea.idLineaCarrito, {
        cantidad: nuevaCantidad,
        precioUnitario: item.linea.precioUnitario,
        subtotal: nuevoSubtotal,
        idCarrito: item.linea.idCarrito,
        idVariante: item.linea.idVariante,
      });

      setItems((prev) =>
        prev.map((actual) => {
          if (actual.linea.idLineaCarrito !== item.linea.idLineaCarrito) {
            return actual;
          }
          return {
            ...actual,
            linea: {
              ...actual.linea,
              cantidad: nuevaCantidad,
              subtotal: nuevoSubtotal,
            },
          };
        })
      );
    } catch (error) {
      console.error(error);
    }
  }

  function manejarCambioInput(item: ItemCarrito, valor: string) {
    const stockDisponible = stockReal(item.variante);

    if (valor === "") {
      setItems((prev) =>
        prev.map((actual) =>
          actual.linea.idLineaCarrito === item.linea.idLineaCarrito
            ? { ...actual, linea: { ...actual.linea, cantidad: 0 } }
            : actual
        )
      );
      return;
    }

    let nuevaCantidad = parseInt(valor, 10);
    if (isNaN(nuevaCantidad)) return;

    if (nuevaCantidad > stockDisponible) {
      nuevaCantidad = stockDisponible;
    }

    void cambiarCantidad(item, nuevaCantidad);
  }

  function manejarBlurInput(item: ItemCarrito) {
    if (item.linea.cantidad <= 0) {
      void cambiarCantidad(item, 1);
    }
  }

  async function eliminarItem(item: ItemCarrito) {
    try {
      await eliminarLineaCarrito(item.linea.idLineaCarrito);
      setItems((prev) =>
        prev.filter((x) => x.linea.idLineaCarrito !== item.linea.idLineaCarrito)
      );
    } catch (error) {
      console.error("ERROR ELIMINANDO", error);
    }
  }

  const subtotalBase = useMemo(
    () => items.reduce((acc, item) => acc + calcularSubtotalSinDescuento(item), 0),
    [items]
  );

  const descuentoTotalAcumulado = useMemo(
    () => items.reduce((acc, item) => acc + calcularDescuentoItem(item), 0),
    [items]
  );

  const subtotalConDescuento = subtotalBase - descuentoTotalAcumulado;

  const totalUnidades = useMemo(
    () => items.reduce((acc, item) => acc + item.linea.cantidad, 0),
    [items]
  );

  const envio = items.length > 0 ? 15 : 0;
  const igv = subtotalConDescuento * 0.18;
  const total = subtotalConDescuento + igv + envio;

  const puedeCotizar =
    configuracion && totalUnidades >= configuracion.stockMinimoCotizacion;

  async function generarFactura() {
    // Bloquear en modo vista cliente
    if (sessionStorage.getItem("meowtfit_vista_cliente") === "true") {
      setModalVistaCliente(true);
      return;
    }

    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: false,
        state: { from: location.pathname },
      });
      return;
    }

    if (sesion.rol !== "CLIENTE") {
      setMensajeFactura("Solo los clientes pueden generar pedidos.");
      return;
    }

    if (items.length === 0) {
      setMensajeFactura("No puedes generar un pedido con el carrito vacío.");
      return;
    }

    const itemSinStock = items.find(
      (item) => item.linea.cantidad > stockReal(item.variante)
    );

    if (itemSinStock) {
      setMensajeFactura(
        `No hay stock suficiente para ${itemSinStock.variante.producto.nombre}.`
      );
      return;
    }

    try {
      setGenerandoFactura(true);
      setMensajeFactura(null);

      const pedido = await crearPedido({
        metodoPago: "TRANSFERENCIA",
        lineas: items.map((item) => ({
          idVariante: item.linea.idVariante,
          cantidad: item.linea.cantidad,
        })),
      });

      await Promise.all(
        items.map((item) => eliminarLineaCarrito(item.linea.idLineaCarrito))
      );

      setItems([]);

      navigate("/pedidos", {
        replace: true,
        state: { pedidoGenerado: pedido.idPedido },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el pedido.";

      const debeIrALogin =
        message.includes("401") ||
        message.includes("403") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("forbidden");

      if (debeIrALogin) {
        limpiarSesionLocal();
        navigate("/login", {
          replace: false,
          state: { from: location.pathname },
        });
        return;
      }

      setMensajeFactura(message);
    } finally {
      setGenerandoFactura(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        Cargando carrito...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-5xl font-extrabold text-slate-900">Tu carrito</h1>
        <p className="mt-2 text-slate-500">
          {items.length} artículo(s) en tu carrito
        </p>

        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#087f99] hover:text-[#087f99]"
        >
          <ArrowLeft size={15} />
          Seguir comprando
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {items.map((item) => {
              const porcentajeDesc = obtenerPorcentajeDescuento(item);
              const subtotalItemSinDesc = calcularSubtotalSinDescuento(item);
              const rebajaItem = calcularDescuentoItem(item);
              const subtotalItemFinal = calcularTotalItem(item);

              return (
                <article
                  key={item.linea.idLineaCarrito}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex gap-5">
                    <img
                      src={normalizarImagen(item.variante.producto.imagenUrl)}
                      alt={item.variante.producto.nombre}
                      className="h-36 w-28 rounded-xl object-cover"
                    />

                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <h2 className="text-2xl font-bold">
                            {item.variante.producto.nombre}
                          </h2>
                          <p className="mt-1 text-sm text-slate-500">
                            COLOR: {obtenerNombreColor(item.variante.color)}
                          </p>
                          <p className="text-sm text-slate-500">
                            TALLA: {item.variante.talla}
                          </p>
                          {porcentajeDesc > 0 && (
                            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                              Llevas {item.linea.cantidad} u. (-{porcentajeDesc}%)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void eliminarItem(item)}
                          className="text-slate-400 transition hover:text-red-500"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-lg border bg-white px-2 py-1">
                          <button
                            type="button"
                            onClick={() =>
                              void cambiarCantidad(item, item.linea.cantidad - 1)
                            }
                            disabled={item.linea.cantidad <= 1}
                            className="p-1 text-slate-500 hover:text-[#087f99] disabled:opacity-30"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            type="number"
                            value={item.linea.cantidad === 0 ? "" : item.linea.cantidad}
                            onChange={(event) =>
                              manejarCambioInput(item, event.target.value)
                            }
                            onBlur={() => manejarBlurInput(item)}
                            min={1}
                            max={stockReal(item.variante)}
                            className="w-12 bg-transparent text-center font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void cambiarCantidad(item, item.linea.cantidad + 1)
                            }
                            disabled={item.linea.cantidad >= stockReal(item.variante)}
                            className="p-1 text-slate-500 hover:text-[#087f99] disabled:opacity-30"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <div className="text-right">
                          {porcentajeDesc > 0 && (
                            <p className="text-sm text-slate-400 line-through">
                              {formatearPrecio(subtotalItemSinDesc)}
                            </p>
                          )}
                          <p className="text-3xl font-bold">
                            {formatearPrecio(subtotalItemFinal)}
                          </p>
                          {rebajaItem > 0 && (
                            <p className="text-xs font-semibold text-emerald-600">
                              Ahorras {formatearPrecio(rebajaItem)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {items.length === 0 && (
              <div className="rounded-2xl bg-white p-10 text-center">
                <p className="text-lg font-semibold">Tu carrito está vacío</p>
                <Link to="/" className="mt-4 inline-block text-[#087f99]">
                  Ir al catálogo
                </Link>
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl bg-[#d7edf2] p-6">
            <h2 className="text-3xl font-bold">Resumen de compra</h2>
            <div className="mt-8 space-y-4">
              <div className="flex justify-between">
                <span>Subtotal base</span>
                <span>{formatearPrecio(subtotalBase)}</span>
              </div>

              {descuentoTotalAcumulado > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Descuentos por volumen</span>
                  <span>-{formatearPrecio(descuentoTotalAcumulado)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Envío (Express Lima)</span>
                <span>{formatearPrecio(envio)}</span>
              </div>

              <div className="flex justify-between text-sm text-slate-600">
                <span>IGV (18%)</span>
                <span>{formatearPrecio(igv)}</span>
              </div>

              <hr />

              <div className="flex justify-between text-3xl font-bold text-[#bd2d73]">
                <span>Total</span>
                <span>{formatearPrecio(total)}</span>
              </div>

              <Button
                type="button"
                onClick={() => void generarFactura()}
                disabled={generandoFactura || items.length === 0}
                className="mt-6 h-14 w-full rounded-xl bg-[#087f99] text-xl font-bold hover:bg-[#076f86] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generandoFactura ? "Generando..." : "Generar factura"}
              </Button>

              {mensajeFactura && (
                <p
                  className={`text-sm font-bold ${
                    mensajeFactura.includes("correctamente")
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {mensajeFactura}
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL VISTA CLIENTE — acción bloqueada */}
      {modalVistaCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Eye size={26} className="text-amber-600" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Acción no disponible
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Esta sección está inhabilitada en la vista de cliente.
              Estás navegando en modo de previsualización y no puedes
              realizar acciones transaccionales.
            </p>
            <Button
              type="button"
              onClick={() => setModalVistaCliente(false)}
              className="mt-6 h-11 w-full bg-[#087f99] text-sm font-bold hover:bg-[#076f86]"
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DE COTIZACIÓN */}
      {puedeCotizar && mostrarPopupCotizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[560px] rounded-[32px] bg-white p-10 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => setMostrarPopupCotizacion(false)}
              className="absolute left-10 top-10 flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#bd2d73] transition hover:opacity-80"
            >
              <span className="text-sm">←</span> VOLVER
            </button>

            <div className="mx-auto mt-6 flex justify-center">
              <img src={logoMeowtfit} alt="Meowtfit Logo" className="h-32 object-contain" />
            </div>

            <div className="mt-8 space-y-4 px-4 text-slate-700">
              <p className="text-2xl font-medium leading-tight text-slate-800">
                Al parecer intentas realizar una gran compra.
              </p>
              <p className="text-xl font-normal leading-relaxed text-slate-500">
                Tu pedido será enviado a nuestros comerciantes para que puedan
                generarte una cotización y podamos ofrecerte un precio cómodo.
              </p>
            </div>

            <div className="mt-10 px-4">
              <Button className="h-14 w-full rounded-xl bg-[#087f99] text-xl font-semibold transition-colors hover:bg-[#066479]">
                Generar cotización
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}