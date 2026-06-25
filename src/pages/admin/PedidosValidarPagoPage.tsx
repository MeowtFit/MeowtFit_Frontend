import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bell, Headset, CheckCircle, AlertCircle, Calendar, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    obtenerPedidoPorId,
    verificarPago,
    obtenerComprobantePorPedido,
    descargarComprobanteArchivo,
    cambiarEstadoPedido,
    type Pedido,
    type EstadoPedido,
} from "@/api/pedidosApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const IMAGEN_FALLBACK = "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=200&auto=format&fit=crop";

function normalizarImagen(url?: string | null): string {
    if (!url) return IMAGEN_FALLBACK;
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
    return url;
}

function formatearPrecio(precio: number): string {
    return `S/ ${precio.toFixed(2)}`;
}

function formatearFecha(fecha: string): string {
    if (!fecha) return "—";
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = String(d.getFullYear()).slice(2);
    const hora = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
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

export default function PedidosValidarPagoPage() {
    const { id } = useParams<{ id: string }>();

    const [pedido, setPedido] = useState<Pedido | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [verificando, setVerificando] = useState(false);
    const [errorAccion, setErrorAccion] = useState<string | null>(null);
    const [exitoAccion, setExitoAccion] = useState<string | null>(null);

    const [imagenComprobanteUrl, setImagenComprobanteUrl] = useState<string | null>(null);
    const [cargandoImagen, setCargandoImagen] = useState(false);
    const [errorImagen, setErrorImagen] = useState<string | null>(null);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [motivoRechazo, setMotivoRechazo] = useState("");
    const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

    const handleConfirmarPagoClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmarPagoAction = async () => {
        setShowConfirmModal(false);
        await handleValidarPago();
    };

    const handleRechazarPagoClick = () => {
        setMotivoRechazo("");
        setErrorRechazo(null);
        setShowRejectModal(true);
    };

    const handleRechazarPagoAction = async () => {
        if (!pedido) return;
        if (!motivoRechazo.trim()) {
            setErrorRechazo("Por favor ingrese un motivo de rechazo.");
            return;
        }

        try {
            setVerificando(true);
            setErrorAccion(null);
            setExitoAccion(null);

            await cambiarEstadoPedido(pedido.idPedido, "PAGO_RECHAZADO", motivoRechazo);

            console.log(`Pedido #${pedido.idPedido} rechazado por: ${motivoRechazo}`);

            setExitoAccion("¡Pago rechazado con éxito!");
            setShowRejectModal(false);

            setPedido((prev) =>
                prev ? { ...prev, estado: "PAGO_RECHAZADO" as EstadoPedido } : null
            );
        } catch (err: any) {
            setErrorAccion(err.message || "Ocurrió un error al rechazar el pago.");
        } finally {
            setVerificando(false);
        }
    };

    const cargarImagenComprobante = async (idComprobante: number) => {
        try {
            setCargandoImagen(true);
            setErrorImagen(null);
            const blob = await descargarComprobanteArchivo(idComprobante);
            const url = URL.createObjectURL(blob);
            setImagenComprobanteUrl(url);
        } catch (err: any) {
            setErrorImagen(err.message || "Error al cargar la imagen.");
        } finally {
            setCargandoImagen(false);
        }
    };

    useEffect(() => {
        return () => {
            if (imagenComprobanteUrl) {
                URL.revokeObjectURL(imagenComprobanteUrl);
            }
        };
    }, [imagenComprobanteUrl]);

    const cargarDetallePedido = async () => {
        if (!id) return;
        try {
            setCargando(true);
            setError(null);

            const [pedidoData, cpData] = await Promise.all([
                obtenerPedidoPorId(Number(id)),
                obtenerComprobantePorPedido(Number(id))
            ]);

            if (pedidoData) {
                if (cpData) {
                    pedidoData.tieneComprobante = true;
                    pedidoData.archivoComprobante = cpData.archivo;
                    pedidoData.idFactura = cpData.idComprobante;

                    void cargarImagenComprobante(cpData.idComprobante);
                } else {
                    pedidoData.tieneComprobante = false;
                    pedidoData.archivoComprobante = null;
                    pedidoData.idFactura = null;
                }
            }

            setPedido(pedidoData);
        } catch (err: any) {
            setError(err.message || "Error al cargar la información del pedido.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDetallePedido();
    }, [id]);

    const handleValidarPago = async () => {
        if (!pedido) return;
        try {
            setVerificando(true);
            setErrorAccion(null);
            setExitoAccion(null);
            await verificarPago(pedido.idPedido);
            setExitoAccion("¡Pago verificado y confirmado con éxito!");

            setPedido((prev) =>
                prev ? { ...prev, estado: "CONFIRMADO" as EstadoPedido } : null
            );
        } catch (err: any) {
            setErrorAccion(err.message || "Ocurrió un error al verificar el pago.");
        } finally {
            setVerificando(false);
        }
    };

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

            <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
                {/* Enlace para regresar */}
                <div className="mb-6">
                    <Link
                        to="/admin/pedidos"
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#087f99] hover:underline"
                    >
                        <ArrowLeft size={16} />
                        Volver a pedidos
                    </Link>
                </div>

                {cargando ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                        <p className="text-sm font-medium text-zinc-500">Cargando detalles del pedido...</p>
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
                        <AlertCircle className="mx-auto text-rose-500 mb-3" size={32} />
                        <h3 className="text-base font-bold text-rose-800 mb-1">Error al cargar pedido</h3>
                        <p className="text-sm text-rose-600 mb-4">{error}</p>
                        <Button asChild className="bg-[#087f99] hover:bg-[#066a80] text-white">
                            <Link to="/admin/pedidos">Ir al listado</Link>
                        </Button>
                    </div>
                ) : !pedido ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                        <p className="text-sm font-medium text-zinc-500">No se encontró el pedido solicitado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
                        {/* Detalle del Pedido e Ítems */}
                        <div className="space-y-6">
                            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-zinc-900">
                                            Pedido {codigoPedido(pedido)}
                                        </h2>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            ID Interno: #{pedido.idPedido}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${estadoClass(pedido.estado)}`}>
                                        {pedido.estado}
                                    </span>
                                </div>

                                {/* Grid con info del Pedido */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-600">
                                    <div className="flex items-center gap-2.5">
                                        <Calendar size={16} className="text-zinc-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-zinc-400 font-medium">Fecha de Registro</p>
                                            <p className="font-semibold text-zinc-800">{formatearFecha(pedido.fechaHoraRegistro)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <User size={16} className="text-zinc-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-zinc-400 font-medium">Comprador / Cliente</p>
                                            <p className="font-semibold text-zinc-800">{pedido.nombreUsuario || "—"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <CreditCard size={16} className="text-zinc-400 shrink-0" />
                                        <div>
                                            <p className="text-xs text-zinc-400 font-medium">Método de Pago</p>
                                            <p className="font-semibold text-zinc-800">{pedido.metodoPago || "No especificado"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ítems comprados */}
                            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-zinc-100">
                                    <h3 className="text-base font-bold text-zinc-800">Prendas en el Pedido</h3>
                                </div>

                                <div className="divide-y divide-zinc-100">
                                    {pedido.lineas.map((linea) => (
                                        <div key={linea.idLineaPedido} className="p-6 flex items-center justify-between gap-4 hover:bg-zinc-50/40 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <img
                                                    src={normalizarImagen(linea.variante?.imagenUrl)}
                                                    alt={linea.variante?.nombreProducto ?? "Prenda"}
                                                    className="w-14 h-18 object-cover rounded-lg bg-zinc-100 border border-zinc-100 shadow-sm shrink-0"
                                                />
                                                <div>
                                                    <h4 className="font-semibold text-zinc-900 text-sm">
                                                        {linea.variante?.nombreProducto ?? "Producto sin nombre"}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {linea.variante?.talla && (
                                                            <span className="text-[10px] font-bold uppercase bg-zinc-100 border border-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded">
                                                                Talla: {linea.variante.talla}
                                                            </span>
                                                        )}
                                                        {linea.variante?.color && (
                                                            <span className="text-[10px] font-semibold bg-zinc-100 border border-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded capitalize">
                                                                Color: {linea.variante.color}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-zinc-400 mt-1">
                                                        {linea.cantidad} unidad(es) x {formatearPrecio(Number(linea.precioUnitario))}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-bold text-zinc-800 text-sm">
                                                    {formatearPrecio(Number(linea.subtotal))}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Resumen final */}
                                <div className="bg-zinc-50 p-6 border-t border-zinc-100 space-y-2">
                                    <div className="flex justify-between text-sm text-zinc-500">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-zinc-800">
                                            {formatearPrecio(Number(pedido.montoTotal) - (pedido.igv || 0) + (pedido.descuento || 0))}
                                        </span>
                                    </div>
                                    {pedido.descuento > 0 && (
                                        <div className="flex justify-between text-sm text-rose-600">
                                            <span>Descuento</span>
                                            <span className="font-medium">
                                                -{formatearPrecio(Number(pedido.descuento))}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm text-zinc-500 pb-2 border-b border-zinc-200/60">
                                        <span>IGV (Impuestos incluidos)</span>
                                        <span className="font-medium text-zinc-800">{formatearPrecio(Number(pedido.igv || 0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 text-base font-bold text-zinc-900">
                                        <span>Total a Pagar</span>
                                        <span className="text-lg text-[#087f99]">{formatearPrecio(Number(pedido.montoTotal))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna de Validación del Pago */}
                        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6 space-y-6">
                            <h3 className="text-base font-bold text-zinc-800 border-b border-zinc-100 pb-3">
                                Validación de Comprobante
                            </h3>

                            {pedido.tieneComprobante ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="text-emerald-600 shrink-0" size={18} />
                                            <p className="font-bold text-sm">Comprobante Subido</p>
                                        </div>
                                        <p className="text-xs text-emerald-700 leading-relaxed">
                                            El cliente ha subido su comprobante para este pedido. Por favor verifica los datos en el documento adjunto.
                                        </p>
                                    </div>

                                    {pedido.archivoComprobante && (
                                        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 flex flex-col items-center justify-center p-2 min-h-[200px]">
                                            {cargandoImagen ? (
                                                <div className="py-8 text-center text-xs text-zinc-400 font-medium">
                                                    Cargando imagen...
                                                </div>
                                            ) : errorImagen ? (
                                                <div className="py-8 px-4 text-center text-xs text-rose-500 font-medium flex flex-col items-center gap-1">
                                                    <AlertCircle size={20} className="text-rose-400" />
                                                    <span>{errorImagen}</span>
                                                </div>
                                            ) : imagenComprobanteUrl ? (
                                                <a
                                                    href={imagenComprobanteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full group relative block cursor-zoom-in"
                                                    title="Haga clic para ampliar la imagen"
                                                >
                                                    <img
                                                        src={imagenComprobanteUrl}
                                                        alt="Comprobante de pago"
                                                        className="w-full h-auto max-h-[300px] object-contain rounded-lg border border-zinc-100 shadow-sm transition group-hover:opacity-90"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                        <span className="text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-full">
                                                            Ampliar imagen
                                                        </span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="py-8 text-center text-xs text-zinc-400 font-medium">
                                                    No hay archivo disponible
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-amber-800 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="text-amber-600 shrink-0" size={18} />
                                        <p className="font-bold text-sm">Pago Pendiente</p>
                                    </div>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        El comprador aún no ha cargado ningún comprobante de pago para este pedido.
                                    </p>
                                </div>
                            )}

                            {/* Mensajes de feedback de las acciones */}
                            {errorAccion && (
                                <div className="rounded-lg bg-rose-50 border border-rose-100 text-rose-700 p-3 text-xs font-semibold leading-relaxed">
                                    {errorAccion}
                                </div>
                            )}
                            {exitoAccion && (
                                <div className="rounded-lg bg-green-50 border border-green-100 text-green-700 p-3 text-xs font-semibold leading-relaxed">
                                    {exitoAccion}
                                </div>
                            )}

                            {/* Botones de Confirmación y Rechazo */}
                            {pedido.estado === "REGISTRADO" && pedido.tieneComprobante && (
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleConfirmarPagoClick}
                                        disabled={verificando}
                                        className="w-full h-12 bg-[#087f99] hover:bg-[#066a80] text-white font-bold text-xs uppercase tracking-wider shadow-none transition-colors"
                                    >
                                        {verificando ? "Procesando..." : "Confirmar Pago"}
                                    </Button>
                                    <Button
                                        onClick={handleRechazarPagoClick}
                                        disabled={verificando}
                                        className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-none transition-colors"
                                    >
                                        Rechazar Pago
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Modal de Confirmación de Pago */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full mx-4 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-zinc-800">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                <CheckCircle size={22} />
                            </div>
                            <h4 className="text-base font-bold">Confirmar Pago</h4>
                        </div>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                            ¿Confirmar pago y marcar pedido como Confirmado?
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirmModal(false)}
                                className="h-10 text-zinc-500 border-zinc-200 hover:bg-zinc-50 font-semibold text-xs cursor-pointer shadow-none"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmarPagoAction}
                                className="h-10 bg-[#087f99] hover:bg-[#066a80] text-white font-bold text-xs px-4 cursor-pointer border-none shadow-none"
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Rechazo de Pago */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full mx-4 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-zinc-800">
                            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                                <AlertCircle size={22} />
                            </div>
                            <h4 className="text-base font-bold">Motivo de rechazo</h4>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-zinc-400 font-medium">Escriba la razón del rechazo del comprobante de pago:</p>
                            <textarea
                                value={motivoRechazo}
                                onChange={(e) => {
                                    setMotivoRechazo(e.target.value);
                                    if (e.target.value.trim()) setErrorRechazo(null);
                                }}
                                placeholder="Ej: El monto del comprobante no coincide con el total o la imagen no es legible."
                                className="w-full min-h-[100px] text-sm text-zinc-800 placeholder-zinc-400 border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none shadow-none"
                            />
                            {errorRechazo && (
                                <p className="text-xs font-semibold text-rose-600">
                                    {errorRechazo}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectModal(false)}
                                className="h-10 text-zinc-500 border-zinc-200 hover:bg-zinc-50 font-semibold text-xs cursor-pointer shadow-none"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleRechazarPagoAction}
                                className="h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 cursor-pointer border-none shadow-none"
                            >
                                Rechazar Pago
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}