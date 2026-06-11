import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  listarCategorias,
  listarProductos,
  type Categoria,
  type Producto,
} from "@/api/catalogoApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const PAGE_SIZE = 6;

const tallasDisponibles = ["XS", "S", "M", "L", "XL"];

function normalizarImagen(imagenUrl?: string | null) {
  if (!imagenUrl) {
    return "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop";
  }

  if (imagenUrl.startsWith("http")) {
    return imagenUrl;
  }

  if (imagenUrl.startsWith("/")) {
    return `${API_BASE_URL}${imagenUrl}`;
  }

  return imagenUrl;
}

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(precio);
}

export default function CatalogHomePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<
    number | null
  >(null);
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [precioMax, setPrecioMax] = useState(500);
  const [orden, setOrden] = useState("precioBase,asc");
  const [busqueda, setBusqueda] = useState("");

  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalProductos, setTotalProductos] = useState(0);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargarCategorias() {
    try {
      const data = await listarCategorias();
      setCategorias(data);
    } catch {
      setCategorias([]);
    }
  }

  async function cargarProductos() {
    try {
      setCargando(true);
      setError(null);

      const data = await listarProductos({
        nombre: busqueda.trim() || undefined,
        idCategoria: categoriaSeleccionada ?? undefined,
        precioMin: 0,
        precioMax,
        talla: tallaSeleccionada || undefined,
        page: pagina,
        size: PAGE_SIZE,
        sort: orden,
      });

      setProductos(data.content);
      setTotalPaginas(data.totalPages);
      setTotalProductos(data.totalElements);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los productos.";

      setError(message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarCategorias();
  }, []);

  useEffect(() => {
    void cargarProductos();
  }, [
    pagina,
    categoriaSeleccionada,
    tallaSeleccionada,
    precioMax,
    orden,
    busqueda,
  ]);

  function handleCategoria(idCategoria: number) {
    setPagina(0);
    setCategoriaSeleccionada((actual) =>
      actual === idCategoria ? null : idCategoria
    );
  }

  function handleTalla(talla: string) {
    setPagina(0);
    setTallaSeleccionada((actual) => (actual === talla ? "" : talla));
  }

  function handlePrecioMax(value: number) {
    setPagina(0);
    setPrecioMax(value);
  }

  function handleOrden(value: string) {
    setPagina(0);
    setOrden(value);
  }

  const paginasVisibles = useMemo(() => {
    return Array.from({ length: totalPaginas }, (_, index) => index);
  }, [totalPaginas]);

  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-cyan-200 bg-white">
        <div className="mx-auto flex h-[58px] max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-extrabold text-[#087f99]">
            MEOWTFIT
          </Link>

          <nav className="hidden items-center gap-9 text-sm font-medium text-slate-600 md:flex">
            <Link
              to="/"
              className="border-b-2 border-[#087f99] pb-1 text-[#087f99]"
            >
              Tienda
            </Link>
            <a className="hover:text-[#087f99]" href="#">
              Colecciones
            </a>
            <a className="hover:text-[#087f99]" href="#">
              Ofertas
            </a>
          </nav>

          <div className="flex items-center gap-5 text-[#087f99]">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-[#bd2d73] text-white hover:bg-[#a82365]"
            >
              <ShoppingCart size={20} />
            </Button>

            <Search size={19} />
            <Link
              to={`/login`}
              className="text-sm font-medium leading-tight text-slate-800 hover:text-[#087f99]"
            >
              <UserRound size={19} />
            </Link>

          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[230px_1fr]">
        <aside>
          <p className="mb-7 text-sm font-medium text-slate-600">
            Filtrar por
          </p>

          <section className="mb-8">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Categorías
            </h3>

            <div className="space-y-3">
              {categorias.map((categoria) => (
                <label
                  key={categoria.idCategoria}
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={categoriaSeleccionada === categoria.idCategoria}
                    onChange={() => handleCategoria(categoria.idCategoria)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#087f99]"
                  />
                  {categoria.nombre}
                </label>
              ))}

              {categorias.length === 0 && (
                <p className="text-sm text-slate-400">
                  No hay categorías disponibles.
                </p>
              )}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Rango de precio
            </h3>

            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={precioMax}
              onChange={(event) =>
                handlePrecioMax(Number(event.target.value))
              }
              className="w-full accent-[#087f99]"
            />

            <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
              <span>S/ 0</span>
              <span>S/ {precioMax}</span>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Talla
            </h3>

            <div className="flex flex-wrap gap-2">
              {tallasDisponibles.map((talla) => (
                <button
                  key={talla}
                  type="button"
                  onClick={() => handleTalla(talla)}
                  className={`h-9 rounded-lg border px-3 text-sm transition ${tallaSeleccionada === talla
                      ? "border-[#087f99] bg-cyan-50 text-[#087f99]"
                      : "border-slate-300 bg-white text-slate-600 hover:border-[#087f99]"
                    }`}
                >
                  {talla}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">
                Catálogo
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {totalProductos} productos encontrados
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={busqueda}
                  onChange={(event) => {
                    setPagina(0);
                    setBusqueda(event.target.value);
                  }}
                  placeholder="Buscar producto"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#087f99] md:w-[230px]"
                />
              </div>

              <label className="flex items-center gap-3 text-xs font-bold text-slate-500">
                Ordenado por:
                <select
                  value={orden}
                  onChange={(event) => handleOrden(event.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#087f99] outline-none"
                >
                  <option value="precioBase,asc">Precio menor</option>
                  <option value="precioBase,desc">Precio mayor</option>
                  <option value="nombre,asc">Nombre</option>
                </select>
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {cargando ? (
            <div className="grid min-h-[420px] place-items-center rounded-2xl bg-white">
              <p className="text-sm font-medium text-slate-500">
                Cargando productos...
              </p>
            </div>
          ) : productos.length === 0 ? (
            <div className="grid min-h-[420px] place-items-center rounded-2xl bg-white">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-700">
                  No se encontraron productos
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Prueba cambiando los filtros seleccionados.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {productos.map((producto, index) => (
                <article key={producto.idProducto} className="group">
                  <div className="relative overflow-hidden rounded-xl bg-slate-100">
                    {index === 1 && pagina === 0 && (
                      <span className="absolute left-4 top-4 z-10 rounded-full bg-[#bd2d73] px-3 py-1 text-xs font-semibold text-white">
                        Bestseller
                      </span>
                    )}


                    <Link to={`/catalogDetail/${producto.idProducto}`}>
                      <img
                        src={normalizarImagen(producto.imagenUrl)}
                        alt={producto.nombre}
                        className="h-[380px] w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </Link>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <Link
                        to={`/catalogDetail/${producto.idProducto}`}
                        className="text-sm font-medium leading-tight text-slate-800 hover:text-[#087f99]"
                      >
                        {producto.nombre}
                      </Link>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {producto.categoria?.nombre ?? "Sin categoría"}
                      </p>
                    </div>

                    <p className="whitespace-nowrap text-xl font-extrabold text-[#bd2d73]">
                      {formatearPrecio(Number(producto.precioBase))}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-12 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              disabled={pagina === 0}
              onClick={() => setPagina((actual) => Math.max(actual - 1, 0))}
              className="h-10 w-10 rounded-lg"
            >
              <ChevronLeft size={17} />
            </Button>

            {paginasVisibles.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setPagina(page)}
                className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-bold transition ${pagina === page
                    ? "border-[#087f99] bg-[#087f99] text-white"
                    : "border-slate-200 bg-white text-slate-500 hover:border-[#087f99] hover:text-[#087f99]"
                  }`}
              >
                {page + 1}
              </button>
            ))}

            <Button
              variant="outline"
              size="icon"
              disabled={pagina >= totalPaginas - 1 || totalPaginas === 0}
              onClick={() =>
                setPagina((actual) =>
                  Math.min(actual + 1, totalPaginas - 1)
                )
              }
              className="h-10 w-10 rounded-lg"
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}