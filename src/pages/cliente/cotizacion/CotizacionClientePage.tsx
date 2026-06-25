import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  filtrarMisCotizaciones,
  type Cotizacion,
  type EstadoCotizacion,
} from "@/api/cotizacionesApi";

const ITEMS_POR_PAGINA = 5;

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

  return new Date(fecha).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

export default function CotizacionClientePage() {
  const navigate = useNavigate();

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCotizacion | "">("");

  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: true,
        state: {
          from: "/cotizaciones",
        },
      });

      return;
    }

    if (sesion.rol !== "CLIENTE") {
      navigate("/", { replace: true });
      return;
    }

    void cargarCotizaciones(0, estadoFiltro);
  }, [navigate]);

  async function cargarCotizaciones(
    nuevaPagina = pagina,
    nuevoEstado = estadoFiltro
  ) {
    try {
      setError(null);

      if (cotizaciones.length === 0) {
        setCargando(true);
      } else {
        setRecargando(true);
      }

      const data = await filtrarMisCotizaciones({
        estado: nuevoEstado,
        page: nuevaPagina,
        size: ITEMS_POR_PAGINA,
      });

      setCotizaciones(data.content ?? []);
      setPagina(data.number ?? nuevaPagina);
      setTotalPaginas(Math.max(data.totalPages ?? 1, 1));
      setTotalElementos(data.totalElements ?? 0);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar tus cotizaciones.";

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
            from: "/cotizaciones",
          },
        });

        return;
      }

      setError(message);
    } finally {
      setCargando(false);
      setRecargando(false);
    }
  }

  function handleCambiarEstado(estado: EstadoCotizacion | "") {
    setEstadoFiltro(estado);
    setPagina(0);
    void cargarCotizaciones(0, estado);
  }

  const resumen = useMemo(() => {
    const pendientes = cotizaciones.filter(
      (c) => normalizarEstado(c.estado) === "PENDIENTE"
    ).length;

    const contrapropuestas = cotizaciones.filter(
      (c) => normalizarEstado(c.estado) === "CONTRAPROPUESTA"
    ).length;

    const cerradas = cotizaciones.filter((c) => {
      const estado = normalizarEstado(c.estado);

      return (
        estado === "ACEPTADA" ||
        estado === "APROBADA" ||
        estado === "RECHAZADA" ||
        estado === "CANCELADA"
      );
    }).length;

    return {
      pendientes,
      contrapropuestas,
      cerradas,
    };
  }, [cotizaciones]);

  if (cargando) {
    return (
      <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc]">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Cargando cotizaciones...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-66px)] bg-[#f7fafc] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/perfil"
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
        >
          <ArrowLeft size={16} />
          Volver al perfil
        </Link>

        <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
              Mis solicitudes
            </p>

            <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
              Mis cotizaciones
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Revisa tus cotizaciones, contrapropuestas y estados de negociación.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={estadoFiltro}
              onChange={(event) =>
                handleCambiarEstado(event.target.value as EstadoCotizacion | "")
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-[#087f99]"
            >
              <option value="">Todas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="CONTRAPROPUESTA">Con contrapropuesta</option>
              <option value="ACEPTADA">Aceptadas</option>
              <option value="RECHAZADA">Rechazadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>

            <Button
              type="button"
              variant="outline"
              onClick={() => void cargarCotizaciones(pagina, estadoFiltro)}
              disabled={recargando}
              className="h-11 rounded-xl border-[#087f99] font-bold text-[#087f99] hover:bg-cyan-50"
            >
              {recargando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Actualizar
            </Button>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {totalElementos}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Pendientes
            </p>
            <p className="mt-2 text-3xl font-extrabold text-amber-500">
              {resumen.pendientes}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Contrapropuestas
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#087f99]">
              {resumen.contrapropuestas}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Cerradas
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#bd2d73]">
              {resumen.cerradas}
            </p>
          </article>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {cotizaciones.length === 0 ? (
          <section className="rounded-2xl bg-white p-16 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-cyan-50 text-[#087f99]">
              <FileText size={26} />
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-800">
              No tienes cotizaciones todavía
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Puedes crear una cotización desde el detalle de un producto.
            </p>

            <Button
              asChild
              className="mt-6 rounded-xl bg-[#087f99] font-bold hover:bg-[#076f86]"
            >
              <Link to="/">Explorar catálogo</Link>
            </Button>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="hidden grid-cols-[130px_160px_1fr_180px_180px_130px] border-b border-slate-100 bg-slate-50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 lg:grid">
                <span>Código</span>
                <span>Estado</span>
                <span>Sustento</span>
                <span>Precio sugerido</span>
                <span>Monto sugerido</span>
                <span>Acción</span>
              </div>

              {cotizaciones.map((cotizacion) => (
                <article
                  key={cotizacion.idCotizacion}
                  className="grid gap-4 border-b border-slate-100 px-6 py-5 last:border-0 lg:grid-cols-[130px_160px_1fr_180px_180px_130px] lg:items-center"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cotización
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-slate-800">
                      #{cotizacion.idCotizacion}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatearFecha(cotizacion.fechaCreacion)}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${claseEstado(
                        cotizacion.estado
                      )}`}
                    >
                      {etiquetaEstado(cotizacion.estado)}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-sm text-slate-600">
                    {cotizacion.sustento || "Sin sustento registrado."}
                  </p>

                  <p className="text-lg font-extrabold text-slate-800">
                    {formatearPrecio(cotizacion.precioSugerido)}
                  </p>

                  <p className="text-xl font-extrabold text-[#bd2d73]">
                    {formatearPrecio(cotizacion.montoSugerido)}
                  </p>

                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-xl border-[#087f99] font-bold text-[#087f99] hover:bg-cyan-50"
                  >
                    <Link to={`/cotizaciones/${cotizacion.idCotizacion}`}>
                      <Eye size={16} />
                      Ver
                    </Link>
                  </Button>
                </article>
              ))}
            </section>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={pagina === 0}
                onClick={() => void cargarCotizaciones(pagina - 1, estadoFiltro)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#087f99] hover:text-[#087f99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="text-sm font-bold text-slate-600">
                Página {pagina + 1} de {totalPaginas}
              </span>

              <button
                type="button"
                disabled={pagina + 1 >= totalPaginas}
                onClick={() => void cargarCotizaciones(pagina + 1, estadoFiltro)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#087f99] hover:text-[#087f99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}