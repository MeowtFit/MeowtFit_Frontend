import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, FileText, Minus, Plus, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buscarProductoPorId,
  type Producto,
  type VarianteProducto,
} from "@/api/catalogoApi";

import {
  actualizarLineaCarrito,
  crearLineaCarrito,
  listarLineasPorCarrito,
  obtenerOCrearCarritoActivo,
} from "@/api/carritoApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const imagenFallback =
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=900&auto=format&fit=crop";

type VarianteConColor = VarianteProducto & {
  idColor?: number | null;
  nombreColor?: string | null;
  hexadecimal?: string | null;
  codigoHex?: string | null;
  hex?: string | null;
  imagenUrl?: string | null;
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

type ColorDisponible = {
  clave: string;
  nombre: string;
  hex: string;
};

function normalizarImagen(imagenUrl?: string | null) {
  if (!imagenUrl) return imagenFallback;
  if (imagenUrl.startsWith("http")) return imagenUrl;
  if (imagenUrl.startsWith("/")) return `${API_BASE_URL}${imagenUrl}`;
  return imagenUrl;
}

function formatearPrecio(precio: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(precio);
}

function obtenerColorVisualPorNombre(color: string) {
  const colorNormalizado = color.trim().toLowerCase();

  const colores: Record<string, string> = {
    blanco: "#f8fafc",
    negro: "#111827",
    beige: "#d6b892",
    rosa: "#f9a8d4",
    "rosa pastel": "#fbcfe8",
    rojo: "#dc2626",
    "rojo vino": "#7f1d1d",
    verde: "#16a34a",
    "verde olivo": "#708238",
    azul: "#2563eb",
    "azul clásico": "#1d4ed8",
    turquesa: "#0f9aaa",
    amarillo: "#facc15",
    marrón: "#92400e",
    gris: "#9ca3af",
  };

  return colores[colorNormalizado] ?? "#d1d5db";
}

function obtenerIdColor(variante?: VarianteProducto | null) {
  if (!variante) return null;

  const v = variante as VarianteConColor;

  if (typeof v.idColor === "number") {
    return v.idColor;
  }

  if (typeof v.color === "object" && v.color?.idColor) {
    return v.color.idColor;
  }

  return null;
}

function obtenerNombreColor(variante?: VarianteProducto | null) {
  if (!variante) return "Sin color";

  const v = variante as VarianteConColor;

  if (typeof v.color === "string") {
    return v.color;
  }

  if (typeof v.color === "object" && v.color) {
    return (
      v.color.nombre ??
      v.color.nombreColor ??
      v.nombreColor ??
      "Sin color"
    );
  }

  return v.nombreColor ?? "Sin color";
}

function obtenerHexColor(variante?: VarianteProducto | null) {
  if (!variante) return "#d1d5db";

  const v = variante as VarianteConColor;

  if (typeof v.color === "object" && v.color) {
    const hex =
      v.color.hexadecimal ??
      v.color.codigoHex ??
      v.color.hex ??
      v.hexadecimal ??
      v.codigoHex ??
      v.hex;

    if (hex) return hex;
  }

  const hex = v.hexadecimal ?? v.codigoHex ?? v.hex;

  if (hex) return hex;

  return obtenerColorVisualPorNombre(obtenerNombreColor(variante));
}

function obtenerClaveColor(variante?: VarianteProducto | null) {
  if (!variante) return "sin-color";

  const idColor = obtenerIdColor(variante);

  if (idColor) {
    return `color-${idColor}`;
  }

  return obtenerNombreColor(variante).trim().toLowerCase();
}

function stockReal(variante?: VarianteProducto | null) {
  if (!variante) return 0;

  return Math.max(
    (variante.stockDisponible ?? 0) - (variante.stockReservado ?? 0),
    0
  );
}

function varianteTieneStock(variante?: VarianteProducto | null) {
  return stockReal(variante) > 0;
}

function obtenerColores(variantes: VarianteProducto[]) {
  const mapa = new Map<string, ColorDisponible>();

  variantes.forEach((variante) => {
    const clave = obtenerClaveColor(variante);

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        nombre: obtenerNombreColor(variante),
        hex: obtenerHexColor(variante),
      });
    }
  });

  return Array.from(mapa.values());
}

function obtenerVariantesPorColor(
  variantes: VarianteProducto[],
  claveColorSeleccionado: string
) {
  return variantes.filter(
    (variante) => obtenerClaveColor(variante) === claveColorSeleccionado
  );
}

function colorTieneStock(
  variantes: VarianteProducto[],
  claveColorSeleccionado: string
) {
  return variantes.some(
    (variante) =>
      obtenerClaveColor(variante) === claveColorSeleccionado &&
      varianteTieneStock(variante)
  );
}

