import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { crearCotizacion } from "@/api/cotizacionesApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MINIMO_UNIDADES_COTIZACION = 1000;

type CotizacionLocationState = {
  idProducto?: number | null;
  idVariante?: number | null;

  productoNombre?: string | null;
  categoria?: string | null;
  talla?: string | null;
  color?: string | null;

  cantidad?: number | null;
  precioUnitario?: number | null;
};

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
  idProducto: number;
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

type VarianteAgregada = {
  idVariante: number;
  talla: string;
  idColor: number | null;
  colorNombre: string;
  stockDisponible: number;
  stockReservado: number;
  cantidad: number;
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

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(precio);
}

function numeroSeguro(valor: unknown, fallback = 0) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : fallback;
}

function stockReal(variante: VarianteProductoDTO | VarianteAgregada) {
  return Math.max(
    (variante.stockDisponible ?? 0) - (variante.stockReservado ?? 0),
    0
  );
}

function obtenerIdColor(variante: VarianteProductoDTO): number | null {
  if (typeof variante.idColor === "number") {
    return variante.idColor;
  }

  if (typeof variante.color === "object" && variante.color?.idColor) {
    return variante.color.idColor;
  }

  return null;
}

function obtenerNombreColor(variante: VarianteProductoDTO): string {
  if (typeof variante.color === "string") {
    return variante.color;
  }

  if (typeof variante.color === "object" && variante.color) {
    return (
      variante.color.nombre ??
      variante.color.nombreColor ??
      variante.nombreColor ??
      "Sin color"
    );
  }

  return variante.nombreColor ?? "Sin color";
}

async function requestCatalogo<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar la información del producto.");
  }

  return response.json() as Promise<T>;
}

async function buscarProductoPorId(idProducto: number) {
  return requestCatalogo<ProductoDTO>(`/api/productos/${idProducto}`);
}

async function obtenerVariantesPorProducto(idProducto: number) {
  return requestCatalogo<VarianteProductoDTO[]>(
    `/api/variantes/producto/${idProducto}`
  );
}

