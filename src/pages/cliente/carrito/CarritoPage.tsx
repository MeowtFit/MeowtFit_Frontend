import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Minus,
  Plus,
  Trash2,
  X,
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
import { crearCotizacion } from "@/api/cotizacionesApi";

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
    const colorObj = color as {
      nombre?: string;
      nombreColor?: string;
    };

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

  const [mostrarPopupCotizacion, setMostrarPopupCotizacion] = useState(false);

  const [generandoFactura, setGenerandoFactura] = useState(false);
  const [mensajeFactura, setMensajeFactura] = useState<string | null>(null);

  const [precioPropuesto, setPrecioPropuesto] = useState("");
  const [comentarioCotizacion, setComentarioCotizacion] = useState("");
  const [enviandoCotizacion, setEnviandoCotizacion] = useState(false);
  const [mensajeCotizacion, setMensajeCotizacion] = useState<string | null>(
    null
  );
  const [cotizacionCreadaId, setCotizacionCreadaId] = useState<number | null>(
    null
  );

  useEffect(() => {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });

      return;
    }

    void cargarCarrito();
    void cargarConfiguracion();
  }, [navigate, location.pathname]);

  useEffect(() => {
    const verificarCambioSesion = () => {
      const sesion = obtenerSesionUsuario();

      if (!sesion.estaLogeado) {
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("storage", verificarCambioSesion);

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
    () =>
      items.reduce((acc, item) => acc + calcularSubtotalSinDescuento(item), 0),
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
  const total = subtotalConDescuento + envio;

  const limiteCotizacion = configuracion?.stockMinimoCotizacion ?? 0;

  const porcentajePrecioPiso =
    configuracion?.porcentajePrecioPiso !== undefined
      ? configuracion.porcentajePrecioPiso
      : 0;

  const precioMinimoCotizacion =
    porcentajePrecioPiso > 0
      ? subtotalBase * (porcentajePrecioPiso / 100)
      : 0;

  const superaLimiteCotizacion =
    items.length > 0 && limiteCotizacion > 0 && totalUnidades >= limiteCotizacion;

  useEffect(() => {
    if (superaLimiteCotizacion && !cotizacionCreadaId) {
      setMostrarPopupCotizacion(true);
    }
  }, [superaLimiteCotizacion, cotizacionCreadaId]);

  function abrirModalCotizacion() {
    setMensajeCotizacion(null);
    setMostrarPopupCotizacion(true);
  }

  async function generarFactura() {
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

    if (superaLimiteCotizacion) {
      setMensajeFactura(
        "Este carrito supera el límite de venta directa. Debes solicitar una cotización."
      );
      abrirModalCotizacion();
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

  async function handleCrearCotizacion() {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: false,
        state: { from: location.pathname },
      });

      return;
    }

    if (sesion.rol !== "CLIENTE") {
      setMensajeCotizacion("Solo los clientes pueden solicitar cotizaciones.");
      return;
    }

    if (!superaLimiteCotizacion) {
      setMensajeCotizacion(
        `Para solicitar cotización necesitas al menos ${limiteCotizacion} unidades.`
      );
      return;
    }

    const precio = Number(precioPropuesto);

    if (!precioPropuesto.trim() || Number.isNaN(precio) || precio <= 0) {
      setMensajeCotizacion("Ingresa un precio propuesto válido.");
      return;
    }

    if (precioMinimoCotizacion > 0 && precio < precioMinimoCotizacion) {
      setMensajeCotizacion(
        `El precio propuesto es inviable. El mínimo permitido es ${formatearPrecio(
          precioMinimoCotizacion
        )}.`
      );
      return;
    }

    try {
      setEnviandoCotizacion(true);
      setMensajeCotizacion(null);

      const cotizacion = await crearCotizacion({
        precioPropuesto: precio,
        comentario: comentarioCotizacion.trim() || null,
        lineas: items.map((item) => ({
          idVariante: item.linea.idVariante,
          cantidad: item.linea.cantidad,
          precioReferencial: item.linea.precioUnitario,
        })),
      });

      setCotizacionCreadaId(cotizacion.idCotizacion);
      setMensajeCotizacion(
        `Cotización enviada correctamente. N.° ${cotizacion.idCotizacion}`
      );

      setMensajeFactura(
        `Cotización enviada correctamente. N.° ${cotizacion.idCotizacion}`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo crear la cotización.";

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

      setMensajeCotizacion(message);
    } finally {
      setEnviandoCotizacion(false);
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
        <h1 className="text-5xl font-extrabold text-slate-900">Tu Carrito</h1>

        <p className="mt-2 text-slate-500">
          {items.length} artículo(s) en tu carrito
        </p>

        {superaLimiteCotizacion && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />

            <div>
              <p className="font-bold">
                Este carrito supera el límite para compra directa.
              </p>

              <p className="mt-1 text-sm">
                Has seleccionado {totalUnidades} unidades. El mínimo configurado
                para cotización es {limiteCotizacion} unidades. Para continuar,
                debes solicitar una cotización personalizada.
              </p>

              <button
                type="button"
                onClick={abrirModalCotizacion}
                className="mt-3 rounded-lg bg-[#087f99] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#076f86]"
              >
                Solicitar cotización
              </button>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
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
                              Llevas {item.linea.cantidad} u. (-
                              {porcentajeDesc}%)
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
                              void cambiarCantidad(
                                item,
                                item.linea.cantidad - 1
                              )
                            }
                            disabled={item.linea.cantidad <= 1}
                            className="p-1 text-slate-500 hover:text-[#087f99] disabled:opacity-30"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            type="number"
                            value={
                              item.linea.cantidad === 0
                                ? ""
                                : item.linea.cantidad
                            }
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
                              void cambiarCantidad(
                                item,
                                item.linea.cantidad + 1
                              )
                            }
                            disabled={
                              item.linea.cantidad >= stockReal(item.variante)
                            }
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
            <h2 className="text-3xl font-bold">Resumen de Compra</h2>

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
                <span>Total de unidades</span>
                <span>{totalUnidades}</span>
              </div>

              {limiteCotizacion > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Límite cotización</span>
                  <span>{limiteCotizacion} unidades</span>
                </div>
              )}

              <hr />

              <div className="flex justify-between text-3xl font-bold text-[#bd2d73]">
                <span>Total</span>
                <span>{formatearPrecio(total)}</span>
              </div>

              <Button
                type="button"
                onClick={() =>
                  superaLimiteCotizacion
                    ? abrirModalCotizacion()
                    : void generarFactura()
                }
                disabled={
                  generandoFactura || enviandoCotizacion || items.length === 0
                }
                className={`mt-6 h-14 w-full rounded-xl text-xl font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                  superaLimiteCotizacion
                    ? "bg-[#bd2d73] hover:bg-[#a82365]"
                    : "bg-[#087f99] hover:bg-[#076f86]"
                }`}
              >
                {superaLimiteCotizacion
                  ? "Solicitar cotización"
                  : generandoFactura
                    ? "Generando..."
                    : "Generar factura"}
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

      {mostrarPopupCotizacion && superaLimiteCotizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="relative w-full max-w-[620px] rounded-[32px] bg-white p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              onClick={() => setMostrarPopupCotizacion(false)}
              className="absolute right-7 top-7 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            >
              <X size={18} />
            </button>

            <div className="flex justify-center">
              <img
                src={logoMeowtfit}
                alt="Meowtfit Logo"
                className="h-24 object-contain"
              />
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
                Cotización mayorista
              </p>

              <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
                Tu carrito requiere cotización
              </h2>

              <p className="mx-auto mt-3 max-w-[480px] text-sm leading-6 text-slate-500">
                Has seleccionado {totalUnidades} unidades. Para compras desde{" "}
                {limiteCotizacion} unidades, un comerciante revisará tu solicitud
                y podrá aprobarla, rechazarla o enviarte una contrapropuesta.
              </p>
            </div>

            {cotizacionCreadaId ? (
              <div className="mt-8 rounded-2xl bg-emerald-50 px-5 py-5 text-center">
                <p className="text-lg font-extrabold text-emerald-700">
                  Cotización enviada correctamente
                </p>

                <p className="mt-2 text-sm text-emerald-600">
                  Número de cotización: #{cotizacionCreadaId}
                </p>

                <Button
                  type="button"
                  onClick={() => setMostrarPopupCotizacion(false)}
                  className="mt-5 h-11 rounded-xl bg-[#087f99] px-8 font-bold text-white hover:bg-[#076f86]"
                >
                  Volver al carrito
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-8 rounded-2xl bg-slate-50 p-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Subtotal referencial</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatearPrecio(subtotalBase)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Unidades solicitadas</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {totalUnidades}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Precio piso estimado</p>
                      <p className="mt-1 text-lg font-bold text-[#bd2d73]">
                        {precioMinimoCotizacion > 0
                          ? formatearPrecio(precioMinimoCotizacion)
                          : "No configurado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Precio con descuento actual</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatearPrecio(subtotalConDescuento)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Precio propuesto
                    </label>

                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={precioPropuesto}
                      onChange={(event) => {
                        setPrecioPropuesto(event.target.value);
                        setMensajeCotizacion(null);
                      }}
                      placeholder="Ej. 12000"
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#087f99]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Comentario para el comerciante
                    </label>

                    <textarea
                      value={comentarioCotizacion}
                      onChange={(event) =>
                        setComentarioCotizacion(event.target.value)
                      }
                      placeholder="Ej. Necesito entrega en provincia, podría pagar por adelantado..."
                      rows={4}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#087f99]"
                    />
                  </div>

                  {mensajeCotizacion && (
                    <p
                      className={`rounded-xl px-4 py-3 text-sm font-bold ${
                        mensajeCotizacion.includes("correctamente")
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {mensajeCotizacion}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMostrarPopupCotizacion(false)}
                    className="h-12 flex-1 rounded-xl border-slate-200 font-bold text-slate-600"
                  >
                    Regresar al carrito
                  </Button>

                  <Button
                    type="button"
                    onClick={() => void handleCrearCotizacion()}
                    disabled={enviandoCotizacion}
                    className="h-12 flex-1 rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86] disabled:opacity-60"
                  >
                    {enviandoCotizacion
                      ? "Enviando..."
                      : "Enviar cotización"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}