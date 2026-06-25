import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Loader2,
    Package,
    Send,
    XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    aceptarCotizacion,
    crearContrapropuesta,
    obtenerCotizacionPorId,
    rechazarCotizacion,
    type Cotizacion,
    type EstadoCotizacion,
    type LineaCotizacion,
} from "@/api/cotizacionesApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MAX_CONTRAPROPUESTAS = 5;

type ProductoDTO = {
    idProducto: number;
    nombre: string;
    precioBase: number;
    descripcion?: string | null;
    imagenUrl?: string | null;
    categoria?: {
        idCategoria: number;
        nombre: string;
    } | null;
};

type VarianteProductoDTO = {
    idVariante: number;
    talla: string;
    stockDisponible?: number | null;
    stockReservado?: number | null;
    idProducto?: number | null;
    idColor?: number | null;
    nombreColor?: string | null;
    hexadecimal?: string | null;
    color?:
    | string
    | {
        idColor?: number | null;
        nombre?: string | null;
        nombreColor?: string | null;
        hexadecimal?: string | null;
        codigoHex?: string | null;
        hex?: string | null;
    }
    | null;
};

type LineaDetalle = LineaCotizacion & {
    variante?: VarianteProductoDTO | null;
};

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

function formatearPrecio(valor?: number | null) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor ?? 0));
}

