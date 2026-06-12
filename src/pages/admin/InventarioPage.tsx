import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Eye, Filter, Headset, Palette, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  filtrarProductos,
  listarCategorias,
  type Producto,
  type Categoria,
  type EstadoProducto
} from "@/api/productosApi";

// Función auxiliar para los colores de las etiquetas de estado
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
  // Estados para Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [idCategoriaSeleccionada, setIdCategoriaSeleccionada] = useState<number | undefined>(undefined);
  // Estados de Paginación nativa del Backend (Spring Boot usa páginas base 0)
  const [paginaActual, setPaginaActual] = useState(1); // Para la UI (1, 2, 3...)
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);
  const productosXPagina = 5;

  //Cargar categorias
  useEffect(() => {
    listarCategorias()
      .then((data) => setCategorias(data))
      .catch((err) => console.error("Error al cargar categorías:", err));
  }, []);

  // 2. Cargar productos de forma dinámica desde Spring Boot
  useEffect(() => {
    const fetchProductos = async () => {
      setCargando(true);
      setError(null);
      try {
        const respuesta = await filtrarProductos({
          nombre: busqueda || undefined,
          idCategoria: idCategoriaSeleccionada,
          page: paginaActual - 1, // Restamos 1 porque Spring Boot arranca en página 0
          size: productosXPagina,
          sort: "idProducto,desc" // Muestra los últimos creados primero
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

    const delayDebounce = setTimeout(() => {
      fetchProductos();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [busqueda, idCategoriaSeleccionada, paginaActual]);

  // Si cambia el filtro o la búsqueda, reiniciamos siempre a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, idCategoriaSeleccionada]);

  // Transforma la lista de productos en líneas de inventario por color para la tabla
  const filasInventario = useMemo(() => {
    const filas: any[] = [];

    productos.forEach((prod) => {
      // Agrupamos las variantes de este producto por su nombre de color
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

      // Creamos una fila independiente en la tabla por cada combinación de color
      Object.entries(variantesPorColor).forEach(([color, listaVariantes]) => {
        const stockTotalColor = listaVariantes!.reduce((acc, v) => acc + v.stockDisponible, 0);
        const idColorFila = listaVariantes && listaVariantes.length > 0 ? listaVariantes[0].idColor : null;
        filas.push({
          ...prod,
          colorExclusivo: color,
          idColor: idColorFila,
          tallasAsociadas: listaVariantes, // Arreglo de variantes con sus tallas y stocks
          stockTotalColor,
        });
      });
    });

    return filas;
  }, [productos]);

  return (
    <section className="min-h-screen bg-[#f7f5f2] flex flex-col w-full">

      {/* Topbar superior */}
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

      {/* Contenido principal */}
      <main className="flex-1 p-8">

        {/* Cabecera de página */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-800 mb-1">
            Gestión de inventario
          </h1>
        </div>

        {/* Tarjeta de la Tabla */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">

          {/* Opciones de la tabla */}
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
                    Filtros
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
                      {/* Imagen */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={fila.imagenUrl}
                          alt={fila.nombre}
                          className="w-11 h-14 object-cover rounded-md bg-zinc-100 border border-zinc-100 shadow-sm"
                        />
                      </td>

                      {/* Producto y Categoría debajo */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">{fila.nombre}</div>
                        <div className="text-xs text-[#087f99] font-medium mt-0.5">
                          {fila.categoria?.nombre || "Sin Categoría"}
                        </div>
                      </td>

                      {/* Color */}
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

                      {/* Tallas y Desglose de Stock */}
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

                      {/* Precio Base */}
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900">
                        S/ {Number(fila.precioBase).toFixed(2)}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${estadoClass(fila.estado)}`}>
                          {fila.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-400">
                        <div className="flex items-center justify-end gap-3">
                          <button className="hover:text-zinc-600 transition-colors" title="Ver detalles">
                            <Eye size={18} />
                          </button>
                          <button className="hover:text-[#087f99] transition-colors" title="Editar producto">
                            <Link to={`/admin/inventario/${fila.idProducto}/editar/${fila.idColor}`} className="flex items-center gap-1 text-zinc-600 hover:text-[#087f99] transition-colors">
                              <Pencil size={18} />
                            </Link>
                          </button>
                          <button className="hover:text-[#087f99] transition-colors" title="Crear variantes">
                            <Palette size={18} />
                          </button>
                          <button className="hover:text-rose-600 transition-colors" title="Eliminar">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Paginación */}
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
              {/* Botón ATRÁS */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-zinc-200 text-zinc-500"
                disabled={paginaActual === 1 || totalElementos === 0}
                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
              >
                <ChevronLeft size={16} />
              </Button>

              {/* Indicador */}
              <span className="text-xs font-semibold text-zinc-600Este">
                Pág. {paginaActual} de {totalPaginas === 0 ? 1 : totalPaginas}
              </span>

              {/* Botón SIGUIENTE */}
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
    </section>
  );
}