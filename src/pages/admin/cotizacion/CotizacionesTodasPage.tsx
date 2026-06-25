import { useEffect, useState } from "react";
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
  filtrarCotizaciones,
  type Cotizacion,
  type EstadoCotizacion,
} from "@/api/cotizacionesApi";

const ITEMS_POR_PAGINA = 8;

type ResumenCotizaciones = {
  total: number;
  pendientes: number;
  contrapropuestas: number;
  cerradas: number;
  rechazadas: number;
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

  return fechaDate.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
    CONTRAPROPUESTA: "Contrapropuesta",
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

function obtenerMontoRealTexto(cotizacion: Cotizacion) {
  if (cotizacion.montoReal === null || cotizacion.montoReal === undefined) {
    return "Sin respuesta";
  }

  return formatearPrecio(cotizacion.montoReal);
}

export default function CotizacionesTodasPage() {
  const navigate = useNavigate();

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalElementos, setTotalElementos] = useState(0);

  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCotizacion | "">("");
  const [idClienteFiltro, setIdClienteFiltro] = useState("");
  const [idComercianteFiltro, setIdComercianteFiltro] = useState("");

  const [resumen, setResumen] = useState<ResumenCotizaciones>({
    total: 0,
    pendientes: 0,
    contrapropuestas: 0,
    cerradas: 0,
    rechazadas: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: true,
        state: {
          from: "/admin/cotizaciones/todas",
        },
      });

      return;
    }

    if (sesion.rol !== "ADMINISTRADOR" && sesion.rol !== "COMERCIANTE") {
      navigate("/", { replace: true });
      return;
    }

    void cargarCotizaciones(0);
    void cargarResumen();
  }, [navigate]);

  async function cargarResumen() {
    try {
      const [todas, pendientes, contrapropuestas, cerradas, rechazadas] =
        await Promise.all([
          filtrarCotizaciones({ page: 0, size: 1 }),
          filtrarCotizaciones({ estado: "PENDIENTE", page: 0, size: 1 }),
          filtrarCotizaciones({
            estado: "CONTRAPROPUESTA",
            page: 0,
            size: 1,
          }),
          filtrarCotizaciones({ estado: "CERRADA", page: 0, size: 1 }),
          filtrarCotizaciones({ estado: "RECHAZADA", page: 0, size: 1 }),
        ]);

      setResumen({
        total: todas.totalElements ?? 0,
        pendientes: pendientes.totalElements ?? 0,
        contrapropuestas: contrapropuestas.totalElements ?? 0,
        cerradas: cerradas.totalElements ?? 0,
        rechazadas: rechazadas.totalElements ?? 0,
      });
    } catch {
      // Si falla el resumen, no se bloquea el listado.
    }
  }

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

      const idCliente = idClienteFiltro.trim()
        ? Number(idClienteFiltro)
        : null;

      const idComerciante = idComercianteFiltro.trim()
        ? Number(idComercianteFiltro)
        : null;

      const data = await filtrarCotizaciones({
        estado: nuevoEstado,
        idCliente:
          idCliente !== null && !Number.isNaN(idCliente) ? idCliente : null,
        idComerciante:
          idComerciante !== null && !Number.isNaN(idComerciante)
            ? idComerciante
            : null,
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
          : "No se pudieron cargar las cotizaciones.";

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
            from: "/admin/cotizaciones/todas",
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

  async function handleAplicarFiltros() {
    setPagina(0);
    await cargarCotizaciones(0, estadoFiltro);
  }

  async function handleActualizar() {
    await cargarCotizaciones(pagina, estadoFiltro);
    await cargarResumen();
  }

  if (cargando) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f5f2]">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Cargando cotizaciones...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-8 py-8">
      <section className="mx-auto max-w-7xl">
        <Link
          to="/admin/cotizaciones"
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>

        <section className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
              Gestión general
            </p>

            <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
              Todas las cotizaciones
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Revisa todas las solicitudes, abre el detalle y atiende una
              cotización enviando una contrapropuesta. Al enviar la primera
              contrapropuesta, el backend debe asociarla al comerciante actual.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleActualizar()}
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

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {resumen.total || totalElementos}
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

            <p className="mt-2 text-3xl font-extrabold text-emerald-600">
              {resumen.cerradas}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Rechazadas
            </p>

            <p className="mt-2 text-3xl font-extrabold text-red-500">
              {resumen.rechazadas}
            </p>
          </article>
        </section>

        <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Estado
              </label>

              <select
                value={estadoFiltro}
                onChange={(event) =>
                  handleCambiarEstado(
                    event.target.value as EstadoCotizacion | ""
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none focus:border-[#087f99]"
              >
                <option value="">Todas</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="CONTRAPROPUESTA">Con contrapropuesta</option>
                <option value="CERRADA">Cerradas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                ID cliente
              </label>

              <input
                type="number"
                min={1}
                value={idClienteFiltro}
                onChange={(event) => setIdClienteFiltro(event.target.value)}
                placeholder="Opcional"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#087f99]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                ID comerciante
              </label>

              <input
                type="number"
                min={1}
                value={idComercianteFiltro}
                onChange={(event) =>
                  setIdComercianteFiltro(event.target.value)
                }
                placeholder="Opcional"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#087f99]"
              />
            </div>

            <Button
              type="button"
              onClick={() => void handleAplicarFiltros()}
              className="h-11 rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86]"
            >
              Aplicar filtros
            </Button>
          </div>
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
              No hay cotizaciones para mostrar
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Cambia los filtros o actualiza el listado.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-5 xl:grid-cols-2">
              {cotizaciones.map((cotizacion) => (
                <article
                  key={cotizacion.idCotizacion}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bd2d73]">
                        Cotización #{cotizacion.idCotizacion}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {formatearFecha(cotizacion.fechaCreacion)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${claseEstado(
                        cotizacion.estado
                      )}`}
                    >
                      {etiquetaEstado(cotizacion.estado)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-1 text-sm font-extrabold text-slate-800">
                        #{cotizacion.idCliente}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Producto
                      </p>

                      <p className="mt-1 text-sm font-extrabold text-slate-800">
                        #{cotizacion.idProducto}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Comerciante
                      </p>

                      <p className="mt-1 text-sm font-extrabold text-slate-800">
                        {cotizacion.idComerciante
                          ? `#${cotizacion.idComerciante}`
                          : "Sin asignar"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Sustento
                    </p>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {cotizacion.sustento || "Sin sustento registrado."}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Precio unit.
                      </p>

                      <p className="mt-1 text-base font-extrabold text-slate-800">
                        {formatearPrecio(cotizacion.precioSugerido)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Total solicitado
                      </p>

                      <p className="mt-1 text-xl font-extrabold text-[#bd2d73]">
                        {formatearPrecio(cotizacion.montoSugerido)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Monto real
                      </p>

                      <p
                        className={`mt-1 text-base font-extrabold ${
                          cotizacion.montoReal != null
                            ? "text-[#087f99]"
                            : "text-slate-400"
                        }`}
                      >
                        {obtenerMontoRealTexto(cotizacion)}
                      </p>
                    </div>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    className="mt-5 h-11 w-full rounded-xl border-[#087f99] font-bold text-[#087f99] hover:bg-cyan-50"
                  >
                    <Link
                      to={`/admin/cotizaciones/${cotizacion.idCotizacion}`}
                    >
                      <Eye size={16} />
                      Ver e interactuar
                    </Link>
                  </Button>
                </article>
              ))}
            </section>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={pagina === 0 || recargando}
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
                disabled={pagina + 1 >= totalPaginas || recargando}
                onClick={() => void cargarCotizaciones(pagina + 1, estadoFiltro)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#087f99] hover:text-[#087f99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}