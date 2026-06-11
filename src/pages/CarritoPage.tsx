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

import {
  obtenerOCrearCarritoActivo,
  listarLineasPorCarrito,
  actualizarLineaCarrito,
  eliminarLineaCarrito,
  type LineaCarrito,
} from "@/api/carritoApi";

import {
  obtenerVariantePorId,
  type VarianteProductoDetalleDTO,
} from "@/api/catalogoApi";

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

type ItemCarrito = {
  linea: LineaCarrito;
  variante: VarianteProductoDetalleDTO;
};

export default function CarritoPage() {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCarrito();
  }, []);

  async function cargarCarrito() {
    try {
      setLoading(true);

      const carrito = await obtenerOCrearCarritoActivo();

      const lineas = await listarLineasPorCarrito(carrito.idCarrito);

      const detalles = await Promise.all(
        lineas.map(async (linea) => {
          const variante = await obtenerVariantePorId(linea.idVariante);

          return {
            linea,
            variante,
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

  async function cambiarCantidad(
    item: ItemCarrito,
    nuevaCantidad: number
  ) {
    if (nuevaCantidad <= 0) return;

    await actualizarLineaCarrito(item.linea.idLineaCarrito, {
      cantidad: nuevaCantidad,
      precioUnitario: item.linea.precioUnitario,
      subtotal: item.linea.precioUnitario * nuevaCantidad,
      idCarrito: item.linea.idCarrito,
      idVariante: item.linea.idVariante,
    });

    await cargarCarrito();
  }

  async function eliminarItem(item: ItemCarrito) {
    await eliminarLineaCarrito(item.linea.idLineaCarrito);

    setItems((prev) =>
      prev.filter(
        (x) =>
          x.linea.idLineaCarrito !== item.linea.idLineaCarrito
      )
    );
  }

  const subtotal = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.linea.subtotal),
        0
      ),
    [items]
  );

  const envio = subtotal > 0 ? 15 : 0;

  const total = subtotal + envio;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        Cargando carrito...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7fafc]">
      <header className="sticky top-0 z-40 border-b border-cyan-200 bg-white">
        <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="text-xl font-extrabold text-[#087f99]"
          >
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
        <h1 className="text-5xl font-extrabold text-slate-900">
          Tu Carrito
        </h1>

        <p className="mt-2 text-slate-500">
          {items.length} artículo(s) en tu carrito
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-6">
            {items.map((item) => (
              <article
                key={item.linea.idLineaCarrito}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex gap-5">
                  <img
                    src={normalizarImagen(
                      item.variante.producto.imagenUrl
                    )}
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
                      </div>

                      <button
                        onClick={() => eliminarItem(item)}
                      >
                        <Trash2 />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <button
                          onClick={() =>
                            cambiarCantidad(
                              item,
                              item.linea.cantidad - 1
                            )
                          }
                        >
                          <Minus size={15} />
                        </button>

                        <span>
                          {item.linea.cantidad}
                        </span>

                        <button
                          onClick={() =>
                            cambiarCantidad(
                              item,
                              item.linea.cantidad + 1
                            )
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <p className="text-3xl font-bold">
                        {formatearPrecio(
                          Number(item.linea.subtotal)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {items.length === 0 && (
              <div className="rounded-2xl bg-white p-10 text-center">
                <p className="text-lg font-semibold">
                  Tu carrito está vacío
                </p>

                <Link
                  to="/"
                  className="mt-4 inline-block text-[#087f99]"
                >
                  Ir al catálogo
                </Link>
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl bg-[#d7edf2] p-6">
            <h2 className="text-3xl font-bold">
              Resumen de Compra
            </h2>

            <div className="mt-8 space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatearPrecio(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span>Envío</span>
                <span>{formatearPrecio(envio)}</span>
              </div>

              <hr />

              <div className="flex justify-between text-3xl font-bold text-[#bd2d73]">
                <span>Total</span>
                <span>{formatearPrecio(total)}</span>
              </div>

              <Button className="mt-6 w-full bg-[#087f99] hover:bg-[#076f86]">
                Generar factura
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}