import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Headset, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    listarTodosPedidos,
    obtenerComprobantePorPedido,
    type Pedido,
    type EstadoPedido,
} from "@/api/pedidosApi";

function formatearFecha(fecha: string): string {
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = String(d.getFullYear()).slice(2);
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

function formatearPrecio(precio: number): string {
    return `S/ ${precio.toFixed(2)}`;
}

function codigoPedido(pedido: Pedido): string {
    const num = pedido.idPedido;
    return `F${String(num).padStart(3, "0")}`;
}

function estadoClass(estado: EstadoPedido) {
    switch (estado) {
        case "REGISTRADO":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "CONFIRMADO":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "EN_PROCESO":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "ENVIADO":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "ENTREGADO":
            return "bg-green-50 text-green-700 border-green-200";
        case "CANCELADO":
        case "PAGO_RECHAZADO":
            return "bg-rose-50 text-rose-700 border-rose-200";
        default:
            return "bg-zinc-50 text-zinc-700 border-zinc-200";
    }
}

export default function PedidosGestionPage() {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [busqueda, setBusqueda] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [orden, setOrden] = useState<"RECIENTES" | "ANTIGUOS">("RECIENTES");
    const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedido | "TODOS">("REGISTRADO");

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const pedidosXPagina = 6;

    const fetchPedidos = async () => {
        try {
            setCargando(true);
            setError(null);
            const data = await listarTodosPedidos();

            const pedidosConComprobantes = await Promise.all(
                data.map(async (p) => {
                    const cp = await obtenerComprobantePorPedido(p.idPedido);
                    if (cp) {
                        return { ...p, tieneComprobante: true, archivoComprobante: cp.archivo };
                    }
                    return { ...p, tieneComprobante: false, archivoComprobante: null };
                })
            );

            setPedidos(pedidosConComprobantes);
        } catch (err: any) {
            setError(err.message || "Error al cargar pedidos desde el servidor.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        fetchPedidos();
    }, []);

    // Reiniciar paginación al filtrar
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda, fechaDesde, fechaHasta, orden, estadoFiltro]);

    // Aplicar filtros en memoria (Client-side)
    const pedidosFiltrados = useMemo(() => {
        let result = [...pedidos];

        // Filtro por Estado
        if (estadoFiltro !== "TODOS") {
            result = result.filter((p) => p.estado === estadoFiltro);
        }

        // Filtro por Búsqueda (Código de pedido o Cliente)
        if (busqueda.trim() !== "") {
            const q = busqueda.toLowerCase().trim();
            result = result.filter(
                (p) =>
                    p.nombreUsuario?.toLowerCase().includes(q) ||
                    String(p.idPedido).includes(q) ||
                    codigoPedido(p).toLowerCase().includes(q)
            );
        }

        // Filtro por Fecha Desde
        if (fechaDesde) {
            const desdeDate = new Date(fechaDesde);
            desdeDate.setHours(0, 0, 0, 0);
            result = result.filter((p) => new Date(p.fechaHoraRegistro) >= desdeDate);
        }

        // Filtro por Fecha Hasta
        if (fechaHasta) {
            const hastaDate = new Date(fechaHasta);
            hastaDate.setHours(23, 59, 59, 999);
            result = result.filter((p) => new Date(p.fechaHoraRegistro) <= hastaDate);
        }

        // Ordenamiento por Fecha
        result.sort((a, b) => {
            const timeA = new Date(a.fechaHoraRegistro).getTime();
            const timeB = new Date(b.fechaHoraRegistro).getTime();
            return orden === "RECIENTES" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [pedidos, estadoFiltro, busqueda, fechaDesde, fechaHasta, orden]);

    // Paginación
    const totalElementos = pedidosFiltrados.length;
    const totalPaginas = Math.ceil(totalElementos / pedidosXPagina);
    const indexUltimoItem = paginaActual * pedidosXPagina;
    const indexPrimerItem = indexUltimoItem - pedidosXPagina;
    const pedidosPaginados = useMemo(() => {
        return pedidosFiltrados.slice(indexPrimerItem, indexUltimoItem);
    }, [pedidosFiltrados, indexPrimerItem, indexUltimoItem]);

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
                        Gestión de pedidos
                    </h1>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                    {/* Cabecera del Panel con Filtros */}
                    <div className="p-6 border-b border-zinc-100 space-y-4">
                        <h2 className="text-base font-bold text-zinc-800">
                            Listado de Pedidos
                        </h2>

                        <div className="flex flex-wrap items-center gap-4">
                            {/* Buscador */}
                            <div className="relative w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <Input
                                    type="text"
                                    placeholder="Buscar por código o cliente..."
                                    className="pl-10 h-11 border-zinc-200 focus-visible:ring-[#087f99]"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>

                            {/* Rango de Fechas */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-500">Desde:</span>
                                <Input
                                    type="date"
                                    className="h-11 border-zinc-200 focus-visible:ring-[#087f99] w-[140px] text-xs font-medium"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                                <span className="text-xs font-semibold text-zinc-500">Hasta:</span>
                                <Input
                                    type="date"
                                    className="h-11 border-zinc-200 focus-visible:ring-[#087f99] w-[140px] text-xs font-medium"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                            </div>

                            {/* Ordenamiento */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-500">Orden:</span>
                                <select
                                    className="h-11 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#087f99] cursor-pointer"
                                    value={orden}
                                    onChange={(e) => setOrden(e.target.value as "RECIENTES" | "ANTIGUOS")}
                                >
                                    <option value="RECIENTES">Más recientes primero</option>
                                    <option value="ANTIGUOS">Más antiguos primero</option>
                                </select>
                            </div>

                            {/* Estado */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-zinc-500">Estado:</span>
                                <select
                                    className="h-11 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#087f99] cursor-pointer"
                                    value={estadoFiltro}
                                    onChange={(e) => setEstadoFiltro(e.target.value as EstadoPedido | "TODOS")}
                                >
                                    <option value="TODOS">Todos los estados</option>
                                    <option value="REGISTRADO">Registrado</option>
                                    <option value="CONFIRMADO">Confirmado</option>
                                    <option value="EN_PROCESO">En proceso</option>
                                    <option value="ENVIADO">Enviado</option>
                                    <option value="ENTREGADO">Entregado</option>
                                    <option value="CANCELADO">Cancelado</option>
                                    <option value="PAGO_RECHAZADO">Pago rechazado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Código</th>
                                    <th className="px-6 py-4">Fecha de Registro</th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Monto Total</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">Validación Pago</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50 text-sm text-zinc-600">
                                {cargando ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                                            Cargando pedidos desde el servidor...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-rose-500 font-medium">
                                            {error}
                                        </td>
                                    </tr>
                                ) : pedidosPaginados.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                                            No se encontraron pedidos con los filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    pedidosPaginados.map((pedido) => {
                                        const esRegistrado = pedido.estado === "REGISTRADO";
                                        const tieneComprobante = pedido.tieneComprobante === true;

                                        return (
                                            <tr key={pedido.idPedido} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-900">
                                                    {codigoPedido(pedido)}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {formatearFecha(pedido.fechaHoraRegistro)}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900">
                                                    {pedido.nombreUsuario || "Cliente Desconocido"}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap font-bold text-[#087f99]">
                                                    {formatearPrecio(Number(pedido.montoTotal))}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${estadoClass(pedido.estado)}`}>
                                                        {pedido.estado}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {esRegistrado && tieneComprobante ? (
                                                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                                                            Pago pendiente de validación
                                                        </span>
                                                    ) : pedido.estado === "PAGO_RECHAZADO" ? (
                                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200">
                                                            Comprobante rechazado
                                                        </span>
                                                    ) : tieneComprobante ? (
                                                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">
                                                            Comprobante validado
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">
                                                            Sin comprobante
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <Button asChild variant="outline" className="h-9 px-3 gap-1.5 border-zinc-200 text-[#087f99] hover:bg-cyan-50 hover:text-[#066a80] shadow-none">
                                                        <Link to={`/admin/pedidos/validarPago/${pedido.idPedido}`}>
                                                            <Eye size={16} />
                                                            Ver detalle
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer de Paginación */}
                    <div className="flex items-center justify-between border-t border-zinc-100 p-6 bg-zinc-50/30">
                        <p className="text-sm font-medium text-zinc-500">
                            Mostrando <span className="font-semibold text-zinc-800">{totalElementos === 0 ? 0 : indexPrimerItem + 1}</span> -{" "}
                            <span className="font-semibold text-zinc-800">{Math.min(indexUltimoItem, totalElementos)}</span> de{" "}
                            <span className="font-semibold text-zinc-800">{totalElementos}</span> pedidos
                        </p>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-zinc-200 text-zinc-500"
                                disabled={paginaActual === 1 || totalElementos === 0}
                                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-xs font-semibold text-zinc-600">
                                Pág. {paginaActual} de {totalPaginas === 0 ? 1 : totalPaginas}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full border-zinc-200 text-zinc-500"
                                disabled={paginaActual === totalPaginas || totalPaginas === 0}
                                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
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