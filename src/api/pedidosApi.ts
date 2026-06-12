const API_BASE_URL = "http://localhost:8080";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type EstadoPedido =
  | "REGISTRADO"
  | "CONFIRMADO"
  | "EN_PROCESO"
  | "ENVIADO"
  | "ENTREGADO"
  | "CANCELADO"
  | "PAGO_RECHAZADO";

export interface VarianteResumen {
  idVariante: number;
  talla?: string;
  colorNombre?: string;
  imagenUrl?: string;
  nombreProducto?: string;
}

export interface LineaPedidoItem {
  idLineaPedido: number;
  cantidad: number;
  precioVenta: number;
  subtotal: number;
  precioUnitario: number;
  descuentoAplicado: number;
  variante: VarianteResumen;
}

export interface Pedido {
  idPedido: number;
  fechaHoraRegistro: string; // ISO datetime, ej: "2026-04-24T10:00:00"
  estado: EstadoPedido;
  montoTotal: number;
  metodoPago?: string;
  descuento?: number;
  igv?: number;
  idUsuario?: number; // visible para ADMINISTRADOR
  lineas: LineaPedidoItem[];
  tieneComprobante: boolean;
  idFactura?: number;
  archivoComprobante?: string; // URL del archivo subido (para vista admin)
}

// ─── Helpers internos ───────────────────────────────────────────────────────

async function fetchConAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, { ...options, credentials: "include" });
}

// ─── API pública ─────────────────────────────────────────────────────────────

/** Devuelve los pedidos del cliente autenticado */
export async function listarMisPedidos(): Promise<Pedido[]> {
  const res = await fetchConAuth(`${API_BASE_URL}/api/pedidos/mis-pedidos`);
  if (!res.ok) throw new Error("No se pudieron cargar los pedidos.");
  return res.json() as Promise<Pedido[]>;
}

/**
 * Devuelve TODOS los pedidos (solo para ADMINISTRADOR).
 * Endpoint a confirmar con el backend — ajustar si es necesario.
 */
export async function listarTodosPedidos(): Promise<Pedido[]> {
  const res = await fetchConAuth(`${API_BASE_URL}/api/pedidos`);
  if (!res.ok) throw new Error("No se pudieron cargar los pedidos.");
  return res.json() as Promise<Pedido[]>;
}

/** Sube el comprobante de pago de un pedido (multipart/form-data) */
export async function subirComprobante(
  idPedido: number,
  archivo: File
): Promise<void> {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const res = await fetchConAuth(
    `${API_BASE_URL}/api/comprobantes-pago/pedido/${idPedido}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("No se pudo subir el comprobante.");
}

/**
 * Marca el pedido como CONFIRMADO (verificación manual del admin).
 * Endpoint a confirmar con el backend.
 */
export async function verificarPago(idPedido: number): Promise<void> {
  const res = await fetchConAuth(
    `${API_BASE_URL}/api/pedidos/${idPedido}/confirmar`,
    { method: "PATCH" }
  );
  if (!res.ok) throw new Error("No se pudo confirmar el pago.");
}
