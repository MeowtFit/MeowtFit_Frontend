import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import UserSessionMenu from "@/components/layout/UserSessionMenu";
import logoMeowtfit from "../assets/logo.png";

import {
  obtenerOCrearCarritoActivo,
  listarLineasPorCarrito,
  actualizarLineaCarrito,
  eliminarLineaCarrito,
  type LineaCarrito,
} from "@/api/carritoApi";

// Agregamos la importación de la nueva función e interfaz aquí mismo
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

import { Button } from "@/components/ui/button";

const API_BASE_URL = "http://localhost:8080";

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

// Extendemos el tipo para que asocie sus respectivas reglas
type ItemCarrito = {
  linea: LineaCarrito;
  variante: VarianteProductoDetalle;
  reglasDescuento: ReglaDescuentoDTO[];
};

export default function CarritoPage() {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(true);

  const [configuracion, setConfiguracion] =
    useState<ConfiguracionNegocio | null>(null);

  const [mostrarPopupCotizacion, setMostrarPopupCotizacion] =
    useState(true);

  useEffect(() => {
    void cargarCarrito();
    void cargarConfiguracion();
  }, []);

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
          
          // Consultamos las reglas al backend usando el idProducto
          let reglasDescuento: ReglaDescuentoDTO[] = [];
          try {
            reglasDescuento = await listarReglasPorProducto(variante.producto.idProducto);
          } catch (err) {
            console.error("No se pudieron cargar las reglas para el producto " + variante.producto.idProducto, err);
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

  // Helper para buscar qué porcentaje de descuento le corresponde según las unidades en el carrito
  const obtenerPorcentajeDescuento = (item: ItemCarrito) => {
    const cantidad = item.linea.cantidad;
    const regla = item.reglasDescuento.find(
      (r) => cantidad >= r.rangoMinimo && cantidad <= r.rangoMaximo
    );
    return regla ? regla.porcentaje : 0;
  };

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

  const manejarCambioInput = (item: ItemCarrito, valor: string) => {
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
  };

  const manejarBlurInput = (item: ItemCarrito) => {
    if (item.linea.cantidad <= 0) {
      void cambiarCantidad(item, 1);
    }
  };

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

  // Calculamos el subtotal base (precio normal sin descuentos)
  const subtotalBase = useMemo(
    () => items.reduce((acc, item) => acc + (item.linea.precioUnitario * item.linea.cantidad), 0),
    [items]
  );

  // Sumamos todos los montos de descuento calculados individualmente
  const descuentoTotalAcumulado = useMemo(() => {
    return items.reduce((acc, item) => {
      const porcentaje = obtenerPorcentajeDescuento(item);
      const totalItemSinDescuento = item.linea.precioUnitario * item.linea.cantidad;
      return acc + (totalItemSinDescuento * (porcentaje / 100));
    }, 0);
  }, [items]);

  const subtotalConDescuento = subtotalBase - descuentoTotalAcumulado;

  const totalUnidades = useMemo(
    () => items.reduce((acc, item) => acc + item.linea.cantidad, 0),
    [items]
  );

  const envio = items.length > 0 ? 15 : 0;
  const total = subtotalConDescuento + envio;

  const puedeCotizar =
    configuracion && totalUnidades >= configuracion.stockMinimoCotizacion;

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        Cargando carrito...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <header className="sticky top-0 z-40 border-b border-cyan-200 bg-white">
        <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-extrabold text-[#087f99]">
            MEOWTFIT
          </Link>

          <div className="flex items-center gap-5 text-[#087f99]">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-[#bd2d73] text-white"
            >
              <ShoppingCart size={20} />
            </Button>

            <Search size={19} />
            <UserSessionMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-5xl font-extrabold text-slate-900">Tu Carrito</h1>
        <p className="mt-2 text-slate-500">
          {items.length} artículo(s) en tu carrito
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {items.map((item) => {
              const porcentajeDesc = obtenerPorcentajeDescuento(item);
              const subtotalItemSinDesc = item.linea.precioUnitario * item.linea.cantidad;
              const rebajaItem = subtotalItemSinDesc * (porcentajeDesc / 100);
              const subtotalItemFinal = subtotalItemSinDesc - rebajaItem;

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
                            COLOR: {item.variante.color.nombre}
                          </p>
                          <p className="text-sm text-slate-500">
                            TALLA: {item.variante.talla}
                          </p>
                          
                          {/* Badge dinámico que avisa que se aplicó la ReglaDescuento */}
                          {porcentajeDesc > 0 && (
                            <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
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
                        <div className="flex items-center gap-2 rounded-lg border px-2 py-1 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              void cambiarCantidad(item, item.linea.cantidad - 1)
                            }
                            disabled={item.linea.cantidad <= 1}
                            className="text-slate-500 hover:text-[#087f99] disabled:opacity-30 disabled:hover:text-slate-500 p-1"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            type="number"
                            value={
                              item.linea.cantidad === 0 ? "" : item.linea.cantidad
                            }
                            onChange={(e) =>
                              manejarCambioInput(item, e.target.value)
                            }
                            onBlur={() => manejarBlurInput(item)}
                            min={1}
                            max={stockReal(item.variante)}
                            className="w-12 text-center font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void cambiarCantidad(item, item.linea.cantidad + 1)
                            }
                            disabled={
                              item.linea.cantidad >= stockReal(item.variante)
                            }
                            className="text-slate-500 hover:text-[#087f99] disabled:opacity-30 disabled:hover:text-slate-500 p-1"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        {/* Muestra precio tachado si hay descuento activo */}
                        <div className="text-right">
                          {porcentajeDesc > 0 && (
                            <p className="text-sm text-slate-400 line-through">
                              {formatearPrecio(subtotalItemSinDesc)}
                            </p>
                          )}
                          <p className="text-3xl font-bold">
                            {formatearPrecio(subtotalItemFinal)}
                          </p>
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

              {/* Fila informativa de cuánto dinero se está ahorrando */}
              {descuentoTotalAcumulado > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuentos por volumen</span>
                  <span>-{formatearPrecio(descuentoTotalAcumulado)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Envío (Express Lima)</span>
                <span>{formatearPrecio(envio)}</span>
              </div>

              <hr />

              <div className="flex justify-between text-3xl font-bold text-[#bd2d73]">
                <span>Total</span>
                <span>{formatearPrecio(total)}</span>
              </div>

              <Button className="mt-6 w-full bg-[#087f99] hover:bg-[#076f86] text-xl font-bold h-14 rounded-xl">
                Generar factura
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* MODAL DE COTIZACIÓN*/}
      {puedeCotizar && mostrarPopupCotizacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="relative w-full max-w-[560px] rounded-[32px] bg-white p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] text-center">
            
            <button
              type="button"
              onClick={() => setMostrarPopupCotizacion(false)}
              className="absolute left-10 top-10 flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#bd2d73] transition hover:opacity-80"
            >
              <span className="text-sm">←</span> VOLVER
            </button>

            <div className="mx-auto mt-6 flex justify-center">
              <img
                src={logoMeowtfit}
                alt="Meowtfit Logo"
                className="h-32 object-contain"
              />
            </div>

            <div className="mt-8 space-y-4 px-4 text-slate-700">
              <p className="text-2xl font-medium leading-tight text-slate-800">
                Al parecer intentas realizar una gran compra.
              </p>
              
              <p className="text-xl font-normal leading-relaxed text-slate-500">
                Tu pedido sera enviado a nuestros comerciantes para que puedan generarte una cotización y podamos ofrecerte un precio cómodo
              </p>
            </div>

            <div className="mt-10 px-4">
              <Button className="w-full bg-[#087f99] hover:bg-[#066479] text-xl font-semibold h-14 rounded-xl transition-colors">
                Generar Cotización
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}