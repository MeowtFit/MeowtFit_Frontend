const API_BASE_URL = "http://localhost:8080";

export type EstadoPedido =
  | "REGISTRADO"
  | "CONFIRMADO"
  | "EN_PROCESO"
  | "ENVIADO"
  | "ENTREGADO"
  | "CANCELADO"
  | "PAGO_RECHAZADO";

export type CrearPedidoRequest = {
  metodoPago: string;
  lineas: {
    idVariante: number;
    cantidad: number;
  }[];
};

export type LineaPedido = {
  idLineaPedido: number;
  cantidad: number;
  precioVenta: number;
  subtotal: number;
  precioUnitario: number;
  descuentoAplicado: number;
  idVariante: number;
  nombreProducto: string;
  talla: string;
  idColor: number | null;
  color: string | null;

  // Esto lo agrego para que tu PedidosListPage actual no se rompa.
  variante?: {
    idVariante: number;
    nombreProducto: string;
    talla: string;
    color: string | null;
    imagenUrl?: string | null;
  };
};

export type Pedido = {
  idPedido: number;
  fechaHoraRegistro: string;
  estado: EstadoPedido;
  montoTotal: number;
  metodoPago: string;
  descuento: number;
  fechaEntrega: string | null;
  igv: number;
  idUsuario: number;
  nombreUsuario: string;
  lineas: LineaPedido[];

  // Campos opcionales porque tu vista actual los usa,
  // pero este backend todavía no los devuelve.
  idFactura?: number | null;
  tieneComprobante?: boolean;
  archivoComprobante?: string | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = "No se pudo completar la operación";

    try {
      const data = await response.json();
      message = data.mensaje ?? data.message ?? data.error ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(`${response.status} ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function adaptarPedido(pedido: Pedido): Pedido {
  return {
    ...pedido,
    idFactura: pedido.idFactura ?? null,
    tieneComprobante: pedido.tieneComprobante ?? false,
    archivoComprobante: pedido.archivoComprobante ?? null,
    lineas: pedido.lineas.map((linea) => ({
      ...linea,
      variante: {
        idVariante: linea.idVariante,
        nombreProducto: linea.nombreProducto,
        talla: linea.talla,
        color: linea.color,
        imagenUrl: null,
      },
    })),
  };
}

export async function crearPedido(data: CrearPedidoRequest) {
  const pedido = await request<Pedido>("/api/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return adaptarPedido(pedido);
}

export async function listarMisPedidos() {
  const pedidos = await request<Pedido[]>("/api/pedidos/mis-pedidos");

  return pedidos.map(adaptarPedido);
}

export async function listarTodosPedidos() {
  const pedidos = await request<Pedido[]>("/api/pedidos");

  return pedidos.map(adaptarPedido);
}

export function cambiarEstadoPedido(idPedido: number, nuevoEstado: EstadoPedido) {
  return request<Pedido>(
    `/api/pedidos/${idPedido}/estado?nuevoEstado=${nuevoEstado}`,
    {
      method: "PATCH",
    }
  );
}

// Tu PedidosListPage usa verificarPago(idPedido), así que dejo este wrapper.
export function verificarPago(idPedido: number) {
  return cambiarEstadoPedido(idPedido, "CONFIRMADO");
}

export type ComprobantePagoDTO = {
  idComprobante: number;
  archivo: string;
  fechaSubida: string;
  tipoArchivo: string;
  idPedido: number;
};

export async function subirComprobante(idPedido: number, archivo: File): Promise<ComprobantePagoDTO> {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const response = await fetch(`${API_BASE_URL}/api/comprobantes-pago/${idPedido}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let message = "No se pudo subir el comprobante";
    try {
      const data = await response.json();
      message = data.mensaje ?? data.message ?? data.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(`${response.status} ${message}`);
  }

  return response.json() as Promise<ComprobantePagoDTO>;
}