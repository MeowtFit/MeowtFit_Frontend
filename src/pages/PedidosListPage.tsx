import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  CreditCard,
  Shield,
  Upload,
  X,
} from "lucide-react";

import {
  listarMisPedidos,
  listarTodosPedidos,
  subirComprobante,
  verificarPago,
  cambiarEstadoPedido,
  obtenerComprobantePorPedido,
  eliminarComprobante,
  type EstadoPedido,
  type Pedido,
} from "@/api/pedidosApi";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ITEMS_INICIALES = 3;
const ITEMS_POR_PAGINA = 3;

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=200&auto=format&fit=crop";

function obtenerRolLocal(): string | null {
  return (
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol")
  );
}

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

function formatearFecha(fecha: string): string {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = String(d.getFullYear()).slice(2);

  return `${dia}/${mes}/${anio}`;
}

function codigoFactura(pedido: Pedido): string {
  const num = pedido.idPedido;
  return `F${String(num).padStart(3, "0")}`;
}

function esCancelado(estado: EstadoPedido): boolean {
  return estado === "CANCELADO" || estado === "PAGO_RECHAZADO";
}

export default function PedidosListPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rol = obtenerRolLocal();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidosOcultos, setPedidosOcultos] = useState<Set<number>>(new Set());
  const [visiblesCount, setVisiblesCount] = useState(ITEMS_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalPedido, setModalPedido] = useState<Pedido | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(
    null
  );
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [exitoModal, setExitoModal] = useState<string | null>(null);

  useEffect(() => {
    if (!rol) {
      navigate("/login", { replace: true });
      return;
    }

    if (rol === "COMERCIANTE") {
      navigate("/", { replace: true });
    }
  }, [navigate, rol]);

  async function cargarPedidos() {
    try {
      setCargando(true);
      setError(null);

      const data =
        rol === "ADMINISTRADOR"
          ? await listarTodosPedidos()
          : await listarMisPedidos();

      const dataConComprobantes = await Promise.all(
        data.map(async (p) => {
          try {
            const cp = await obtenerComprobantePorPedido(p.idPedido);
            if (cp) {
              return {
                ...p,
                tieneComprobante: true,
                archivoComprobante: cp.archivo,
                idFactura: cp.idComprobante,
              };
            }
          } catch (e) {
            console.error("Error al obtener comprobante:", e);
          }
          return {
            ...p,
            tieneComprobante: false,
            archivoComprobante: null,
          };
        })
      );

      setPedidos(dataConComprobantes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pedidos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (rol === "CLIENTE" || rol === "ADMINISTRADOR") {
      void cargarPedidos();
    }
  }, []);

  const pedidosActivos = pedidos.filter((p) => !pedidosOcultos.has(p.idPedido));

  const pedidosCancelados = pedidosActivos.filter((p) =>
    esCancelado(p.estado)
  );

  const pedidosPendientes = pedidosActivos.filter(
    (p) => !esCancelado(p.estado)
  );

  const totalPagar = pedidosPendientes.reduce(
    (sum, p) => sum + Number(p.montoTotal),
    0
  );

  const pedidosVisibles = pedidosActivos.slice(0, visiblesCount);
  const hayMas = visiblesCount < pedidosActivos.length;

  function ocultarPedido(idPedido: number) {
    setPedidosOcultos((prev) => new Set([...prev, idPedido]));
  }

  function abrirModal(pedido: Pedido) {
    setModalPedido(pedido);
    setArchivoSeleccionado(null);
    setErrorModal(null);
    setExitoModal(null);
  }

  function cerrarModal() {
    setModalPedido(null);
    setArchivoSeleccionado(null);
    setErrorModal(null);
    setExitoModal(null);
  }

  async function handleSubirComprobante() {
    if (!modalPedido || !archivoSeleccionado) return;

    try {
      setSubiendoComprobante(true);
      setErrorModal(null);

      if (modalPedido.estado === "PAGO_RECHAZADO" && modalPedido.idFactura) {
        try {
          await eliminarComprobante(modalPedido.idFactura);
        } catch (e) {
          console.error("Error al eliminar comprobante anterior:", e);
        }
      }

      const cp = await subirComprobante(modalPedido.idPedido, archivoSeleccionado);

      let nuevoEstado = modalPedido.estado;
      if (modalPedido.estado === "PAGO_RECHAZADO") {
        await cambiarEstadoPedido(modalPedido.idPedido, "REGISTRADO");
        nuevoEstado = "REGISTRADO";
      }

      const pedidoActualizado = {
        ...modalPedido,
        tieneComprobante: true,
        estado: nuevoEstado,
        idFactura: cp.idComprobante,
      };

      setPedidos((prev) =>
        prev.map((p) =>
          p.idPedido === modalPedido.idPedido ? pedidoActualizado : p
        )
      );

      setModalPedido(pedidoActualizado);
      setExitoModal("¡Comprobante subido correctamente!");
      setArchivoSeleccionado(null);
    } catch (err) {
      setErrorModal(
        err instanceof Error ? err.message : "Error al subir el comprobante."
      );
    } finally {
      setSubiendoComprobante(false);
    }
  }

  async function handleVerificarPago() {
    if (!modalPedido) return;

    try {
      setVerificando(true);
      setErrorModal(null);

      await verificarPago(modalPedido.idPedido);

      setExitoModal("Pago verificado correctamente.");

      setPedidos((prev) =>
        prev.map((p) =>
          p.idPedido === modalPedido.idPedido
            ? { ...p, estado: "CONFIRMADO" as EstadoPedido }
            : p
        )
      );

      setTimeout(() => {
        cerrarModal();
        void cargarPedidos();
      }, 1200);
    } catch (err) {
      setErrorModal(
        err instanceof Error ? err.message : "Error al verificar el pago."
      );
    } finally {
      setVerificando(false);
    }
  }

  function Footer() {
    return (
      <footer className="mt-auto border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <span className="text-lg font-extrabold text-slate-800">
              MEOWTFIT
            </span>

            <div className="flex gap-6 text-xs font-medium text-slate-500">
              {[
                "GUÍA DE TALLAS",
                "ENVÍOS Y RETORNOS",
                "SOSTENIBILIDAD",
                "CONTACTO",
              ].map((item) => (
                <a key={item} href="#" className="hover:text-[#087f99]">
                  {item}
                </a>
              ))}
            </div>

            <p className="text-xs text-slate-400">
              © 2026 Meowtfit Boutique. Inspiración local, visión global.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (!rol || rol === "COMERCIANTE") return null;

  if (cargando) {
    return (
      <div className="flex min-h-[calc(100vh-66px)] flex-col bg-[#f4f8fb]">
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm font-medium text-slate-500">
            Cargando pedidos...
          </p>
        </main>

        <Footer />
      </div>
    );
  }

  if (rol === "ADMINISTRADOR") {
    return (
      <div className="flex min-h-[calc(100vh-66px)] flex-col bg-[#f4f8fb]">
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">
                Verificación de Pedidos
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Revisa los comprobantes subidos por los compradores y confirma
                los pagos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void cargarPedidos()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#087f99] transition hover:bg-cyan-50"
            >
              Actualizar
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {pedidos.length === 0 ? (
            <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
              <p className="text-lg font-bold text-slate-700">
                No hay pedidos registrados.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4 text-left">Factura</th>
                    <th className="px-5 py-4 text-left">ID Cliente</th>
                    <th className="px-5 py-4 text-left">Fecha</th>
                    <th className="px-5 py-4 text-left">Estado</th>
                    <th className="px-5 py-4 text-left">Comprobante</th>
                    <th className="px-5 py-4 text-left">Monto</th>
                    <th className="px-5 py-4 text-left">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {pedidos.map((pedido) => {
                    const cancelado = esCancelado(pedido.estado);

                    return (
                      <tr
                        key={pedido.idPedido}
                        className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {codigoFactura(pedido)}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {pedido.idUsuario ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatearFecha(pedido.fechaHoraRegistro)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${cancelado
                              ? "bg-red-50 text-red-500"
                              : "bg-cyan-50 text-[#087f99]"
                              }`}
                          >
                            {pedido.estado}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {pedido.tieneComprobante ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                              Subido
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-500">
                              Pendiente
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-[#bd2d73]">
                          {formatearPrecio(Number(pedido.montoTotal))}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => abrirModal(pedido)}
                            className="rounded-lg border border-[#087f99] px-3 py-1.5 text-xs font-semibold text-[#087f99] transition hover:bg-cyan-50"
                          >
                            Ver detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>

        <Footer />

        {modalPedido && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={cerrarModal}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex items-center gap-1 text-sm font-semibold text-[#087f99] hover:underline"
                >
                  <ArrowLeft size={16} /> Volver
                </button>

                <span className="text-base font-extrabold text-[#087f99]">
                  MEOWTFIT
                </span>

                <button
                  type="button"
                  onClick={cerrarModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-800">
                Pedido {codigoFactura(modalPedido)}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Fecha: {formatearFecha(modalPedido.fechaHoraRegistro)} · Estado:{" "}
                <span
                  className={`font-semibold ${esCancelado(modalPedido.estado)
                    ? "text-red-500"
                    : "text-[#087f99]"
                    }`}
                >
                  {modalPedido.estado}
                </span>
              </p>

              <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1">
                {modalPedido.lineas.map((linea) => (
                  <div
                    key={linea.idLineaPedido}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={normalizarImagen(linea.variante?.imagenUrl)}
                        alt={linea.variante?.nombreProducto ?? "Prenda"}
                        className="h-12 w-12 rounded-lg object-cover"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {linea.variante?.nombreProducto ?? "Producto"}
                          {linea.variante?.talla
                            ? ` — Talla ${linea.variante.talla}`
                            : ""}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {linea.cantidad} ×{" "}
                          {formatearPrecio(Number(linea.precioUnitario))}
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-[#bd2d73]">
                      {formatearPrecio(Number(linea.subtotal))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 font-bold text-slate-800">
                <span>Total</span>
                <span className="text-lg text-[#bd2d73]">
                  {formatearPrecio(Number(modalPedido.montoTotal))}
                </span>
              </div>

              <div className="mt-5">
                {modalPedido.tieneComprobante ? (
                  <div className="rounded-xl bg-green-50 px-4 py-3">
                    <p className="text-sm font-semibold text-green-700">
                      ✓ El comprador ha subido su comprobante.
                    </p>

                    {modalPedido.archivoComprobante && (
                      <a
                        href={normalizarImagen(modalPedido.archivoComprobante)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs font-medium text-[#087f99] underline"
                      >
                        Ver archivo del comprobante
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-50 px-4 py-3">
                    <p className="text-sm font-medium text-amber-600">
                      ⚠ El comprador aún no ha subido su comprobante.
                    </p>
                  </div>
                )}
              </div>

              {errorModal && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {errorModal}
                </p>
              )}

              {exitoModal && (
                <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                  {exitoModal}
                </p>
              )}

              {modalPedido.tieneComprobante &&
                modalPedido.estado === "REGISTRADO" && (
                  <button
                    type="button"
                    onClick={() => void handleVerificarPago()}
                    disabled={verificando}
                    className="mt-5 w-full rounded-xl bg-[#087f99] py-3.5 text-sm font-bold text-white transition hover:bg-[#076f86] disabled:opacity-60"
                  >
                    {verificando ? "Verificando..." : "Verificar pago"}
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-66px)] flex-col bg-[#f4f8fb]">
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <h1 className="mb-8 text-3xl font-extrabold text-slate-800">
          Mis Pedidos
        </h1>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            {pedidosActivos.length === 0 ? (
              <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
                <p className="text-lg font-bold text-slate-700">
                  No tienes pedidos aún.
                </p>

                <Link
                  to="/"
                  className="mt-4 inline-block text-sm font-semibold text-[#087f99] hover:underline"
                >
                  Explorar tienda →
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  {pedidosVisibles.map((pedido, index) => {
                    let etiqueta = "PENDIENTE";
                    if (pedido.estado === "PAGO_RECHAZADO") {
                      etiqueta = "RECHAZADA";
                    } else if (pedido.estado === "CANCELADO") {
                      etiqueta = "CANCELADA";
                    } else if (pedido.tieneComprobante) {
                      etiqueta = "Comprobante Subido";
                    }

                    const imagenesPrendas = pedido.lineas
                      .slice(0, 2)
                      .map((l) => normalizarImagen(l.variante?.imagenUrl));

                    const cantidadProductos = pedido.lineas.reduce(
                      (sum, l) => sum + l.cantidad,
                      0
                    );

                    return (
                      <div
                        key={pedido.idPedido}
                        className={`relative px-6 py-5 ${index < pedidosVisibles.length - 1
                          ? "border-b border-slate-200"
                          : ""
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() => ocultarPedido(pedido.idPedido)}
                          title="Ocultar pedido de la lista"
                          className="absolute right-4 top-4 text-slate-300 transition hover:text-slate-500"
                        >
                          <X size={18} />
                        </button>

                        <div className="flex items-center gap-4 pr-6">
                          <div className="flex shrink-0 gap-2">
                            {imagenesPrendas.map((src, i) => (
                              <img
                                key={`${pedido.idPedido}-${i}`}
                                src={src}
                                alt="Prenda"
                                className="h-[90px] w-[72px] rounded-lg object-cover"
                              />
                            ))}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-bold text-slate-800">
                              Factura – {codigoFactura(pedido)} (
                              {formatearFecha(pedido.fechaHoraRegistro)})
                            </p>

                            <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                              Cantidad de productos: {cantidadProductos}
                            </p>

                            <div className="mt-4 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={() => abrirModal(pedido)}
                                className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-[#087f99] hover:text-[#087f99]"
                              >
                                Detalles
                              </button>

                              <span className="text-sm font-bold tracking-wide text-[#bd2d73]">
                                {etiqueta}
                              </span>
                            </div>
                          </div>

                          <p className="shrink-0 text-xl font-extrabold text-slate-800">
                            {formatearPrecio(Number(pedido.montoTotal))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hayMas && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisiblesCount((prev) => prev + ITEMS_POR_PAGINA)
                    }
                    className="mt-4 flex w-full items-center justify-center gap-1 py-3 text-sm font-bold text-[#bd2d73] transition hover:text-[#a82365]"
                  >
                    MOSTRAR MÁS <ChevronDown size={16} />
                  </button>
                )}
              </>
            )}
          </div>

          <aside className="sticky top-[90px]">
            <div className="rounded-2xl bg-[#9ab8c5] p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-slate-800">
                Resumen Tickets
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Total</span>
                  <span className="font-semibold">{pedidosActivos.length}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Canceladas</span>
                  <span className="font-bold text-[#bd2d73]">
                    {pedidosCancelados.length}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>Pendientes</span>
                  <span className="font-semibold">
                    {pedidosPendientes.length}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-400/40 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-base font-bold text-slate-800">
                    Total por pagar
                  </span>

                  <span className="text-xl font-extrabold text-[#bd2d73]">
                    {formatearPrecio(totalPagar)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <Shield size={13} className="text-[#087f99]" />
                  Pago 100% Seguro y Encriptado
                </div>

                <div className="flex items-center gap-4 text-slate-600">
                  <CreditCard size={22} />
                  <Building2 size={22} />

                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path d="M3 10h18" />
                    <path d="M7 15h4" />
                  </svg>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10">
          <Link
            to="/"
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#087f99]"
          >
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>
      </main>

      <Footer />

      {modalPedido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={cerrarModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <button
                type="button"
                onClick={cerrarModal}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[#087f99] hover:underline"
              >
                <ArrowLeft size={14} /> Volver
              </button>

              <span className="text-base font-extrabold text-[#087f99]">
                MEOWTFIT
              </span>
            </div>

            {modalPedido.estado === "CANCELADO" || (modalPedido.tieneComprobante && modalPedido.estado !== "PAGO_RECHAZADO") ? (
              <>
                <h2 className="text-xl font-bold text-slate-800">
                  Detalle del pedido
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Factura {codigoFactura(modalPedido)} —{" "}
                  {formatearFecha(modalPedido.fechaHoraRegistro)}
                </p>

                {modalPedido.tieneComprobante &&
                  !esCancelado(modalPedido.estado) && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      ✓ Comprobante enviado — en espera de verificación
                    </p>
                  )}

                <div className="mt-6 max-h-72 space-y-4 overflow-y-auto pr-1">
                  {modalPedido.lineas.map((linea) => (
                    <div
                      key={linea.idLineaPedido}
                      className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={normalizarImagen(linea.variante?.imagenUrl)}
                          alt={linea.variante?.nombreProducto ?? "Prenda"}
                          className="h-14 w-11 rounded-lg object-cover"
                        />

                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {linea.variante?.nombreProducto ?? "Producto"}
                            {linea.variante?.talla
                              ? ` — Talla ${linea.variante.talla}`
                              : ""}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {linea.cantidad} ×{" "}
                            {formatearPrecio(Number(linea.precioUnitario))}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-[#bd2d73]">
                        {formatearPrecio(Number(linea.subtotal))}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="font-bold text-slate-800">Total</span>

                  <span className="text-lg font-extrabold text-[#bd2d73]">
                    {formatearPrecio(Number(modalPedido.montoTotal))}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-800">
                  Detalles y subir comprobante
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Factura {codigoFactura(modalPedido)} —{" "}
                  {formatearFecha(modalPedido.fechaHoraRegistro)}
                </p>

                <p className="mt-1 text-sm font-bold text-[#bd2d73]">
                  Estado: {modalPedido.estado === "PAGO_RECHAZADO" ? "RECHAZADA" : "PENDIENTE"}
                </p>

                {errorModal && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {errorModal}
                  </p>
                )}

                {exitoModal && (
                  <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
                    {exitoModal}
                  </p>
                )}

                {archivoSeleccionado && (
                  <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Archivo seleccionado
                    </p>

                    <p className="mt-1 truncate text-sm font-medium text-slate-700">
                      {archivoSeleccionado.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {(archivoSeleccionado.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setArchivoSeleccionado(file);
                  }}
                />

                <button
                  type="button"
                  disabled={subiendoComprobante}
                  onClick={() => {
                    if (archivoSeleccionado) {
                      void handleSubirComprobante();
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f99] py-4 text-base font-bold text-white transition hover:bg-[#076f86] disabled:opacity-60"
                >
                  {subiendoComprobante ? (
                    "Subiendo..."
                  ) : archivoSeleccionado ? (
                    <>
                      <Upload size={18} /> Confirmar y subir
                    </>
                  ) : (
                    <>
                      <Upload size={18} /> Subir comprobante
                    </>
                  )}
                </button>

                {archivoSeleccionado && !subiendoComprobante && (
                  <button
                    type="button"
                    onClick={() => {
                      setArchivoSeleccionado(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cambiar archivo
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}