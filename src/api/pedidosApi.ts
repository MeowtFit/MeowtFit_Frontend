const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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

async function adaptarPedido(pedido: Pedido): Promise<Pedido> {
  const lineasConImagenes = await Promise.all(
    pedido.lineas.map(async (linea) => {
      let imagenUrl: string | null = null;
      try {
        const response = await fetch(`${API_BASE_URL}/api/variantes/${linea.idVariante}`, {
          credentials: "include",
        });
        if (response.ok) {
          const variantData = await response.json();
          imagenUrl = variantData.producto?.imagenUrl ?? null;
        }
      } catch (e) {
        console.error(`Error al obtener imagen para variante ${linea.idVariante}:`, e);
      }

      return {
        ...linea,
        variante: {
          idVariante: linea.idVariante,
          nombreProducto: linea.nombreProducto,
          talla: linea.talla,
          color: linea.color,
          imagenUrl: imagenUrl,
        },
      };
    })
  );

  return {
    ...pedido,
    idFactura: pedido.idFactura ?? null,
    tieneComprobante: pedido.tieneComprobante ?? false,
    archivoComprobante: pedido.archivoComprobante ?? null,
    lineas: lineasConImagenes,
  };
}

export async function crearPedido(data: CrearPedidoRequest) {
  const pedido = await request<Pedido>("/api/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return await adaptarPedido(pedido);
}

export async function listarMisPedidos() {
  const pedidos = await request<Pedido[]>("/api/pedidos/mis-pedidos");

  return Promise.all(pedidos.map(adaptarPedido));
}

export async function listarTodosPedidos() {
  const pedidos = await request<Pedido[]>("/api/pedidos");

  return Promise.all(pedidos.map(adaptarPedido));
}

export async function obtenerPedidoPorId(idPedido: number) {
  const pedido = await request<Pedido>(`/api/pedidos/${idPedido}`);

  return await adaptarPedido(pedido);
}

export function cambiarEstadoPedido(idPedido: number, nuevoEstado: EstadoPedido, motivoRechazo?: string) {
  let url = `/api/pedidos/${idPedido}/estado?nuevoEstado=${nuevoEstado}`;
  if (motivoRechazo) {
    url += `&motivoRechazo=${encodeURIComponent(motivoRechazo)}`;
  }
  return request<Pedido>(url, {
    method: "PATCH",
  });
}

// Tu PedidosListPage usa verificarPago(idPedido), así que dejo este wrapper.
export function verificarPago(idPedido: number) {
  return cambiarEstadoPedido(idPedido, "CONFIRMADO");
}

export async function obtenerComprobantePorPedido(idPedido: number): Promise<ComprobantePagoDTO | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/comprobantes-pago/pedido/${idPedido}`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    return await response.json() as ComprobantePagoDTO;
  } catch {
    return null;
  }
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

export async function eliminarComprobante(idComprobante: number): Promise<void> {
  await request<void>(`/api/comprobantes-pago/${idComprobante}`, {
    method: "DELETE",
  });
}


export async function descargarComprobanteArchivo(idComprobante: number): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/comprobantes-pago/${idComprobante}/archivo`, {
    credentials: "include",
  });

  if (!response.ok) {
    let message = "No se pudo descargar el archivo del comprobante";
    try {
      const data = await response.json();
      message = data.mensaje ?? data.message ?? data.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(`${response.status} ${message}`);
  }

  return response.blob();
}

// Tipo genérico para envolver las respuestas paginadas de Spring Boot Data
export type PageResponse<T> = {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;         // Página actual (0-indexed)
  numberOfElements: number;
  size: number;           // Tamaño de la página
  totalElements: number;  // Total de registros en la BD
  totalPages: number;     // Total de páginas distribuidas
};

// Función para filtrar los pedidos del usuario logueado con paginación
export async function filtrarMisPedidosApi(params?: {
  estado?: EstadoPedido | "";
  page?: number;
  size?: number;
}): Promise<PageResponse<Pedido>> {
  const searchParams = new URLSearchParams();

  if (params?.estado) {
    searchParams.set("estado", params.estado);
  }
  
  // Spring Boot recibe 'page' y 'size' en el objeto Pageable
  searchParams.set("page", String(params?.page ?? 0));
  searchParams.set("size", String(params?.size ?? 5));

  // Consumimos el endpoint que mapeaste en el backend
  const pageData = await request<PageResponse<Pedido>>(
    `/api/pedidos/mis-pedidos/filtrar?${searchParams.toString()}`
  );

  // Adaptamos cada pedido dentro del contenido para inyectarle las imágenes de las variantes
  const contenidoAdaptado = await Promise.all(pageData.content.map(adaptarPedido));

  return {
    ...pageData,
    content: contenidoAdaptado,
  };
}