function formatearFecha(fecha?: string | null) {
    if (!fecha) return "-";

    return new Date(fecha).toLocaleString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizarEstado(estado?: string | null): EstadoCotizacion {
    const estadoUpper = String(estado ?? "PENDIENTE").toUpperCase();

    if (
        estadoUpper === "PENDIENTE" ||
        estadoUpper === "ACEPTADA" ||
        estadoUpper === "APROBADA" ||
        estadoUpper === "RECHAZADA" ||
        estadoUpper === "CONTRAPROPUESTA" ||
        estadoUpper === "CANCELADA"
    ) {
        return estadoUpper as EstadoCotizacion;
    }

    return "PENDIENTE";
}

function etiquetaEstado(estado?: string | null) {
    const estadoNormalizado = normalizarEstado(estado);

    const etiquetas: Record<EstadoCotizacion, string> = {
        PENDIENTE: "Pendiente",
        ACEPTADA: "Aceptada",
        APROBADA: "Aprobada",
        RECHAZADA: "Rechazada",
        CONTRAPROPUESTA: "Contrapropuesta recibida",
        CANCELADA: "Cancelada",
    };

    return etiquetas[estadoNormalizado];
}

function claseEstado(estado?: string | null) {
    const estadoNormalizado = normalizarEstado(estado);

    if (estadoNormalizado === "PENDIENTE") {
        return "bg-amber-50 text-amber-600";
    }

    if (estadoNormalizado === "ACEPTADA" || estadoNormalizado === "APROBADA") {
        return "bg-emerald-50 text-emerald-600";
    }

    if (estadoNormalizado === "CONTRAPROPUESTA") {
        return "bg-cyan-50 text-[#087f99]";
    }

    return "bg-red-50 text-red-600";
}

function obtenerNombreColor(variante?: VarianteProductoDTO | null) {
    if (!variante) return "-";

    if (typeof variante.color === "string") {
        return variante.color;
    }

    if (typeof variante.color === "object" && variante.color) {
        return (
            variante.color.nombre ??
            variante.color.nombreColor ??
            variante.nombreColor ??
            "-"
        );
    }

    return variante.nombreColor ?? "-";
}

function obtenerCantidadContrapropuestas(cotizacion: Cotizacion) {
    return Number(
        cotizacion.cantidadContrapropuestas ??
        cotizacion.numeroContrapropuestas ??
        0
    );
}

async function buscarProductoPorId(idProducto: number): Promise<ProductoDTO> {
    const response = await fetch(`${API_BASE_URL}/api/productos/${idProducto}`, {
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("No se pudo cargar el producto asociado.");
    }

    return response.json() as Promise<ProductoDTO>;
}

async function buscarVariantePorId(
    idVariante: number
): Promise<VarianteProductoDTO> {
    const response = await fetch(`${API_BASE_URL}/api/variantes/${idVariante}`, {
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`No se pudo cargar la variante ${idVariante}.`);
    }

    return response.json() as Promise<VarianteProductoDTO>;
}

export default function CotizacionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const idCotizacion = Number(id);

    const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
    const [producto, setProducto] = useState<ProductoDTO | null>(null);
    const [lineasDetalle, setLineasDetalle] = useState<LineaDetalle[]>([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [montoNuevo, setMontoNuevo] = useState("");
    const [sustentoNuevo, setSustentoNuevo] = useState("");

    const [enviandoContrapropuesta, setEnviandoContrapropuesta] = useState(false);
    const [aceptando, setAceptando] = useState(false);
    const [rechazando, setRechazando] = useState(false);
    const [mensajeAccion, setMensajeAccion] = useState<string | null>(null);

    useEffect(() => {
        const sesion = obtenerSesionUsuario();

        if (!sesion.estaLogeado) {
            navigate("/login", {
                replace: true,
                state: {
                    from: `/cotizaciones/${id}`,
                },
            });

            return;
        }

        if (sesion.rol !== "CLIENTE") {
            navigate("/", { replace: true });
            return;
        }

        void cargarCotizacion();
    }, [id, navigate]);

    async function cargarCotizacion() {
        if (!idCotizacion || Number.isNaN(idCotizacion)) {
            setError("La cotización seleccionada no es válida.");
            setCargando(false);
            return;
        }

        try {
            setCargando(true);
            setError(null);

            const data = await obtenerCotizacionPorId(idCotizacion);

            setCotizacion(data);

            if (data.idProducto) {
                try {
                    const productoData = await buscarProductoPorId(data.idProducto);
                    setProducto(productoData);
                } catch (productoError) {
                    console.warn(productoError);
                }
            }

            const lineas = data.lineas ?? [];

            if (lineas.length > 0) {
                const lineasConDetalle = await Promise.all(
                    lineas.map(async (linea) => {
                        try {
                            const variante = await buscarVariantePorId(linea.idVariante);

                            return {
                                ...linea,
                                variante,
                            };
                        } catch {
                            return {
                                ...linea,
                                variante: null,
                            };
                        }
                    })
                );

                setLineasDetalle(lineasConDetalle);
            } else {
                setLineasDetalle([]);
            }
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo cargar la cotización.";

            const debeIrALogin =
                message.includes("401") ||
                message.includes("403") ||
                message.toLowerCase().includes("unauthorized") ||
                message.toLowerCase().includes("forbidden");

            if (debeIrALogin) {
                limpiarSesionLocal();

                navigate("/login", {
                    replace: true,
                    state: {
                        from: `/cotizaciones/${id}`,
                    },
                });

                return;
            }

            setError(message);
        } finally {
            setCargando(false);
        }
    }

    const estadoActual = normalizarEstado(cotizacion?.estado);

    const cantidadContrapropuestas = cotizacion
        ? obtenerCantidadContrapropuestas(cotizacion)
        : 0;

    const limiteAlcanzado =
        estadoActual === "CANCELADA" ||
        cantidadContrapropuestas >= MAX_CONTRAPROPUESTAS;

    const totalUnidades = useMemo(() => {
        return lineasDetalle.reduce((total, linea) => total + linea.cantidad, 0);
    }, [lineasDetalle]);

    const totalCalculadoPorLineas = useMemo(() => {
        if (!cotizacion) return 0;

        return totalUnidades * Number(cotizacion.precioSugerido ?? 0);
    }, [cotizacion, totalUnidades]);

    const diferenciaMonto = useMemo(() => {
        if (!cotizacion || cotizacion.montoReal === null) return null;

        return Number(cotizacion.montoReal) - Number(cotizacion.montoSugerido);
    }, [cotizacion]);

    const hayContrapropuesta =
        estadoActual === "CONTRAPROPUESTA" &&
        cotizacion?.montoReal !== null &&
        cotizacion?.montoReal !== undefined;

    const puedeResponder =
        cotizacion &&
        estadoActual === "CONTRAPROPUESTA" &&
        hayContrapropuesta &&
        !limiteAlcanzado;

    async function handleAceptarCotizacion() {
        if (!cotizacion) return;

        try {
            setAceptando(true);
            setError(null);
            setMensajeAccion(null);

            const actualizada = await aceptarCotizacion(cotizacion.idCotizacion);

            setCotizacion(actualizada);
            setMensajeAccion("Cotización aceptada correctamente.");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo aceptar la cotización.";

            setError(message);
        } finally {
            setAceptando(false);
        }
    }

    async function handleRechazarCotizacion() {
        if (!cotizacion) return;

        try {
            setRechazando(true);
            setError(null);
            setMensajeAccion(null);

            const actualizada = await rechazarCotizacion(cotizacion.idCotizacion);

            setCotizacion(actualizada);
            setMensajeAccion("Cotización rechazada correctamente.");
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo rechazar la cotización.";

            setError(message);
        } finally {
            setRechazando(false);
        }
    }

    async function handleEnviarContrapropuesta(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!cotizacion) return;

        if (limiteAlcanzado) {
            setError(
                `La cotización fue cancelada porque alcanzó el límite de ${MAX_CONTRAPROPUESTAS} contrapropuestas.`
            );
            return;
        }

        const montoNumber = Number(montoNuevo);

        if (!montoNuevo.trim() || Number.isNaN(montoNumber) || montoNumber <= 0) {
            setError("Ingresa un monto sugerido válido.");
            return;
        }

        try {
            setEnviandoContrapropuesta(true);
            setError(null);
            setMensajeAccion(null);

            const actualizada = await crearContrapropuesta({
                idCotizacion: cotizacion.idCotizacion,
                montoSugerido: montoNumber,
                sustento: sustentoNuevo.trim() || null,
            });

            setCotizacion(actualizada);
            setMontoNuevo("");
            setSustentoNuevo("");
            setMensajeAccion("Contrapropuesta enviada correctamente.");

            await cargarCotizacion();
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "No se pudo enviar la contrapropuesta.";

            setError(message);
        } finally {
            setEnviandoContrapropuesta(false);
        }
    }

    if (cargando) {
        return (
            <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc]">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 size={18} className="animate-spin" />
                    Cargando cotización...
                </p>
            </main>
        );
    }

    if (error && !cotizacion) {
        return (
            <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc] px-6">
                <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
                    <XCircle className="mx-auto text-red-500" size={42} />

                    <h1 className="mt-4 text-xl font-extrabold text-slate-800">
                        No se pudo cargar la cotización
                    </h1>

                    <p className="mt-2 text-sm text-red-500">{error}</p>

                    <Button
                        type="button"
                        onClick={() => navigate("/cotizaciones")}
                        className="mt-6 rounded-xl bg-[#087f99] font-bold hover:bg-[#076f86]"
                    >
                        Volver
                    </Button>
                </div>
            </main>
        );
    }

    if (!cotizacion) return null;

    return (
        <main className="min-h-[calc(100vh-66px)] bg-[#f7fafc] px-6 py-10">
            <div className="mx-auto max-w-7xl">
                <Link
                    to="/cotizaciones"
                    className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
                >
                    <ArrowLeft size={16} />
                    Volver a mis cotizaciones
                </Link>

                <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
                    <div className="space-y-6">
                        <article className="rounded-2xl bg-white p-8 shadow-sm">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
                                        Cotización #{cotizacion.idCotizacion}
                                    </p>

                                    <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
                                        Detalle de cotización
                                    </h1>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Creada el {formatearFecha(cotizacion.fechaCreacion)}
                                    </p>
                                </div>

                                <span
                                    className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${claseEstado(
                                        estadoActual
                                    )}`}
                                >
                                    {etiquetaEstado(estadoActual)}
                                </span>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Precio unitario sugerido
                                    </p>

                                    <p className="mt-2 text-xl font-extrabold text-slate-800">
                                        {formatearPrecio(cotizacion.precioSugerido)}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Cantidad total
                                    </p>

                                    <p className="mt-2 text-xl font-extrabold text-slate-800">
                                        {totalUnidades} u.
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Total solicitado
                                    </p>

                                    <p className="mt-2 text-xl font-extrabold text-[#bd2d73]">
                                        {formatearPrecio(cotizacion.montoSugerido)}
                                    </p>

                                    {lineasDetalle.length > 0 && (
                                        <p className="mt-1 text-xs text-slate-400">
                                            Cálculo: {formatearPrecio(totalCalculadoPorLineas)}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl bg-slate-50 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Contrapropuestas
                                    </p>

                                    <p className="mt-2 text-xl font-extrabold text-slate-800">
                                        {cantidadContrapropuestas}/{MAX_CONTRAPROPUESTAS}
                                    </p>
                                </div>
                            </div>

                            {cotizacion.montoReal !== null && cotizacion.montoReal !== undefined && (
                                <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 px-6 py-5">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Último monto real / contrapropuesta
                                    </p>

                                    <p className="mt-2 text-3xl font-extrabold text-[#bd2d73]">
                                        {formatearPrecio(cotizacion.montoReal)}
                                    </p>

                                    {diferenciaMonto !== null && (
                                        <p className="mt-2 text-sm font-semibold text-slate-600">
                                            Diferencia frente a tu total solicitado:{" "}
                                            <span
                                                className={
                                                    diferenciaMonto > 0
                                                        ? "text-red-500"
                                                        : "text-emerald-600"
                                                }
                                            >
                                                {diferenciaMonto > 0 ? "+" : ""}
                                                {formatearPrecio(diferenciaMonto)}
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-8">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                    Sustento inicial
                                </p>

                                <p className="mt-2 rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-600">
                                    {cotizacion.sustento || "Sin sustento registrado."}
                                </p>
                            </div>
                        </article>

                        <article className="rounded-2xl bg-white p-8 shadow-sm">
                            <h2 className="text-2xl font-extrabold text-slate-900">
                                Producto asociado
                            </h2>

                            <div className="mt-6 rounded-xl border border-slate-100 p-5">
                                {producto ? (
                                    <div>
                                        <p className="text-lg font-extrabold text-slate-800">
                                            {producto.nombre}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {producto.categoria?.nombre ?? "Sin categoría"}
                                        </p>

                                        <p className="mt-3 text-sm text-slate-500">
                                            Precio base:{" "}
                                            <span className="font-bold text-[#bd2d73]">
                                                {formatearPrecio(producto.precioBase)}
                                            </span>
                                        </p>

                                        {producto.descripcion && (
                                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                                {producto.descripcion}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Producto #{cotizacion.idProducto}
                                    </p>
                                )}
                            </div>
                        </article>

                        <article className="rounded-2xl bg-white p-8 shadow-sm">
                            <div className="flex items-center gap-3">
                                <Package size={22} className="text-[#087f99]" />

                                <h2 className="text-2xl font-extrabold text-slate-900">
                                    Variantes solicitadas
                                </h2>
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                                Estas son las tallas y colores incluidos en la cotización.
                            </p>

                            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100">
                                {lineasDetalle.length === 0 ? (
                                    <div className="bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                                        El backend no está devolviendo las líneas de esta cotización.
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Variante</th>
                                                <th className="px-4 py-3 text-left">Color</th>
                                                <th className="px-4 py-3 text-left">Talla</th>
                                                <th className="px-4 py-3 text-left">Cantidad</th>
                                                <th className="px-4 py-3 text-right">Subtotal</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {lineasDetalle.map((linea) => (
                                                <tr
                                                    key={`${linea.idVariante}-${linea.idLineaCotizacion ?? ""}`}
                                                    className="border-t border-slate-100 bg-white"
                                                >
                                                    <td className="px-4 py-3 font-semibold text-slate-700">
                                                        #{linea.idVariante}
                                                    </td>

                                                    <td className="px-4 py-3 text-slate-600">
                                                        {obtenerNombreColor(linea.variante)}
                                                    </td>

                                                    <td className="px-4 py-3 text-slate-600">
                                                        {linea.variante?.talla ?? "-"}
                                                    </td>

                                                    <td className="px-4 py-3 font-bold text-slate-800">
                                                        {linea.cantidad}
                                                    </td>

                                                    <td className="px-4 py-3 text-right font-extrabold text-[#bd2d73]">
                                                        {formatearPrecio(
                                                            linea.cantidad * Number(cotizacion.precioSugerido)
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </article>
                    </div>

                    <aside className="h-fit rounded-2xl bg-[#d7edf2] p-7 shadow-sm">
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#087f99]">
                            <FileText size={24} />
                        </div>

                        <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
                            Acciones
                        </h2>

                        <div className="mt-6 rounded-xl bg-white/80 px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                Total de la cotización
                            </p>

                            <p className="mt-2 text-4xl font-extrabold text-[#bd2d73]">
                                {formatearPrecio(cotizacion.montoSugerido)}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                                {totalUnidades} unidades · {lineasDetalle.length} variante(s)
                            </p>
                        </div>

                        {limiteAlcanzado || estadoActual === "CANCELADA" ? (
                            <div className="mt-6 rounded-xl bg-red-50 px-5 py-4">
                                <p className="font-bold text-red-600">Cotización cancelada</p>

                                <p className="mt-2 text-sm text-red-500">
                                    La cotización alcanzó el límite de contrapropuestas o fue
                                    cancelada por el sistema.
                                </p>
                            </div>
                        ) : estadoActual === "PENDIENTE" ? (
                            <div className="mt-6 rounded-xl bg-amber-50 px-5 py-4">
                                <p className="font-bold text-amber-600">
                                    Pendiente de revisión
                                </p>

                                <p className="mt-2 text-sm text-amber-600">
                                    El comerciante todavía no ha respondido tu solicitud.
                                </p>
                            </div>
                        ) : estadoActual === "ACEPTADA" || estadoActual === "APROBADA" ? (
                            <div className="mt-6 rounded-xl bg-emerald-50 px-5 py-4">
                                <p className="flex items-center gap-2 font-bold text-emerald-600">
                                    <CheckCircle2 size={18} />
                                    Cotización aceptada
                                </p>

                                <p className="mt-2 text-sm text-emerald-600">
                                    Esta cotización ya fue aceptada.
                                </p>
                            </div>
                        ) : estadoActual === "RECHAZADA" ? (
                            <div className="mt-6 rounded-xl bg-red-50 px-5 py-4">
                                <p className="font-bold text-red-600">Cotización rechazada</p>

                                <p className="mt-2 text-sm text-red-500">
                                    Esta cotización fue rechazada.
                                </p>
                            </div>
                        ) : puedeResponder ? (
                            <>
                                <div className="mt-6 rounded-xl bg-white/80 px-5 py-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                        Última oferta recibida
                                    </p>

                                    <p className="mt-2 text-3xl font-extrabold text-[#bd2d73]">
                                        {formatearPrecio(cotizacion.montoReal)}
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => void handleAceptarCotizacion()}
                                    disabled={aceptando}
                                    className="mt-6 h-12 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {aceptando && (
                                        <Loader2 size={17} className="mr-2 animate-spin" />
                                    )}
                                    Aceptar contrapropuesta
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => void handleRechazarCotizacion()}
                                    disabled={rechazando}
                                    className="mt-3 h-12 w-full rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 disabled:opacity-60"
                                >
                                    {rechazando && (
                                        <Loader2 size={17} className="mr-2 animate-spin" />
                                    )}
                                    Rechazar contrapropuesta
                                </Button>

                                <div className="my-6 h-px bg-cyan-100" />

                                <form
                                    onSubmit={handleEnviarContrapropuesta}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Nuevo monto sugerido
                                        </label>

                                        <input
                                            type="number"
                                            min={1}
                                            step="0.01"
                                            value={montoNuevo}
                                            onChange={(event) => {
                                                setMontoNuevo(event.target.value);
                                                setError(null);
                                                setMensajeAccion(null);
                                            }}
                                            placeholder="Ej. 500"
                                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#087f99]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Sustento
                                        </label>

                                        <textarea
                                            value={sustentoNuevo}
                                            onChange={(event) => {
                                                setSustentoNuevo(event.target.value);
                                                setError(null);
                                                setMensajeAccion(null);
                                            }}
                                            rows={4}
                                            placeholder="Ej. Podría aceptar si se mantiene este precio..."
                                            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#087f99]"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={enviandoContrapropuesta}
                                        className="h-12 w-full rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86] disabled:opacity-60"
                                    >
                                        {enviandoContrapropuesta ? (
                                            <Loader2 size={17} className="mr-2 animate-spin" />
                                        ) : (
                                            <Send size={17} className="mr-2" />
                                        )}
                                        {enviandoContrapropuesta
                                            ? "Enviando..."
                                            : "Enviar contrapropuesta"}
                                    </Button>
                                </form>
                            </>
                        ) : (
                            <div className="mt-6 rounded-xl bg-slate-50 px-5 py-4">
                                <p className="font-bold text-slate-700">
                                    No hay acciones disponibles
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                    Esta cotización no requiere respuesta en este momento.
                                </p>
                            </div>
                        )}

                        {error && (
                            <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                                {error}
                            </p>
                        )}

                        {mensajeAccion && (
                            <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">
                                {mensajeAccion}
                            </p>
                        )}
                    </aside>
                </section>
            </div>
        </main>
    );
}