export default function CotizacionCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state ?? {}) as CotizacionLocationState;

  const idProductoInicial = state.idProducto ?? null;
  const idVarianteInicial = state.idVariante ?? null;

  const [producto, setProducto] = useState<ProductoDTO | null>(null);
  const [variantesDisponibles, setVariantesDisponibles] = useState<
    VarianteProductoDTO[]
  >([]);

  const [cargandoProducto, setCargandoProducto] = useState(true);

  const [idProducto, setIdProducto] = useState(
    idProductoInicial ? String(idProductoInicial) : ""
  );

  const [precioSugerido, setPrecioSugerido] = useState(
    state.precioUnitario ? String(state.precioUnitario) : ""
  );

  const [montoSugerido, setMontoSugerido] = useState("");
  const [sustento, setSustento] = useState("");

  const [idVarianteSeleccionada, setIdVarianteSeleccionada] = useState("");
  const [cantidadVariante, setCantidadVariante] = useState(
    state.cantidad ? String(state.cantidad) : "1"
  );

  const [variantesAgregadas, setVariantesAgregadas] = useState<
    VarianteAgregada[]
  >([]);

  const [errorVariante, setErrorVariante] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [idCotizacionCreada, setIdCotizacionCreada] = useState<number | null>(
    null
  );

  useEffect(() => {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: true,
        state: {
          from: "/cotizaciones/crear",
        },
      });

      return;
    }

    if (sesion.rol !== "CLIENTE") {
      navigate("/", { replace: true });
      return;
    }

    if (!idProductoInicial) {
      setCargandoProducto(false);
      setError(
        "No se pudo identificar el producto. Crea la cotización desde el detalle de un producto."
      );
      return;
    }

    void cargarProductoYVariantes(idProductoInicial);
  }, [idProductoInicial, navigate]);

  async function cargarProductoYVariantes(idProductoNumber: number) {
    try {
      setCargandoProducto(true);
      setError(null);

      const [productoData, variantesData] = await Promise.all([
        buscarProductoPorId(idProductoNumber),
        obtenerVariantesPorProducto(idProductoNumber),
      ]);

      setProducto(productoData);
      setVariantesDisponibles(variantesData);

      const precioBase = Number(productoData.precioBase ?? 0);

      if (!precioSugerido && precioBase > 0) {
        setPrecioSugerido(String(precioBase));
      }

      const varianteInicial = variantesData.find(
        (variante) => variante.idVariante === idVarianteInicial
      );

      if (varianteInicial) {
        const cantidadInicial = Math.max(numeroSeguro(state.cantidad, 1), 1);

        const varianteAgregada: VarianteAgregada = {
          idVariante: varianteInicial.idVariante,
          talla: varianteInicial.talla,
          idColor: obtenerIdColor(varianteInicial),
          colorNombre: obtenerNombreColor(varianteInicial),
          stockDisponible: varianteInicial.stockDisponible ?? 0,
          stockReservado: varianteInicial.stockReservado ?? 0,
          cantidad: cantidadInicial,
        };

        const nuevasVariantes = [varianteAgregada];

        setVariantesAgregadas(nuevasVariantes);

        const precio = numeroSeguro(precioSugerido || precioBase, 0);

        if (precio > 0) {
          setMontoSugerido(String(precio * cantidadInicial));
        }
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo cargar el producto.";

      setError(message);
    } finally {
      setCargandoProducto(false);
    }
  }

  const variantesNoAgregadas = useMemo(() => {
    const idsAgregados = new Set(
      variantesAgregadas.map((variante) => variante.idVariante)
    );

    return variantesDisponibles.filter(
      (variante) => !idsAgregados.has(variante.idVariante)
    );
  }, [variantesDisponibles, variantesAgregadas]);

  const totalUnidades = useMemo(() => {
    return variantesAgregadas.reduce(
      (total, variante) => total + variante.cantidad,
      0
    );
  }, [variantesAgregadas]);

  const unidadesFaltantes = Math.max(
    MINIMO_UNIDADES_COTIZACION - totalUnidades,
    0
  );

  const cumpleMinimoUnidades = totalUnidades >= MINIMO_UNIDADES_COTIZACION;

  const montoCalculado = useMemo(() => {
    const precio = numeroSeguro(precioSugerido, 0);

    return totalUnidades * precio;
  }, [precioSugerido, totalUnidades]);

  function recalcularMonto(nuevasVariantes: VarianteAgregada[], precio: string) {
    const precioNumber = numeroSeguro(precio, 0);

    const unidades = nuevasVariantes.reduce(
      (total, variante) => total + variante.cantidad,
      0
    );

    if (precioNumber > 0 && unidades > 0) {
      setMontoSugerido(String(precioNumber * unidades));
      return;
    }

    setMontoSugerido("");
  }

  function handleCambiarPrecio(valor: string) {
    setPrecioSugerido(valor);
    recalcularMonto(variantesAgregadas, valor);
    setError(null);
  }

  function handleAgregarVariante() {
    setErrorVariante(null);
    setError(null);

    if (!idVarianteSeleccionada) {
      setErrorVariante("Selecciona una variante.");
      return;
    }

    const variante = variantesDisponibles.find(
      (item) => item.idVariante === Number(idVarianteSeleccionada)
    );

    if (!variante) {
      setErrorVariante("La variante seleccionada no es válida.");
      return;
    }

    const cantidad = Number(cantidadVariante);

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      setErrorVariante("Ingresa una cantidad válida.");
      return;
    }

    const yaExiste = variantesAgregadas.some(
      (item) => item.idVariante === variante.idVariante
    );

    if (yaExiste) {
      setErrorVariante("Esta variante ya fue agregada a la cotización.");
      return;
    }

    const nuevasVariantes: VarianteAgregada[] = [
      ...variantesAgregadas,
      {
        idVariante: variante.idVariante,
        talla: variante.talla,
        idColor: obtenerIdColor(variante),
        colorNombre: obtenerNombreColor(variante),
        stockDisponible: variante.stockDisponible ?? 0,
        stockReservado: variante.stockReservado ?? 0,
        cantidad,
      },
    ];

    setVariantesAgregadas(nuevasVariantes);
    setIdVarianteSeleccionada("");
    setCantidadVariante("1");
    recalcularMonto(nuevasVariantes, precioSugerido);
  }

  function handleEliminarVariante(idVariante: number) {
    const nuevasVariantes = variantesAgregadas.filter(
      (variante) => variante.idVariante !== idVariante
    );

    setVariantesAgregadas(nuevasVariantes);
    recalcularMonto(nuevasVariantes, precioSugerido);
    setErrorVariante(null);
    setError(null);
  }

  function handleCambiarCantidadAgregada(idVariante: number, valor: string) {
    const cantidad = Number(valor);

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      return;
    }

    const nuevasVariantes = variantesAgregadas.map((variante) => {
      if (variante.idVariante !== idVariante) {
        return variante;
      }

      return {
        ...variante,
        cantidad,
      };
    });

    setVariantesAgregadas(nuevasVariantes);
    recalcularMonto(nuevasVariantes, precioSugerido);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      navigate("/login", {
        replace: false,
        state: {
          from: "/cotizaciones/crear",
        },
      });

      return;
    }

    if (sesion.rol !== "CLIENTE") {
      setError("Solo los clientes pueden crear cotizaciones.");
      return;
    }

    const idProductoNumber = Number(idProducto);
    const precioNumber = Number(precioSugerido);
    const montoNumber = Number(montoSugerido);

    if (
      !idProducto.trim() ||
      Number.isNaN(idProductoNumber) ||
      idProductoNumber <= 0
    ) {
      setError("No se pudo identificar el producto.");
      return;
    }

    if (
      !precioSugerido.trim() ||
      Number.isNaN(precioNumber) ||
      precioNumber <= 0
    ) {
      setError("Ingresa un precio sugerido unitario válido.");
      return;
    }

    if (
      !montoSugerido.trim() ||
      Number.isNaN(montoNumber) ||
      montoNumber <= 0
    ) {
      setError("Ingresa un monto sugerido total válido.");
      return;
    }

    if (variantesAgregadas.length === 0) {
      setError("Debes agregar al menos una variante a la cotización.");
      return;
    }

    if (!cumpleMinimoUnidades) {
      setError(
        `Para solicitar una cotización debes sumar al menos ${MINIMO_UNIDADES_COTIZACION} unidades entre todas las variantes. Te faltan ${unidadesFaltantes} unidades.`
      );
      return;
    }

    try {
      setGuardando(true);
      setError(null);
      setExito(null);

      const cotizacion = await crearCotizacion({
        idProducto: idProductoNumber,
        precioSugerido: precioNumber,
        montoSugerido: montoNumber,
        sustento: sustento.trim() || null,
        lineas: variantesAgregadas.map((variante) => ({
  idVariante: variante.idVariante,
  cantidad: variante.cantidad,
})),
      });

      setIdCotizacionCreada(cotizacion.idCotizacion);
      setExito(`Cotización creada correctamente. N.° ${cotizacion.idCotizacion}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo crear la cotización.";

      const debeIrALogin =
        message.includes("401") ||
        message.includes("403") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("forbidden");

      if (debeIrALogin) {
        limpiarSesionLocal();

        navigate("/login", {
          replace: false,
          state: {
            from: "/cotizaciones/crear",
          },
        });

        return;
      }

      setError(message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargandoProducto) {
    return (
      <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc]">
        <p className="text-sm font-medium text-slate-500">
          Cargando producto...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-66px)] bg-[#f7fafc] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
        >
          <ArrowLeft size={16} />
          Volver al catálogo
        </Link>

        <section className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-8 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
              Nueva cotización
            </p>

            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
              Crear solicitud de cotización
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Esta cotización está asociada a un único producto, pero puedes
              agregar varias variantes de talla y color. Para enviarla, debes
              sumar al menos 1000 unidades entre todas las variantes.
            </p>

            <div className="mt-6 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-4">
              <p className="text-sm font-bold text-[#087f99]">
                Mínimo requerido: {MINIMO_UNIDADES_COTIZACION} unidades
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Actualmente llevas{" "}
                <span className="font-bold">{totalUnidades}</span> unidades.
                {!cumpleMinimoUnidades && (
                  <>
                    {" "}
                    Te faltan{" "}
                    <span className="font-bold text-[#bd2d73]">
                      {unidadesFaltantes}
                    </span>{" "}
                    unidades para solicitar la cotización.
                  </>
                )}
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  ID producto
                </label>

                <input
                  type="number"
                  min={1}
                  value={idProducto}
                  disabled
                  className="mt-2 h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm text-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Precio sugerido unitario
                </label>

                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={precioSugerido}
                  onChange={(event) => handleCambiarPrecio(event.target.value)}
                  placeholder="Ej. 30.00"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#087f99]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Monto sugerido total
                </label>

                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={montoSugerido}
                  onChange={(event) => {
                    setMontoSugerido(event.target.value);
                    setError(null);
                  }}
                  placeholder="Ej. 30000.00"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#087f99]"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Calculado: {formatearPrecio(montoCalculado)}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Sustento
                </label>

                <textarea
                  value={sustento}
                  onChange={(event) => {
                    setSustento(event.target.value);
                    setError(null);
                  }}
                  placeholder="Ej. Solicito precio mayorista por compra de alto volumen..."
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#087f99]"
                />
              </div>
            </div>

            <div className="my-8 h-[3px] w-full bg-[#bd2d73]" />

            <h2 className="text-xl font-extrabold text-slate-900">
              Variantes solicitadas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Agrega las tallas y colores que quieres incluir. El stock solo se
              muestra como referencia, pero no limita la cotización.
            </p>

            <div className="mt-5 grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-[1fr_140px_auto]">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Variante
                </label>

                <select
                  value={idVarianteSeleccionada}
                  onChange={(event) => {
                    setIdVarianteSeleccionada(event.target.value);
                    setErrorVariante(null);
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#087f99]"
                >
                  <option value="">Selecciona una variante</option>

                  {variantesNoAgregadas.map((variante) => (
                    <option
                      key={variante.idVariante}
                      value={variante.idVariante}
                    >
                      {obtenerNombreColor(variante)} / {variante.talla} — stock
                      actual {stockReal(variante)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Cantidad
                </label>

                <input
                  type="number"
                  min={1}
                  value={cantidadVariante}
                  onChange={(event) => {
                    setCantidadVariante(event.target.value);
                    setErrorVariante(null);
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-[#087f99]"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleAgregarVariante}
                  className="h-12 rounded-xl bg-[#087f99] px-5 font-bold text-white hover:bg-[#076f86]"
                >
                  <Plus size={17} />
                  Agregar
                </Button>
              </div>

              {errorVariante && (
                <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 md:col-span-3">
                  <AlertCircle size={16} />
                  {errorVariante}
                </p>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              {variantesAgregadas.length === 0 ? (
                <div className="bg-white px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  Todavía no agregaste variantes a la cotización.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Color</th>
                      <th className="px-4 py-3 text-left">Talla</th>
                      <th className="px-4 py-3 text-left">Cantidad</th>
                      <th className="px-4 py-3 text-left">Stock ref.</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {variantesAgregadas.map((variante) => (
                      <tr
                        key={variante.idVariante}
                        className="border-t border-slate-100 bg-white"
                      >
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          {variante.colorNombre}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {variante.talla}
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={variante.cantidad}
                            onChange={(event) =>
                              handleCambiarCantidadAgregada(
                                variante.idVariante,
                                event.target.value
                              )
                            }
                            className="h-9 w-28 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#087f99]"
                          />
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {stockReal(variante)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleEliminarVariante(variante.idVariante)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && (
              <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}

            {exito && (
              <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-4">
                <p className="text-sm font-bold text-emerald-600">{exito}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() =>
                      idCotizacionCreada
                        ? navigate(`/cotizaciones/${idCotizacionCreada}`)
                        : navigate("/cotizaciones")
                    }
                    className="h-10 rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86]"
                  >
                    Ver cotización
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/cotizaciones")}
                    className="h-10 rounded-xl"
                  >
                    Ver mis cotizaciones
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="h-12 flex-1 rounded-xl border-slate-200 font-bold text-slate-600"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={guardando || !cumpleMinimoUnidades}
                className="h-12 flex-1 rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {guardando && (
                  <Loader2 size={17} className="mr-2 animate-spin" />
                )}
                {guardando ? "Creando..." : "Crear cotización"}
              </Button>
            </div>
          </form>

          <aside className="h-fit rounded-2xl bg-[#d7edf2] p-7 shadow-sm">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#087f99]">
              <FileText size={24} />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-slate-900">
              Resumen
            </h2>

            {producto ? (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Producto
                  </p>

                  <p className="mt-1 text-base font-bold text-slate-900">
                    {producto.nombre}
                  </p>
                </div>

                {producto.categoria?.nombre && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Categoría
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      {producto.categoria.nombre}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs text-slate-500">Variantes</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {variantesAgregadas.length}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs text-slate-500">Unidades</p>
                    <p
                      className={`mt-1 font-bold ${
                        cumpleMinimoUnidades
                          ? "text-emerald-600"
                          : "text-[#bd2d73]"
                      }`}
                    >
                      {totalUnidades}/{MINIMO_UNIDADES_COTIZACION}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs text-slate-500">Precio sugerido</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatearPrecio(numeroSeguro(precioSugerido, 0))}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs text-slate-500">Precio base</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {formatearPrecio(Number(producto.precioBase))}
                    </p>
                  </div>
                </div>

                <div className="border-t border-cyan-100 pt-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Monto sugerido
                    </span>

                    <span className="text-xl font-extrabold text-[#bd2d73]">
                      {formatearPrecio(numeroSeguro(montoSugerido, 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-600">
                Para crear una cotización correctamente, entra al detalle de un
                producto y presiona “Solicitar cotización”.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}