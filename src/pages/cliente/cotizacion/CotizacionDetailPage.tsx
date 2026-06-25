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
  type Contrapropuesta,
} from "@/api/cotizacionesApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MAX_CONTRAPROPUESTAS = 5;

type ProductoDTO = {
  idProducto: number;
  nombre: string;
  precioBase: number;
  estado?: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  categoria?: {
    idCategoria: number;
    nombre: string;
  } | null;
};

type ColorDTO = {
  idColor?: number | null;
  nombre?: string | null;
  nombreColor?: string | null;
  hexadecimal?: string | null;
  codigoHex?: string | null;
  hex?: string | null;
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
  color?: string | ColorDTO | null;
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

  const fechaDate = new Date(fecha);

  if (Number.isNaN(fechaDate.getTime())) {
    return "-";
  }

  return fechaDate.toLocaleString("es-PE", {
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
    estadoUpper === "CONTRAPROPUESTA" ||
    estadoUpper === "RECHAZADA" ||
    estadoUpper === "CERRADA"
  ) {
    return estadoUpper as EstadoCotizacion;
  }

  return "PENDIENTE";
}

function etiquetaEstado(estado?: string | null) {
  const estadoNormalizado = normalizarEstado(estado);

  const etiquetas: Record<EstadoCotizacion, string> = {
    PENDIENTE: "Pendiente",
    CONTRAPROPUESTA: "Contrapropuesta recibida",
    RECHAZADA: "Rechazada",
    CERRADA: "Cerrada",
  };

  return etiquetas[estadoNormalizado];
}

function claseEstado(estado?: string | null) {
  const estadoNormalizado = normalizarEstado(estado);

  if (estadoNormalizado === "PENDIENTE") {
    return "bg-amber-50 text-amber-600";
  }

  if (estadoNormalizado === "CONTRAPROPUESTA") {
    return "bg-cyan-50 text-[#087f99]";
  }

  if (estadoNormalizado === "CERRADA") {
    return "bg-emerald-50 text-emerald-600";
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

function obtenerLineasCotizacion(cotizacion: Cotizacion) {
  return (
    cotizacion.lineas ??
    cotizacion.lineasCotizacion ??
    cotizacion.lineaCotizaciones ??
    []
  );
}

function obtenerContrapropuestas(cotizacion: Cotizacion) {
  return cotizacion.contrapropuestas ?? cotizacion.historialContrapropuestas ?? [];
}

function obtenerCantidadContrapropuestas(cotizacion: Cotizacion) {
  const desdeCampo = Number(
    cotizacion.cantidadContrapropuestas ??
      cotizacion.numeroContrapropuestas ??
      NaN
  );

  if (Number.isFinite(desdeCampo)) {
    return desdeCampo;
  }

  return obtenerContrapropuestas(cotizacion).length;
}

function obtenerUltimaContrapropuesta(cotizacion: Cotizacion) {
  const contrapropuestas = obtenerContrapropuestas(cotizacion);

  if (contrapropuestas.length === 0) return null;

  return [...contrapropuestas].sort((a, b) => {
    const fechaA = new Date(a.fechaCreacion ?? "").getTime();
    const fechaB = new Date(b.fechaCreacion ?? "").getTime();

    return fechaB - fechaA;
  })[0];
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

  const [precioNuevo, setPrecioNuevo] = useState("");
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
      setMensajeAccion(null);

      const data = await obtenerCotizacionPorId(idCotizacion);

      setCotizacion(data);

      if (data.idProducto) {
        try {
          const productoData = await buscarProductoPorId(data.idProducto);
          setProducto(productoData);
        } catch (productoError) {
          console.warn(productoError);
          setProducto(null);
        }
      }

      const lineas = obtenerLineasCotizacion(data);

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
    cantidadContrapropuestas >= MAX_CONTRAPROPUESTAS &&
    estadoActual !== "CERRADA";

  const totalUnidades = useMemo(() => {
    return lineasDetalle.reduce(
      (total, linea) => total + Number(linea.cantidad ?? 0),
      0
    );
  }, [lineasDetalle]);

  const totalLineas = useMemo(() => {
    if (!cotizacion) return 0;

    return lineasDetalle.reduce((total, linea) => {
      const precioUnitario = Number(
        linea.precioUnitario ?? cotizacion.precioSugerido ?? 0
      );

      const subtotal = Number(
        linea.subtotal ?? Number(linea.cantidad ?? 0) * precioUnitario
      );

      return total + subtotal;
    }, 0);
  }, [lineasDetalle, cotizacion]);

  const totalCotizacion = useMemo(() => {
    if (!cotizacion) return 0;

    if (lineasDetalle.length > 0 && totalLineas > 0) {
      return totalLineas;
    }

    return Number(cotizacion.montoSugerido ?? 0);
  }, [cotizacion, lineasDetalle.length, totalLineas]);

  const montoRegistradoBackend = Number(cotizacion?.montoSugerido ?? 0);

  const hayDiferenciaConBackend =
    lineasDetalle.length > 0 &&
    Math.abs(totalCotizacion - montoRegistradoBackend) > 0.01;

  const ultimaContrapropuesta = cotizacion
    ? obtenerUltimaContrapropuesta(cotizacion)
    : null;

  const precioUltimaContrapropuesta =
    ultimaContrapropuesta?.precioNuevo ??
    (estadoActual === "CONTRAPROPUESTA" || estadoActual === "CERRADA"
      ? cotizacion?.montoReal
      : null);

  const diferenciaMonto =
    precioUltimaContrapropuesta != null && cotizacion
      ? Number(precioUltimaContrapropuesta) - totalCotizacion
      : null;

  const puedeResponder =
    Boolean(cotizacion) &&
    estadoActual === "CONTRAPROPUESTA" &&
    precioUltimaContrapropuesta != null &&
    !limiteAlcanzado;

  async function handleAceptarCotizacion() {
    if (!cotizacion) return;

    try {
      setAceptando(true);
      setError(null);
      setMensajeAccion(null);

      await aceptarCotizacion(cotizacion.idCotizacion);

      setMensajeAccion("Cotización aceptada correctamente.");
      await cargarCotizacion();
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

      await rechazarCotizacion(cotizacion.idCotizacion);

      setMensajeAccion("Cotización rechazada correctamente.");
      await cargarCotizacion();
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
        `La cotización alcanzó el límite de ${MAX_CONTRAPROPUESTAS} contrapropuestas.`
      );
      return;
    }

    const precioNuevoNumber = Number(precioNuevo);

    if (
      !precioNuevo.trim() ||
      Number.isNaN(precioNuevoNumber) ||
      precioNuevoNumber <= 0
    ) {
      setError("Ingresa un precio nuevo válido.");
      return;
    }

    try {
      setEnviandoContrapropuesta(true);
      setError(null);
      setMensajeAccion(null);

      await crearContrapropuesta({
        idCotizacion: cotizacion.idCotizacion,
        precioNuevo: precioNuevoNumber,
        sustento: sustentoNuevo.trim() || null,
      });

      setPrecioNuevo("");
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

                <div className="rounded-xl bg-pink-50 px-5 py-4 ring-1 ring-pink-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Total de la cotización
                  </p>

                  <p className="mt-2 text-2xl font-extrabold text-[#bd2d73]">
                    {formatearPrecio(totalCotizacion)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Calculado desde {totalUnidades} unidad(es)
                  </p>
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

              <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50 px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd2d73]">
                      Total solicitado por el cliente
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {totalUnidades} unidades · {lineasDetalle.length} variante(s)
                    </p>

                    {hayDiferenciaConBackend && (
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Nota: el backend registra{" "}
                        {formatearPrecio(montoRegistradoBackend)}, pero la suma
                        de las líneas da {formatearPrecio(totalCotizacion)}.
                      </p>
                    )}
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-4xl font-extrabold text-[#bd2d73]">
                      {formatearPrecio(totalCotizacion)}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Suma total de variantes
                    </p>
                  </div>
                </div>
              </div>

              {precioUltimaContrapropuesta != null && (
                <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50 px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Última propuesta recibida / monto real
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-[#bd2d73]">
                    {formatearPrecio(precioUltimaContrapropuesta)}
                  </p>

                  {diferenciaMonto !== null && (
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      Diferencia frente al total de la cotización:{" "}
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
                    El backend no está devolviendo las líneas de esta
                    cotización. Revisa que CotizacionDTO incluya lineas.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Variante</th>
                        <th className="px-4 py-3 text-left">Color</th>
                        <th className="px-4 py-3 text-left">Talla</th>
                        <th className="px-4 py-3 text-left">Cantidad</th>
                        <th className="px-4 py-3 text-left">Precio unitario</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lineasDetalle.map((linea) => {
                        const precioUnitario = Number(
                          linea.precioUnitario ?? cotizacion.precioSugerido
                        );

                        const subtotal = Number(
                          linea.subtotal ?? precioUnitario * linea.cantidad
                        );

                        return (
                          <tr
                            key={`${linea.idVariante}-${
                              linea.idLineaCotizacion ?? ""
                            }`}
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

                            <td className="px-4 py-3 text-slate-600">
                              {formatearPrecio(precioUnitario)}
                            </td>

                            <td className="px-4 py-3 text-right font-extrabold text-[#bd2d73]">
                              {formatearPrecio(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot className="bg-slate-50">
                      <tr className="border-t border-slate-200">
                        <td
                          colSpan={3}
                          className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500"
                        >
                          Total
                        </td>

                        <td className="px-4 py-4 font-extrabold text-slate-900">
                          {totalUnidades}
                        </td>

                        <td className="px-4 py-4 text-slate-500">—</td>

                        <td className="px-4 py-4 text-right text-xl font-extrabold text-[#bd2d73]">
                          {formatearPrecio(totalCotizacion)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </article>

            <article className="rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Historial de contrapropuestas
              </h2>

              {cotizacion && obtenerContrapropuestas(cotizacion).length === 0 ? (
                <p className="mt-5 rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-500">
                  Aún no hay contrapropuestas registradas para esta cotización.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {obtenerContrapropuestas(cotizacion)
                    .slice()
                    .sort((a: Contrapropuesta, b: Contrapropuesta) => {
                      const fechaA = new Date(a.fechaCreacion ?? "").getTime();
                      const fechaB = new Date(b.fechaCreacion ?? "").getTime();

                      return fechaB - fechaA;
                    })
                    .map((contrapropuesta, index) => (
                      <div
                        key={contrapropuesta.idContrapropuesta}
                        className={`rounded-xl border p-5 ${
                          index === 0
                            ? "border-[#087f99] bg-cyan-50"
                            : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              {index === 0
                                ? "Última contrapropuesta"
                                : "Contrapropuesta anterior"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {formatearFecha(contrapropuesta.fechaCreacion)}
                            </p>
                          </div>

                          <p className="text-xl font-extrabold text-[#bd2d73]">
                            {formatearPrecio(contrapropuesta.precioNuevo)}
                          </p>
                        </div>

                        <p className="mt-4 text-sm text-slate-600">
                          {contrapropuesta.sustento || "Sin sustento."}
                        </p>
                      </div>
                    ))}
                </div>
              )}
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
                {formatearPrecio(totalCotizacion)}
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {totalUnidades} unidades · {lineasDetalle.length} variante(s)
              </p>

              {hayDiferenciaConBackend && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                  Monto registrado: {formatearPrecio(montoRegistradoBackend)}
                </p>
              )}
            </div>

            {estadoActual === "PENDIENTE" ? (
              <div className="mt-6 rounded-xl bg-amber-50 px-5 py-4">
                <p className="font-bold text-amber-600">
                  Pendiente de revisión
                </p>

                <p className="mt-2 text-sm text-amber-600">
                  El comerciante todavía no ha respondido tu solicitud.
                </p>
              </div>
            ) : estadoActual === "CERRADA" ? (
              <div className="mt-6 rounded-xl bg-emerald-50 px-5 py-4">
                <p className="flex items-center gap-2 font-bold text-emerald-600">
                  <CheckCircle2 size={18} />
                  Cotización cerrada
                </p>

                <p className="mt-2 text-sm text-emerald-600">
                  Esta cotización ya fue aceptada o finalizada.
                </p>
              </div>
            ) : estadoActual === "RECHAZADA" ? (
              <div className="mt-6 rounded-xl bg-red-50 px-5 py-4">
                <p className="font-bold text-red-600">Cotización rechazada</p>

                <p className="mt-2 text-sm text-red-500">
                  Esta cotización fue rechazada.
                </p>
              </div>
            ) : limiteAlcanzado ? (
              <div className="mt-6 rounded-xl bg-red-50 px-5 py-4">
                <p className="font-bold text-red-600">
                  Límite de contrapropuestas alcanzado
                </p>

                <p className="mt-2 text-sm text-red-500">
                  Esta cotización alcanzó el máximo de{" "}
                  {MAX_CONTRAPROPUESTAS} contrapropuestas.
                </p>
              </div>
            ) : puedeResponder ? (
              <>
                <div className="mt-6 rounded-xl bg-white/80 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Última propuesta recibida
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-[#bd2d73]">
                    {formatearPrecio(precioUltimaContrapropuesta)}
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
                  Aceptar propuesta
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
                  Rechazar propuesta
                </Button>

                <div className="my-6 h-px bg-cyan-100" />

                <form
                  onSubmit={handleEnviarContrapropuesta}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Nuevo precio propuesto
                    </label>

                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={precioNuevo}
                      onChange={(event) => {
                        setPrecioNuevo(event.target.value);
                        setError(null);
                        setMensajeAccion(null);
                      }}
                      placeholder="Ej. 30000"
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