function obtenerImagenVariante(variante?: VarianteProducto | null) {
  if (!variante) return null;

  const v = variante as VarianteConColor;

  return v.imagenUrl ?? null;
}

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

export default function CatalogoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const idProducto = Number(id);

  const [producto, setProducto] = useState<Producto | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState("");
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [cantidad, setCantidad] = useState(1);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [agregandoCarrito, setAgregandoCarrito] = useState(false);
  const [mensajeCarrito, setMensajeCarrito] = useState<string | null>(null);

  useEffect(() => {
    async function cargarProducto() {
      if (!idProducto || Number.isNaN(idProducto)) {
        setError("El producto seleccionado no es válido.");
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError(null);

        const data = await buscarProductoPorId(idProducto);

        setProducto(data);

        const primeraVarianteConStock = data.variantes.find((variante) =>
          varianteTieneStock(variante)
        );

        if (primeraVarianteConStock) {
          setColorSeleccionado(obtenerClaveColor(primeraVarianteConStock));
          setTallaSeleccionada(primeraVarianteConStock.talla);
        } else {
          setColorSeleccionado("");
          setTallaSeleccionada("");
        }

        setCantidad(1);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo cargar el producto.";

        setError(message);
      } finally {
        setCargando(false);
      }
    }

    void cargarProducto();
  }, [idProducto]);

  const coloresDisponibles = useMemo(() => {
    if (!producto) return [];

    return obtenerColores(producto.variantes);
  }, [producto]);

  const colorSeleccionadoInfo = useMemo(() => {
    return (
      coloresDisponibles.find((color) => color.clave === colorSeleccionado) ??
      null
    );
  }, [coloresDisponibles, colorSeleccionado]);

  const variantesDelColor = useMemo(() => {
    if (!producto || !colorSeleccionado) return [];

    return obtenerVariantesPorColor(producto.variantes, colorSeleccionado);
  }, [producto, colorSeleccionado]);

  const varianteSeleccionada = useMemo(() => {
    if (!producto) return null;

    return (
      producto.variantes.find(
        (variante) =>
          obtenerClaveColor(variante) === colorSeleccionado &&
          variante.talla === tallaSeleccionada
      ) ?? null
    );
  }, [producto, colorSeleccionado, tallaSeleccionada]);

  const stockDisponible = stockReal(varianteSeleccionada);

  const productoSinStock = producto
    ? !producto.variantes.some((variante) => varianteTieneStock(variante))
    : true;

  const imagenPrincipal = normalizarImagen(
    obtenerImagenVariante(varianteSeleccionada) ?? producto?.imagenUrl
  );

  const subtotalReferencial = producto
    ? Number(producto.precioBase) * cantidad
    : 0;

  function redirigirALogin() {
    navigate("/login", {
      replace: false,
      state: {
        from: location.pathname,
      },
    });
  }

  function handleSeleccionarColor(claveColor: string) {
    if (!producto) return;

    if (!colorTieneStock(producto.variantes, claveColor)) {
      return;
    }

    const primeraVarianteDisponible = producto.variantes.find(
      (variante) =>
        obtenerClaveColor(variante) === claveColor &&
        varianteTieneStock(variante)
    );

    if (!primeraVarianteDisponible) return;

    setColorSeleccionado(claveColor);
    setTallaSeleccionada(primeraVarianteDisponible.talla);
    setCantidad(1);
    setMensajeCarrito(null);
  }

  function handleSeleccionarTalla(variante: VarianteProducto) {
    if (!varianteTieneStock(variante)) {
      return;
    }

    setTallaSeleccionada(variante.talla);
    setCantidad(1);
    setMensajeCarrito(null);
  }

  function aumentarCantidad() {
    setCantidad((actual) => Math.min(actual + 1, stockDisponible));
  }

  function disminuirCantidad() {
    setCantidad((actual) => Math.max(actual - 1, 1));
  }

  function irACrearCotizacion() {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      redirigirALogin();
      return;
    }

    if (sesion.rol !== "CLIENTE") {
      setMensajeCarrito("Solo los clientes pueden solicitar cotizaciones.");
      return;
    }

    if (!producto || !varianteSeleccionada) {
      setMensajeCarrito("Selecciona una talla y color disponibles.");
      return;
    }

    if (cantidad <= 0) {
      setMensajeCarrito("La cantidad debe ser mayor a cero.");
      return;
    }

    navigate("/cotizaciones/crear", {
      state: {
        idProducto: producto.idProducto,
        idVariante: varianteSeleccionada.idVariante,
        idColor: obtenerIdColor(varianteSeleccionada),
        productoNombre: producto.nombre,
        categoria: producto.categoria?.nombre ?? null,
        talla: varianteSeleccionada.talla,
        color: obtenerNombreColor(varianteSeleccionada),
        cantidad,
        precioUnitario: Number(producto.precioBase),
        subtotalReferencial,
      },
    });
  }

  async function handleAgregarAlCarrito() {
    const sesion = obtenerSesionUsuario();

    if (!sesion.estaLogeado) {
      redirigirALogin();
      return;
    }

    if (sesion.rol !== "CLIENTE") {
      setMensajeCarrito("Solo los clientes pueden agregar productos al carrito.");
      return;
    }

    if (!producto) {
      setMensajeCarrito("No se pudo identificar el producto.");
      return;
    }

    if (!varianteSeleccionada) {
      setMensajeCarrito("Selecciona una talla y color disponibles.");
      return;
    }

    if (stockDisponible <= 0) {
      setMensajeCarrito("Esta variante no tiene stock disponible.");
      return;
    }

    if (cantidad <= 0) {
      setMensajeCarrito("La cantidad debe ser mayor a cero.");
      return;
    }

    if (cantidad > stockDisponible) {
      setMensajeCarrito(`Solo hay ${stockDisponible} unidades disponibles.`);
      return;
    }

    try {
      setAgregandoCarrito(true);
      setMensajeCarrito(null);

      const carrito = await obtenerOCrearCarritoActivo();
      const lineas = await listarLineasPorCarrito(carrito.idCarrito);

      const lineaExistente = lineas.find(
        (linea) => linea.idVariante === varianteSeleccionada.idVariante
      );

      const precioUnitario = Number(producto.precioBase);

      if (lineaExistente) {
        const nuevaCantidad = lineaExistente.cantidad + cantidad;

        if (nuevaCantidad > stockDisponible) {
          setMensajeCarrito(
            `Ya tienes ${lineaExistente.cantidad} unidad(es) en el carrito. Solo hay ${stockDisponible} disponible(s).`
          );
          return;
        }

        await actualizarLineaCarrito(lineaExistente.idLineaCarrito, {
          cantidad: nuevaCantidad,
          precioUnitario,
          subtotal: precioUnitario * nuevaCantidad,
          idCarrito: carrito.idCarrito,
          idVariante: varianteSeleccionada.idVariante,
        });
      } else {
        await crearLineaCarrito({
          cantidad,
          precioUnitario,
          subtotal: precioUnitario * cantidad,
          idCarrito: carrito.idCarrito,
          idVariante: varianteSeleccionada.idVariante,
        });
      }

      setMensajeCarrito("Producto agregado al carrito correctamente.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo agregar el producto al carrito.";

      const debeIrALogin =
        message.includes("401") ||
        message.includes("403") ||
        message.toLowerCase().includes("unauthorized") ||
        message.toLowerCase().includes("forbidden");

      if (debeIrALogin) {
        limpiarSesionLocal();
        redirigirALogin();
        return;
      }

      setMensajeCarrito(message);
    } finally {
      setAgregandoCarrito(false);
    }
  }

  if (cargando) {
    return (
      <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc]">
        <p className="text-sm font-medium text-slate-500">
          Cargando producto...
        </p>
      </main>
    );
  }

  if (error || !producto) {
    return (
      <main className="grid min-h-[calc(100vh-66px)] place-items-center bg-[#f7fafc] px-6">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">
            No se pudo mostrar el producto
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {error ?? "Producto no encontrado."}
          </p>

          <Button asChild className="mt-6 bg-[#087f99] hover:bg-[#076f86]">
            <Link to="/">Volver al catálogo</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-66px)] bg-[#f7fafc] px-6 py-8 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
        >
          <ChevronLeft size={16} />
          Volver al catálogo
        </Link>

        <section className="grid gap-10 rounded-2xl bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="overflow-hidden rounded-xl bg-[#d4b390]">
              <img
                src={imagenPrincipal}
                alt={producto.nombre}
                className="h-[620px] w-full object-cover"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              {[producto.imagenUrl, obtenerImagenVariante(varianteSeleccionada)]
                .filter(Boolean)
                .map((imagen, index) => (
                  <div
                    key={`${imagen}-${index}`}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      src={normalizarImagen(imagen)}
                      alt={`${producto.nombre} ${index + 1}`}
                      className="h-28 w-full object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>

          <aside className="flex flex-col justify-start px-1 py-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd2d73]">
                {producto.categoria?.nombre ?? "Producto"}
              </p>

              <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
                {producto.nombre}
              </h1>

              <p className="mt-2 text-2xl font-extrabold text-[#bd2d73]">
                {formatearPrecio(Number(producto.precioBase))}
              </p>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-6 text-slate-500">
              {producto.descripcion ??
                "Producto de temporada diseñado para combinar estilo y comodidad."}
            </p>

            {productoSinStock && (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Este producto está agotado actualmente.
              </div>
            )}

            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Color:{" "}
                <span className="text-slate-800">
                  {colorSeleccionadoInfo?.nombre ?? "Sin stock"}
                </span>
              </p>

              <div className="flex flex-wrap gap-3">
                {coloresDisponibles.map((color) => {
                  const sinStock = !colorTieneStock(
                    producto.variantes,
                    color.clave
                  );

                  return (
                    <button
                      key={color.clave}
                      type="button"
                      disabled={sinStock}
                      onClick={() => handleSeleccionarColor(color.clave)}
                      title={sinStock ? `${color.nombre} sin stock` : color.nombre}
                      className={`grid h-10 w-10 place-items-center rounded-full border transition ${colorSeleccionado === color.clave
                        ? "border-[#bd2d73] ring-2 ring-[#bd2d73]/30"
                        : "border-slate-200"
                        } ${sinStock
                          ? "cursor-not-allowed opacity-35"
                          : "hover:border-[#bd2d73]"
                        }`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-slate-200"
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Talla
                </p>

                <button
                  type="button"
                  className="text-xs font-semibold text-slate-400 hover:text-[#087f99]"
                >
                  Guía de tallas
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {variantesDelColor.map((variante) => {
                  const stock = stockReal(variante);
                  const sinStock = stock <= 0;

                  return (
                    <button
                      key={variante.idVariante}
                      type="button"
                      disabled={sinStock}
                      onClick={() => handleSeleccionarTalla(variante)}
                      className={`h-12 rounded-xl border text-sm font-semibold transition ${tallaSeleccionada === variante.talla
                        ? "border-[#bd2d73] bg-pink-50 text-[#bd2d73]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#bd2d73]"
                        } ${sinStock
                          ? "cursor-not-allowed opacity-40 line-through hover:border-slate-200"
                          : ""
                        }`}
                    >
                      {variante.talla}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                Stock disponible:{" "}
                <span className="text-[#087f99]">{stockDisponible}</span>
              </p>

              {varianteSeleccionada && (
                <p className="mt-1 text-xs text-slate-500">
                  Variante seleccionada:{" "}
                  {obtenerNombreColor(varianteSeleccionada)} /{" "}
                  {varianteSeleccionada.talla}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={disminuirCantidad}
                  disabled={productoSinStock}
                  className="grid h-12 w-12 place-items-center text-slate-500 hover:text-[#087f99] disabled:opacity-40"
                >
                  <Minus size={15} />
                </button>

                <span className="w-10 text-center text-sm font-bold">
                  {productoSinStock ? 0 : cantidad}
                </span>

                <button
                  type="button"
                  onClick={aumentarCantidad}
                  disabled={productoSinStock || cantidad >= stockDisponible}
                  className="grid h-12 w-12 place-items-center text-slate-500 hover:text-[#087f99] disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>
              </div>

              <Button
                type="button"
                onClick={() => void handleAgregarAlCarrito()}
                disabled={
                  agregandoCarrito ||
                  productoSinStock ||
                  !varianteSeleccionada ||
                  stockDisponible <= 0
                }
                className="h-12 flex-1 rounded-xl bg-[#087f99] text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#076f86]"
              >
                {agregandoCarrito
                  ? "Agregando..."
                  : productoSinStock
                    ? "Producto agotado"
                    : "Agregar al carrito"}
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate("/cotizaciones/crear", {
                  state: {
                    idProducto: producto.idProducto,
                    idVariante: varianteSeleccionada?.idVariante ?? null,
                    productoNombre: producto.nombre,
                    categoria: producto.categoria?.nombre ?? null,
                    talla: varianteSeleccionada?.talla ?? null,
                    color: varianteSeleccionada
                      ? obtenerNombreColor(varianteSeleccionada)
                      : null,
                    cantidad,
                    precioUnitario: Number(producto.precioBase),
                  },
                })
              }
              disabled={!producto}
              className="mt-4 h-12 w-full rounded-xl border-[#bd2d73] text-xs font-bold uppercase tracking-[0.18em] text-[#bd2d73] hover:bg-pink-50"
            >
              Solicitar cotización
            </Button>

            {mensajeCarrito && (
              <p
                className={`mt-3 text-sm font-semibold ${mensajeCarrito.includes("correctamente")
                  ? "text-emerald-600"
                  : "text-red-600"
                  }`}
              >
                {mensajeCarrito}
              </p>
            )}

            <div className="mt-8 space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Truck size={17} className="text-[#087f99]" />
                Envío express en 24 h a todo Lima
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="grid h-[17px] w-[17px] place-items-center rounded-full border border-[#087f99] text-[10px] text-[#087f99]">
                  ✓
                </span>
                Sostenibilidad garantizada local
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}