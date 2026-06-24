import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Minus, Plus, Trash2 } from "lucide-react";

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

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Seleccion {
  idVariante: number;
  colorNombre: string;
  colorHex: string;
  talla: string;
  cantidad: number;
  precioUnitario: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=900&auto=format&fit=crop";

// Mapa de nombres de color → hex para colores conocidos
const MAPA_COLORES: Record<string, string> = {
  blanco: "#f8fafc",
  negro: "#111827",
  beige: "#d6b892",
  crema: "#fef9ef",
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
  "gris oscuro": "#4b5563",
  morado: "#7c3aed",
  naranja: "#ea580c",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizarImagen(url?: string | null): string {
  if (!url) return IMAGEN_FALLBACK;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(precio);
}

function obtenerNombreColor(color: VarianteProducto["color"]): string {
  if (!color) return "Sin color";
  if (typeof color === "string") return color;
  return color.nombre ?? color.nombreColor ?? "Sin color";
}

function obtenerHexColor(color: VarianteProducto["color"]): string {
  if (!color) return "#d1d5db";
  if (typeof color === "object") {
    return (
      color.codigoHex ??
      color.hex ??
      (MAPA_COLORES[obtenerNombreColor(color).toLowerCase()] ?? "#d1d5db")
    );
  }
  return MAPA_COLORES[color.toLowerCase()] ?? "#d1d5db";
}

function obtenerColores(variantes: VarianteProducto[]) {
  const mapa = new Map<string, { nombre: string; hex: string }>();
  variantes.forEach((v) => {
    const nombre = obtenerNombreColor(v.color);
    if (!mapa.has(nombre)) {
      mapa.set(nombre, { nombre, hex: obtenerHexColor(v.color) });
    }
  });
  return Array.from(mapa.values());
}

function stockReal(v?: VarianteProducto | null): number {
  if (!v) return 0;
  return Math.max((v.stockDisponible ?? 0) - (v.stockReservado ?? 0), 0);
}

function varianteTieneStock(v?: VarianteProducto | null): boolean {
  return stockReal(v) > 0;
}

function colorTieneStock(variantes: VarianteProducto[], color: string): boolean {
  return variantes.some(
    (v) => obtenerNombreColor(v.color) === color && varianteTieneStock(v)
  );
}

function obtenerVariantesPorColor(
  variantes: VarianteProducto[],
  color: string
): VarianteProducto[] {
  return variantes.filter((v) => obtenerNombreColor(v.color) === color);
}

function obtenerSesionUsuario() {
  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");
  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");
  return { correo, rol, estaLogeado: Boolean(correo && rol) };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PersonalizarPrenda() {
  const { id } = useParams();
  const navigate = useNavigate();
  const idProducto = Number(id);

  // ── Producto ───────────────────────────────────────────────────────────────
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Selección actual en el selector ─────────────────────────────────────────
  const [colorSeleccionado, setColorSeleccionado] = useState("");
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [cantidad, setCantidad] = useState(1);

  // ── Lista de combinaciones acumuladas ────────────────────────────────────────
  const [selecciones, setSelecciones] = useState<Seleccion[]>([]);

  // ── Botón Aplicar ───────────────────────────────────────────────────────────
  const [aplicando, setAplicando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // ── Carga del producto ──────────────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      if (!idProducto || Number.isNaN(idProducto)) {
        setError("Producto no válido.");
        setCargando(false);
        return;
      }
      try {
        setCargando(true);
        setError(null);
        const data = await buscarProductoPorId(idProducto);
        setProducto(data);

        const primera = data.variantes.find((v) => varianteTieneStock(v));
        if (primera) {
          setColorSeleccionado(obtenerNombreColor(primera.color));
          setTallaSeleccionada(primera.talla);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el producto."
        );
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, [idProducto]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const coloresDisponibles = useMemo(
    () => (producto ? obtenerColores(producto.variantes) : []),
    [producto]
  );

  const variantesDelColor = useMemo(
    () =>
      producto && colorSeleccionado
        ? obtenerVariantesPorColor(producto.variantes, colorSeleccionado)
        : [],
    [producto, colorSeleccionado]
  );

  const varianteSeleccionada = useMemo(
    () =>
      producto?.variantes.find(
        (v) =>
          obtenerNombreColor(v.color) === colorSeleccionado &&
          v.talla === tallaSeleccionada
      ) ?? null,
    [producto, colorSeleccionado, tallaSeleccionada]
  );

  const hexColorActual =
    coloresDisponibles.find((c) => c.nombre === colorSeleccionado)?.hex ??
    null;

  const stockDisponible = stockReal(varianteSeleccionada);

  // Stock restante = stock real menos lo ya acumulado en las selecciones
  const cantidadYaAgregada =
    selecciones.find((s) => s.idVariante === varianteSeleccionada?.idVariante)
      ?.cantidad ?? 0;
  const stockRestante = Math.max(stockDisponible - cantidadYaAgregada, 0);

  // URL normalizada de la imagen (usa la variante activa o la imagen del producto)
  const urlImagen = normalizarImagen(
    varianteSeleccionada?.imagenUrl ?? producto?.imagenUrl
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSeleccionarColor(nombre: string) {
    if (!producto || !colorTieneStock(producto.variantes, nombre)) return;

    const primera = producto.variantes.find(
      (v) => obtenerNombreColor(v.color) === nombre && varianteTieneStock(v)
    );
    if (!primera) return;

    setColorSeleccionado(nombre);
    setTallaSeleccionada(primera.talla);
    setCantidad(1);
    setMensajeError(null);
  }

  function handleSeleccionarTalla(variante: VarianteProducto) {
    if (!varianteTieneStock(variante)) return;
    setTallaSeleccionada(variante.talla);
    setCantidad(1);
    setMensajeError(null);
  }

  function handleAgregarSeleccion() {
    if (!varianteSeleccionada) {
      setMensajeError("Selecciona color y talla con stock disponible.");
      return;
    }
    if (cantidad > stockRestante) {
      setMensajeError(
        `Solo quedan ${stockRestante} unidad(es) disponibles para esta combinación.`
      );
      return;
    }
    if (cantidad <= 0) return;

    const idVariante = varianteSeleccionada.idVariante;

    setSelecciones((prev) => {
      const existe = prev.find((s) => s.idVariante === idVariante);
      if (existe) {
        return prev.map((s) =>
          s.idVariante === idVariante
            ? { ...s, cantidad: s.cantidad + cantidad }
            : s
        );
      }
      return [
        ...prev,
        {
          idVariante,
          colorNombre: colorSeleccionado,
          colorHex: hexColorActual ?? "#d1d5db",
          talla: tallaSeleccionada,
          cantidad,
          precioUnitario: Number(producto?.precioBase ?? 0),
        },
      ];
    });

    setCantidad(1);
    setMensajeError(null);
    setMensajeExito(null);
  }

  function handleEliminarSeleccion(idVariante: number) {
    setSelecciones((prev) => prev.filter((s) => s.idVariante !== idVariante));
  }

  async function handleAplicar() {
    if (selecciones.length === 0) {
      setMensajeError("Añade al menos una combinación antes de aplicar.");
      return;
    }

    const sesion = obtenerSesionUsuario();
    if (!sesion.estaLogeado) {
      navigate("/login", { state: { from: `/personalizar/${idProducto}` } });
      return;
    }
    if (sesion.rol !== "CLIENTE") {
      setMensajeError("Solo los clientes pueden añadir productos al carrito.");
      return;
    }

    try {
      setAplicando(true);
      setMensajeError(null);

      const carrito = await obtenerOCrearCarritoActivo();
      const lineas = await listarLineasPorCarrito(carrito.idCarrito);

      for (const sel of selecciones) {
        const lineaExistente = lineas.find(
          (l) => l.idVariante === sel.idVariante
        );

        if (lineaExistente) {
          const nuevaCantidad = lineaExistente.cantidad + sel.cantidad;
          await actualizarLineaCarrito(lineaExistente.idLineaCarrito, {
            cantidad: nuevaCantidad,
            precioUnitario: sel.precioUnitario,
            subtotal: sel.precioUnitario * nuevaCantidad,
            idCarrito: carrito.idCarrito,
            idVariante: sel.idVariante,
          });
        } else {
          await crearLineaCarrito({
            cantidad: sel.cantidad,
            precioUnitario: sel.precioUnitario,
            subtotal: sel.precioUnitario * sel.cantidad,
            idCarrito: carrito.idCarrito,
            idVariante: sel.idVariante,
          });
        }
      }

      setMensajeExito("¡Selección aplicada! Redirigiendo al carrito...");
      setTimeout(() => navigate("/carrito"), 1000);
    } catch (err) {
      setMensajeError(
        err instanceof Error ? err.message : "Error al aplicar la selección."
      );
    } finally {
      setAplicando(false);
    }
  }

  // ── Loading / Error ────────────────────────────────────────────────────────
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

  const totalUnidades = selecciones.reduce((sum, s) => sum + s.cantidad, 0);
  const totalPrecio = selecciones.reduce(
    (sum, s) => sum + s.cantidad * s.precioUnitario,
    0
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-66px)] bg-[#f7fafc] text-slate-800">
      <main className="mx-auto max-w-7xl px-6 py-8">

        {/* Breadcrumb */}
        <Link
          to={`/catalogDetail/${idProducto}`}
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#087f99] hover:underline"
        >
          <ChevronLeft size={16} />
          Volver al producto
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">

          {/* ── Columna izquierda: imagen con overlay de color ─────────────── */}
          <div className="flex flex-col gap-5">

            {/*
             * Contenedor de imagen con capa de color dinámica.
             *
             * Técnica: dos capas apiladas absolutamente
             *   1. <img> base — aporta sombras, texturas y relieves de la prenda
             *   2. div coloreado — usa maskImage con la misma URL de la imagen
             *      para recortar el color al contorno exacto del producto.
             *      mix-blend-mode: multiply fusiona el color con los tonos claros
             *      de la imagen: blanco → toma el color elegido, sombras → permanecen
             *
             * Nota: funciona mejor con imágenes PNG con fondo transparente.
             * Con JPEG/fondo se aplica mix-blend-mode: color como fallback.
             */}
            <div
              className="relative overflow-hidden rounded-2xl shadow-sm"
              style={{
                backgroundColor: "#f0ede8",
                width: "100%",
                height: "560px",
              }}
            >
              {/* Capa 1: imagen base (sombras y estructura) */}
              <img
                src={urlImagen}
                alt={producto.nombre}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 1,
                }}
              />

              {/* Capa 2: tinte de color con máscara de la silueta */}
              {hexColorActual && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    backgroundColor: hexColorActual,
                    // Recorta el color al contorno exacto de la prenda
                    maskImage: `url(${urlImagen})`,
                    WebkitMaskImage: `url(${urlImagen})`,
                    maskSize: "cover",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskSize: "cover",
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    // multiply: mezcla el color con los tonos claros de la imagen
                    mixBlendMode: "multiply",
                    pointerEvents: "none",
                    transition: "background-color 0.3s ease",
                  }}
                />
              )}

              {/* Etiqueta flotante con el color activo */}
              {colorSeleccionado && (
                <div
                  className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-sm"
                  style={{ zIndex: 3 }}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-slate-200 shadow-sm"
                    style={{ backgroundColor: hexColorActual ?? "#d1d5db" }}
                  />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    {colorSeleccionado}
                  </span>
                </div>
              )}
            </div>

            {/* Botones de color compactos debajo de la imagen (referencia rápida) */}
            <div className="flex flex-wrap gap-2">
              {coloresDisponibles.map((color) => {
                const sinStock = !colorTieneStock(
                  producto.variantes,
                  color.nombre
                );
                const activo = colorSeleccionado === color.nombre;

                return (
                  <button
                    key={color.nombre}
                    type="button"
                    disabled={sinStock}
                    onClick={() => handleSeleccionarColor(color.nombre)}
                    title={
                      sinStock
                        ? `${color.nombre} — sin stock`
                        : color.nombre
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      activo
                        ? "border-[#bd2d73] bg-pink-50 text-[#bd2d73]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#bd2d73]"
                    } ${sinStock ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-slate-200"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Columna derecha: controles de personalización ──────────────── */}
          <aside className="flex flex-col gap-6 py-2">

            {/* Nombre y precio */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd2d73]">
                {producto.categoria?.nombre ?? "Producto"}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
                {producto.nombre}
              </h1>
              <p className="mt-2 text-2xl font-extrabold text-[#bd2d73]">
                {formatearPrecio(Number(producto.precioBase))}
              </p>
              {producto.descripcion && (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {producto.descripcion}
                </p>
              )}
            </div>

            {/* Selector COLOR */}
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Color:{" "}
                <span className="text-slate-800">
                  {colorSeleccionado || "—"}
                </span>
              </p>

              <div className="flex flex-wrap gap-3">
                {coloresDisponibles.map((color) => {
                  const sinStock = !colorTieneStock(
                    producto.variantes,
                    color.nombre
                  );

                  return (
                    <button
                      key={color.nombre}
                      type="button"
                      disabled={sinStock}
                      onClick={() => handleSeleccionarColor(color.nombre)}
                      title={
                        sinStock
                          ? `${color.nombre} — sin stock`
                          : color.nombre
                      }
                      className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${
                        colorSeleccionado === color.nombre
                          ? "border-[#bd2d73] ring-2 ring-[#bd2d73]/30"
                          : "border-slate-200 hover:border-[#bd2d73]"
                      } ${sinStock ? "cursor-not-allowed opacity-35" : ""}`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-slate-200 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector TALLA (solo muestra tallas del color seleccionado) */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Talla
                </p>
                {colorSeleccionado && (
                  <span className="text-xs text-slate-400">
                    Disponibles para{" "}
                    <span className="font-semibold text-slate-600">
                      {colorSeleccionado}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {variantesDelColor.map((variante) => {
                  const sinStock = !varianteTieneStock(variante);
                  const activa = tallaSeleccionada === variante.talla;

                  return (
                    <button
                      key={variante.idVariante}
                      type="button"
                      disabled={sinStock}
                      onClick={() => handleSeleccionarTalla(variante)}
                      className={`h-11 min-w-[52px] rounded-lg border px-3 text-sm font-semibold transition ${
                        activa
                          ? "border-[#bd2d73] bg-pink-50 text-[#bd2d73]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#bd2d73]"
                      } ${
                        sinStock
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

            {/* Info stock de la combinación actual */}
            {varianteSeleccionada && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-700">
                  Stock disponible:{" "}
                  <span className="text-[#087f99]">{stockDisponible}</span>
                  {cantidadYaAgregada > 0 && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      ({cantidadYaAgregada} ya{" "}
                      {cantidadYaAgregada === 1 ? "añadido" : "añadidos"})
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Combinación: {colorSeleccionado} / {tallaSeleccionada}
                </p>
              </div>
            )}

            {/* Control de cantidad + botón Añadir */}
            <div className="flex items-center gap-3">
              {/* Selector de cantidad */}
              <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setCantidad((n) => Math.max(n - 1, 1))}
                  disabled={!varianteSeleccionada || stockRestante === 0}
                  className="grid h-11 w-11 place-items-center text-slate-500 transition hover:text-[#087f99] disabled:opacity-40"
                >
                  <Minus size={14} />
                </button>

                <span className="w-10 text-center text-sm font-bold">
                  {stockRestante === 0 ? 0 : cantidad}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCantidad((n) => Math.min(n + 1, stockRestante))
                  }
                  disabled={
                    !varianteSeleccionada ||
                    stockRestante === 0 ||
                    cantidad >= stockRestante
                  }
                  className="grid h-11 w-11 place-items-center text-slate-500 transition hover:text-[#087f99] disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Botón añadir combinación a la lista */}
              <button
                type="button"
                disabled={!varianteSeleccionada || stockRestante === 0}
                onClick={handleAgregarSeleccion}
                className="h-11 flex-1 rounded-lg border-2 border-[#087f99] bg-white text-xs font-bold uppercase tracking-wider text-[#087f99] transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Añadir combinación
              </button>
            </div>

            {/* Mensajes */}
            {mensajeError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {mensajeError}
              </p>
            )}
            {mensajeExito && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600">
                {mensajeExito}
              </p>
            )}

            {/* ── Lista de combinaciones añadidas ─────────────────────────── */}
            {selecciones.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Combinaciones seleccionadas
                </p>

                <div className="space-y-3">
                  {selecciones.map((sel) => (
                    <div
                      key={sel.idVariante}
                      className="flex items-center justify-between gap-3"
                    >
                      {/* Color + talla */}
                      <div className="flex items-center gap-3">
                        <span
                          className="h-8 w-8 shrink-0 rounded-full border border-slate-200 shadow-sm"
                          style={{ backgroundColor: sel.colorHex }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {sel.colorNombre}{" "}
                            <span className="text-slate-400">/</span> Talla{" "}
                            {sel.talla}
                          </p>
                          <p className="text-xs text-slate-400">
                            {sel.cantidad} ×{" "}
                            {formatearPrecio(sel.precioUnitario)}
                          </p>
                        </div>
                      </div>

                      {/* Subtotal + eliminar */}
                      <div className="flex items-center gap-3">
                        <p className="shrink-0 text-sm font-bold text-[#bd2d73]">
                          {formatearPrecio(sel.cantidad * sel.precioUnitario)}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleEliminarSeleccion(sel.idVariante)
                          }
                          title="Eliminar"
                          className="text-slate-300 transition hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    {totalUnidades} unidad{totalUnidades !== 1 ? "es" : ""} en
                    total
                  </p>
                  <p className="text-base font-extrabold text-[#bd2d73]">
                    {formatearPrecio(totalPrecio)}
                  </p>
                </div>
              </div>
            )}

            {/* ── Botón APLICAR ─────────────────────────────────────────────── */}
            <Button
              type="button"
              disabled={selecciones.length === 0 || aplicando}
              onClick={() => void handleAplicar()}
              className="h-12 w-full bg-[#087f99] text-xs font-bold uppercase tracking-[0.18em] hover:bg-[#076f86] disabled:opacity-50"
            >
              {aplicando
                ? "Aplicando..."
                : selecciones.length === 0
                  ? "Añade al menos una combinación"
                  : `Aplicar (${totalUnidades} unidad${totalUnidades !== 1 ? "es" : ""})`}
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}
