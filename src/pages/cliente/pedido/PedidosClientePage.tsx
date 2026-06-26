import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  ShoppingBag, 
  Search,
  Filter,
  X,
  Tag
} from "lucide-react";
import { filtrarMisPedidosApi, type Pedido, type EstadoPedido, PageResponse } from "@/api/pedidosApi";

const CONFIG_ESTADOS: Record<EstadoPedido, { label: string; classes: string }> = {
  REGISTRADO: { label: "Registrado", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  CONFIRMADO: { label: "Confirmado", classes: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  EN_PROCESO: { label: "En Proceso", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  ENVIADO: { label: "Enviado", classes: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  ENTREGADO: { label: "Entregado", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELADO: { label: "Cancelado", classes: "bg-gray-50 text-gray-600 border-gray-200" },
  PAGO_RECHAZADO: { label: "Pago Rechazado", classes: "bg-red-50 text-red-700 border-red-200" },
};

export default function PedidosClientePage() {
  const navigate = useNavigate();
  
  // Estados de control de API
  const [pedidoPage, setPedidoPage] = useState<PageResponse<Pedido> | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedido | "">("");
  const [paginaActual, setPaginaActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FEATURE: Estados de búsqueda y filtrado avanzado en Frontend
  const [busquedaCodigo, setBusquedaCodigo] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // FEATURE: Estado para seleccionar un pedido específico (Vista pormenorizada)
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null);

  const ITEMS_POR_PAGINA = 6; 

  // MEJORA: Cerrar el detalle de la operación al escribir o cambiar filtros de búsqueda en Frontend
  useEffect(() => {
    setPedidoSeleccionado(null);
  }, [busquedaCodigo, fechaDesde, fechaHasta]);

  useEffect(() => {
    async function cargarHistorialPedidos() {
      try {
        setCargando(true);
        setError(null);
        const data = await filtrarMisPedidosApi({
          estado: estadoFiltro,
          page: paginaActual,
          size: ITEMS_POR_PAGINA,
        });
        setPedidoPage(data);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al cargar tu historial de pedidos.");
      } finally {
        setCargando(false);
      }
    }
    cargarHistorialPedidos();
  }, [estadoFiltro, paginaActual]);

  function handleCambioFiltro(nuevoEstado: EstadoPedido | "") {
    setEstadoFiltro(nuevoEstado);
    setPaginaActual(0);
    setPedidoSeleccionado(null);
  }

  // FEATURE: Motor de filtrado y segmentación en Frontend en tiempo real
  const pedidosFiltrados = useMemo(() => {
    if (!pedidoPage?.content) return [];
    
    return pedidoPage.content.filter((pedido) => {
      if (busquedaCodigo.trim()) {
        // CORRECCIÓN: Removemos de forma insensible a mayúsculas/minúsculas el prefijo o cualquier carácter que no sea un número.
        const query = busquedaCodigo.replace(/[^0-9]/g, "");
        
        // Si el usuario escribió cosas como "#MEOW-" pero aún no pone el número, no filtramos nada todavía para evitar que la lista quede en blanco abruptamente.
        if (query && !pedido.idPedido.toString().includes(query)) {
          return false;
        }
      }

      if (fechaDesde) {
        const fechaPedido = new Date(pedido.fechaHoraRegistro);
        const inicio = new Date(fechaDesde + "T00:00:00");
        if (fechaPedido < inicio) return false;
      }
      if (fechaHasta) {
        const fechaPedido = new Date(pedido.fechaHoraRegistro);
        const fin = new Date(fechaHasta + "T23:59:59");
        if (fechaPedido > fin) return false;
      }

      return true;
    });
  }, [pedidoPage?.content, busquedaCodigo, fechaDesde, fechaHasta]);

  function formatearFecha(fechaStr: string) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatearFechaConHora(fechaStr: string) {
    const fecha = new Date(fechaStr);
    
    const fechaFormateada = fecha.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const horaFormateada = fecha.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${fechaFormateada} a las ${horaFormateada}`;
  }

  function limpiarFiltrosAvanzados() {
    setBusquedaCodigo("");
    setFechaDesde("");
    setFechaHasta("");
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        
        {/* ENCABEZADO DE LA PÁGINA */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Historial de Pedidos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Consulta el estado actual, busca y obtén el desglose detallado de tus pedidos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 h-10 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Continuar Comprando
          </button>
        </div>

        {/* FEATURE: MOTOR DE BÚSQUEDA Y FILTROS AVANZADOS */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Filter size={14} className="text-[#0a7c98]" />
            Buscador y Segmentación de pedidos
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por Código de Pedido..."
                value={busquedaCodigo}
                onChange={(e) => setBusquedaCodigo(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[#0a7c98] focus:outline-none focus:ring-1 focus:ring-[#0a7c98]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-[#0a7c98] focus:outline-none focus:ring-1 focus:ring-[#0a7c98]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 focus:border-[#0a7c98] focus:outline-none focus:ring-1 focus:ring-[#0a7c98]"
              />
            </div>
          </div>
          {(busquedaCodigo || fechaDesde || fechaHasta) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={limpiarFiltrosAvanzados}
                className="inline-flex items-center text-xs font-semibold text-[#b43b6c] hover:underline"
              >
                <X size={12} className="mr-1" /> Limpiar filtros avanzados
              </button>
            </div>
          )}
        </div>

        {/* SELECTOR / TABS DE FILTRADO LOGÍSTICO */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          <button
            onClick={() => handleCambioFiltro("")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all border ${
              estadoFiltro === ""
                ? "bg-[#0a7c98] text-white border-[#0a7c98]"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            Todos
          </button>
          {(Object.keys(CONFIG_ESTADOS) as EstadoPedido[]).map((estado) => (
            <button
              key={estado}
              onClick={() => handleCambioFiltro(estado)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all border ${
                estadoFiltro === estado
                  ? "bg-[#0a7c98] text-white border-[#0a7c98]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {CONFIG_ESTADOS[estado].label}
            </button>
          ))}
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
          
          {/* COLUMNA DE LISTADO FIJA */}
          <div className="lg:col-span-2">
            {cargando ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-12">
                <Loader2 className="animate-spin text-[#0a7c98]" size={36} />
                <p className="mt-4 text-sm font-medium text-gray-500">Buscando en tus registros...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center text-red-600">{error}</div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                <ShoppingBag className="text-gray-300" size={48} />
                <h3 className="mt-4 text-base font-semibold text-gray-900">No se encontraron registros</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-xs">
                  Intenta modificando los criterios de búsqueda.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {pedidosFiltrados.map((pedido) => {
                    const esSeleccionado = pedidoSeleccionado?.idPedido === pedido.idPedido;
                    return (
                      <div 
                        key={pedido.idPedido}
                        onClick={() => setPedidoSeleccionado(pedido)}
                        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all cursor-pointer hover:shadow-md flex flex-col justify-between ${
                          esSeleccionado ? "border-2 border-[#0a7c98] ring-1 ring-[#0a7c98]" : "border-gray-200"
                        }`}
                      >
                        <div className="bg-gray-50/60 border-b border-gray-100 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Código</p>
                              <p className="text-sm font-bold text-[#0a7c98]">#MEOW-{pedido.idPedido}</p>
                            </div>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                              CONFIG_ESTADOS[pedido.estado]?.classes || "bg-gray-100 text-gray-700"
                            }`}>
                              {CONFIG_ESTADOS[pedido.estado]?.label || pedido.estado}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100/70">
                            <div>
                              <p className="text-[10px] uppercase text-gray-400 font-medium">Fecha de Compra</p>
                              <p className="font-medium text-gray-600">{formatearFecha(pedido.fechaHoraRegistro)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-gray-400 font-medium">Monto Total</p>
                              <p className="font-bold text-gray-900">S/ {pedido.montoTotal.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-white text-xs text-gray-500 flex-1 flex flex-col justify-center">
                          <p className="line-clamp-2">
                            <span className="font-semibold text-gray-400">Items:</span>{" "}
                            <span className="font-medium text-gray-700">
                              {pedido.lineas.map(l => `${l.nombreProducto} (x${l.cantidad})`).join(", ")}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINACIÓN */}
                {pedidoPage && pedidoPage.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500">
                      Página <strong>{pedidoPage.number + 1}</strong> de <strong>{pedidoPage.totalPages}</strong>
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pedidoPage.first}
                        onClick={(e) => { e.stopPropagation(); setPaginaActual((prev) => prev - 1); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={pedidoPage.last}
                        onClick={(e) => { e.stopPropagation(); setPaginaActual((prev) => prev - 1); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COLUMNA DERECHA - VISTA DETALLADA */}
          <div className="lg:col-span-1 sticky top-4">
            {pedidoSeleccionado ? (
              <div className="rounded-2xl border-2 border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="bg-gray-900 text-white px-4 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-wide">Detalle de Operación</h3>
                    <p className="text-[11px] text-gray-300">#MEOW-{pedidoSeleccionado.idPedido}</p>
                  </div>
                  <button 
                    onClick={() => setPedidoSeleccionado(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1 text-gray-600">
                    <p className="flex justify-between gap-4">
                      <span>Registrado:</span> 
                      <strong className="text-gray-800 text-right">
                        {formatearFechaConHora(pedidoSeleccionado.fechaHoraRegistro)}
                      </strong>
                    </p>
                    <p className="flex justify-between"><span>Método Pago:</span> <strong className="text-gray-800 uppercase">{pedidoSeleccionado.metodoPago}</strong></p>
                    <p className="flex justify-between">
                      <span>Estado Logístico:</span> 
                      <span className={`font-bold ${
                        pedidoSeleccionado.estado === "PAGO_RECHAZADO" ? "text-red-600" : "text-[#0a7c98]"
                      }`}>
                        {CONFIG_ESTADOS[pedidoSeleccionado.estado]?.label}
                      </span>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Artículos Adquiridos</h4>
                    <div className="space-y-3 divide-y divide-gray-100">
                      {pedidoSeleccionado.lineas.map((linea) => (
                        <div key={linea.idLineaPedido} className="flex gap-3 pt-2 first:pt-0">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded border border-gray-200">
                            {linea.variante?.imagenUrl ? (
                              <img src={linea.variante.imagenUrl} alt={linea.nombreProducto} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[9px] text-gray-400">Meow</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-gray-800 truncate">{linea.nombreProducto}</h5>
                            <p className="text-[11px] text-gray-500">
                              Talla: {linea.talla} {linea.color ? `| Color: ${linea.color}` : ""}
                            </p>
                            <p className="text-[11px] text-gray-400">Cant: {linea.cantidad} x S/ {linea.precioVenta.toFixed(2)}</p>
                          </div>
                          <div className="text-right text-xs font-bold text-gray-800">
                            S/ {linea.subtotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 space-y-1.5 text-xs">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Estructura de Precios</h4>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Neto (Sin IGV):</span>
                      <span>S/ {(pedidoSeleccionado.montoTotal / 1.18).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IGV (18% Aplicado):</span>
                      <span>S/ {(pedidoSeleccionado.montoTotal - (pedidoSeleccionado.montoTotal / 1.18)).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-emerald-600 font-medium bg-emerald-50/50 px-2 py-1 rounded">
                      <span className="flex items-center gap-1"><Tag size={12} /> Descuentos Aplicados:</span>
                      <span>- S/ {(pedidoSeleccionado.descuento || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-dashed border-gray-200 pt-2">
                      <span>
                        {["PAGO_RECHAZADO", "CANCELADO"].includes(pedidoSeleccionado.estado) 
                          ? "Monto de Operación:" 
                          : "Total Cancelado:"}
                      </span>
                      <span>S/ {pedidoSeleccionado.montoTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {pedidoSeleccionado.estado === "REGISTRADO" && (
                    <button
                      type="button"
                      onClick={() => navigate(`/pedidos/validarPago/${pedidoSeleccionado.idPedido}`)}
                      className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-[#b43b6c] h-9 text-xs font-bold tracking-wide text-white transition-colors hover:bg-[#962f58]"
                    >
                      Adjuntar Comprobante de Pago
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex h-[350px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-400">
                <ShoppingBag size={32} className="mb-2 text-gray-300" />
                <p className="text-xs font-medium">Selecciona un pedido para ver el detalle pormenorizado.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}