import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Filter, Headset, Palette, Pencil, Plus, Search, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  filtrarProductos,
  listarCategorias,
  eliminarVarianteProducto,
  type Producto,
  type Categoria,
  type EstadoProducto
} from "@/api/productosApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function normalizarImagen(url?: string | null): string {
  if (!url) return "https://placehold.co/80x100?text=Sin+imagen";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

function estadoClass(estado: EstadoProducto) {
  switch (estado) {
    case "ACTIVO":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "INACTIVO":
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [idCategoriaSeleccionada, setIdCategoriaSeleccionada] = useState<number | undefined>(undefined);

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);
  const [modalEliminar, setModalEliminar] = useState<{
    mostrar: boolean;
    tipo: "ADVERTENCIA" | "CONFIRMACION";
    razonAdvertencia: "STOCK_RESERVADO" | "UNICO_COLOR" | null;
    fila: any | null;
    stockReservadoTotal: number;
  }>({
    mostrar: false,
    tipo: "CONFIRMACION",
    razonAdvertencia: null,
    fila: null,
    stockReservadoTotal: 0
  });
  const productosXPagina = 5;

  useEffect(() => {
    listarCategorias()
      .then((data) => setCategorias(data))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  const fetchProductos = async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await filtrarProductos({
        nombre: busqueda || undefined,
        idCategoria: idCategoriaSeleccionada,
        page: paginaActual - 1,
        size: productosXPagina,
        sort: "idProducto,desc"
      });

      setProductos(respuesta.content);
      setTotalPaginas(respuesta.totalPages);
      setTotalElementos(respuesta.totalElements);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProductos();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busqueda, idCategoriaSeleccionada, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, idCategoriaSeleccionada]);

  const handleEliminarColor = (fila: any) => {
    setError(null);
    const coloresDelProducto = new Set((fila.variantes || []).map((v: any) => v.idColor).filter(Boolean));
    if (coloresDelProducto.size <= 1) {
      setModalEliminar({
        mostrar: true,
        tipo: "ADVERTENCIA",
        razonAdvertencia: "UNICO_COLOR",
        fila,
        stockReservadoTotal: 0
      });
      return;
    }

    const stockReservadoTotal = fila.tallasAsociadas.reduce((acc: number, v: any) => acc + (v.stockReservado || 0), 0);
    if (stockReservadoTotal > 0) {
      setModalEliminar({
        mostrar: true,
        tipo: "ADVERTENCIA",
        razonAdvertencia: "STOCK_RESERVADO",
        fila,
        stockReservadoTotal
      });
    } else {
      setModalEliminar({
        mostrar: true,
        tipo: "CONFIRMACION",
        razonAdvertencia: null,
        fila,
        stockReservadoTotal: 0
      });
    }
  };

  const ejecutarEliminacionColor = async () => {
    const { fila } = modalEliminar;
    if (!fila) return;

    setModalEliminar({ ...modalEliminar, mostrar: false });

    try {
      setCargando(true);
      await Promise.all(
        fila.tallasAsociadas.map((v: any) => eliminarVarianteProducto(v.idVariante))
      );
      await fetchProductos();
    } catch (err: any) {
      console.error("Error al eliminar variante:", err);
      setError(err.message || "Ocurrió un error al intentar eliminar la variante.");
    } finally {
      setCargando(false);
    }
  };

  const filasInventario = useMemo(() => {
    const filas: any[] = [];

    productos.forEach((prod) => {
      const variantesPorColor: { [color: string]: typeof prod.variantes } = {};

      if (prod.variantes && prod.variantes.length > 0) {
        prod.variantes.forEach((v) => {
          const colorKey = v.color?.nombre || "Único";
          if (!variantesPorColor[colorKey]) {
            variantesPorColor[colorKey] = [];
          }
          variantesPorColor[colorKey]!.push(v);
        });
      } else {
        // Fallback por si un producto en BD fue creado sin variantes todavía
        variantesPorColor["Sin Variantes"] = [];
      }

      Object.entries(variantesPorColor).forEach(([color, listaVariantes]) => {
        const stockTotalColor = listaVariantes!.reduce((acc, v) => acc + v.stockDisponible, 0);
        const idColorFila = listaVariantes && listaVariantes.length > 0 ? listaVariantes[0].idColor : null;
        filas.push({
          ...prod,
          colorExclusivo: color,
          idColor: idColorFila,
          tallasAsociadas: listaVariantes,
          stockTotalColor,
        });
      });
    });

    return filas;
  }, [productos]);

  return (
    <section className="min-h-screen bg-[#f7f5f2] flex flex-col w-full">
      <header className="flex h-[72px] items-center justify-between border-b border-zinc-200 bg-white px-8">
        <div className="font-extrabold text-lg tracking-wider text-zinc-800">
          MEOWTFIT
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-zinc-500">
            <button className="hover:text-zinc-800 transition-colors">
              <Headset size={20} />
            </button>
            <button className="hover:text-zinc-800 transition-colors relative">
              <Bell size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-800 mb-1">
            Gestión de inventario
          </h1>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-zinc-100 gap-4">
            <h2 className="text-base font-bold text-zinc-800">
              Inventario de productos
            </h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <Input
                  type="text"
                  placeholder="Buscar por nombre de producto..."
                  className="pl-10 h-11 border-zinc-200 focus-visible:ring-[#087f99]"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              {/* BOTON DE FILTRAR*/}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 px-4 gap-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                    <Filter size={16} />
                    Filtrar
                    {idCategoriaSeleccionada && <span className="w-2 h-2 rounded-full bg-[#087f99]" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4" align="end">
                  <h4 className="font-semibold text-sm text-zinc-900 mb-3">Filtrar por Categoría</h4>
                  <div className="flex flex-col gap-1">
                    <button
                      className={`text-left px-2 py-1.5 text-xs rounded transition-colors ${!idCategoriaSeleccionada ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      onClick={() => setIdCategoriaSeleccionada(undefined)}
                    >
                      Todas las categorías
                    </button>
                    {categorias.map((cat) => (
                      <button
                        key={cat.idCategoria}
                        className={`text-left px-2 py-1.5 text-xs rounded transition-colors ${idCategoriaSeleccionada === cat.idCategoria ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}`}
                        onClick={() => setIdCategoriaSeleccionada(cat.idCategoria)}
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button asChild className="h-11 bg-[#087f99] hover:bg-[#066a80] text-white text-xs font-semibold shadow-none">
                <Link to="/admin/inventario/crear">
                  <Plus size={14} className="mr-1" />
                  NUEVO PRODUCTO
                </Link>
              </Button>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Imagen</th>
                  <th className="px-6 py-4">Producto / Categoría</th>
                  <th className="px-6 py-4">Color</th>
                  <th className="px-6 py-4">Tallas & Stock Disponible</th>
                  <th className="px-6 py-4">Precio Base</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm text-zinc-600">
                {cargando ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                      Cargando inventario desde el servidor...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-rose-500 font-medium">
                      {error}
                    </td>
                  </tr>
                ) : filasInventario.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                      No se encontraron productos registrados en este momento.
                    </td>
                  </tr>
                ) : (
                  filasInventario.map((fila, index) => (
                    <tr key={`${fila.idProducto}-${fila.colorExclusivo}-${index}`} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={normalizarImagen(fila.imagenUrl)}
                          alt={fila.nombre}
                          className="w-11 h-14 object-cover rounded-md bg-zinc-100 border border-zinc-100 shadow-sm"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{fila.nombre}</div>
                        <div className="text-xs text-[#087f99] font-medium mt-0.5">
                          {fila.categoria?.nombre || "Sin Categoría"}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-medium text-zinc-700">
                        <div className="flex items-center gap-2">
                          {fila.tallasAsociadas?.[0]?.color?.hexadecimal && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-zinc-300 shadow-sm"
                              style={{ backgroundColor: fila.tallasAsociadas[0].color.hexadecimal }}
                            />
                          )}
                          <span>{fila.colorExclusivo}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {fila.tallasAsociadas.map((t: any) => (
                            <div
                              key={t.idVariante}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-xs shadow-sm"
                            >
                              <span className="font-bold text-zinc-700 uppercase">{t.talla || 'U'}:</span>
                              <span className={`font-semibold ${t.stockDisponible <= 5 ? 'text-amber-600' : 'text-[#087f99]'}`}>
                                {t.stockDisponible} unds
                              </span>
                            </div>
                          ))}
                          {fila.tallasAsociadas.length === 0 && (
                            <span className="text-xs text-zinc-400 italic">Sin existencias</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Total en este color: <span className="font-semibold text-zinc-600">{fila.stockTotalColor}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900">
                        S/ {Number(fila.precioBase).toFixed(2)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${estadoClass(fila.estado)}`}>
                          {fila.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-400">
                        <div className="flex items-center justify-end gap-3">
                          <button className="hover:text-[#087f99] transition-colors" title="Editar producto">
                            <Link to={`/admin/inventario/${fila.idProducto}/editar/${fila.idColor}`} className="flex items-center gap-1 text-zinc-600 hover:text-[#087f99] transition-colors">
                              <Pencil size={18} />
                            </Link>
                          </button>
                          <button className="hover:text-[#087f99] transition-colors" title="Crear variantes">
                            <Link to={`/admin/inventario/${fila.idProducto}/agregarVariante`} className="flex items-center gap-1 text-zinc-600 hover:text-[#087f99] transition-colors">
                              <Palette size={18} />
                            </Link>
                          </button>
                          <button
                            onClick={() => handleEliminarColor(fila)}
                            className="hover:text-[#087f99] transition-colors"
                            title="Eliminar color y tallas"
                          >
                            <Trash2 size={18} className="text-zinc-600 hover:text-[#087f99] transition-colors" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer  */}
          <div className="flex items-center justify-between border-t border-zinc-100 p-6 bg-zinc-50/30">
            <p className="text-sm font-medium text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-800">{filasInventario.length}</span> variantes de color
              {" "}(Productos del <span className="font-semibold text-zinc-800">
                {totalElementos === 0 ? 0 : (paginaActual - 1) * productosXPagina + 1}
              </span> al <span className="font-semibold text-zinc-800">
                {Math.min(paginaActual * productosXPagina, totalElementos)}
              </span> de <span className="font-semibold text-zinc-800">{totalElementos}</span>)
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-zinc-200 text-zinc-500"
                disabled={paginaActual === 1 || totalElementos === 0}
                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-xs font-semibold text-zinc-600Este">
                Pág. {paginaActual} de {totalPaginas === 0 ? 1 : totalPaginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-zinc-200 text-zinc-500"
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de eliminación*/}
      {modalEliminar.mostrar && modalEliminar.fila && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl mx-4 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-full ${modalEliminar.tipo === "ADVERTENCIA" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                <AlertCircle size={24} />
              </span>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {modalEliminar.tipo === "ADVERTENCIA" ? "Acción Bloqueada" : "Confirmar Eliminación"}
                </h3>
              </div>
            </div>

            <div className="text-sm text-zinc-600 leading-relaxed py-2">
              {modalEliminar.tipo === "ADVERTENCIA" ? (
                modalEliminar.razonAdvertencia === "UNICO_COLOR" ? (
                  <span>
                    No se puede eliminar la variante de color{" "}
                    <strong className="text-zinc-800 capitalize">"{modalEliminar.fila.colorExclusivo}"</strong>{" "}
                    del producto <strong className="text-zinc-800">"{modalEliminar.fila.nombre}"</strong> porque es el{" "}
                    <strong className="text-rose-600">único color registrado</strong> para este producto. Debe existir al menos una variante de color activa.
                  </span>
                ) : (
                  <span>
                    No se puede eliminar la variante de color{" "}
                    <strong className="text-zinc-800 capitalize">"{modalEliminar.fila.colorExclusivo}"</strong>{" "}
                    del producto <strong className="text-zinc-800">"{modalEliminar.fila.nombre}"</strong> porque tiene{" "}
                    <strong className="text-rose-600">{modalEliminar.stockReservadoTotal} unidades</strong> en stock reservado.
                  </span>
                )
              ) : (
                <span>
                  ¿Estás seguro de que deseas eliminar todas las variantes y tallas del color{" "}
                  <strong className="text-zinc-800 capitalize">"{modalEliminar.fila.colorExclusivo}"</strong>{" "}
                  del producto <strong className="text-zinc-800">"{modalEliminar.fila.nombre}"</strong>?
                  <br />
                  <span className="text-xs text-rose-500 font-semibold mt-2 block">
                    * Esta acción eliminará todas sus tallas asociadas.
                  </span>
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
              {modalEliminar.tipo === "ADVERTENCIA" ? (
                <Button
                  onClick={() => setModalEliminar({ ...modalEliminar, mostrar: false })}
                  className="bg-[#087f99] hover:bg-[#066a80] text-white px-5 font-semibold"
                >
                  Entendido
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setModalEliminar({ ...modalEliminar, mostrar: false })}
                    className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={ejecutarEliminacionColor}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 font-semibold"
                  >
                    Eliminar Fila
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}