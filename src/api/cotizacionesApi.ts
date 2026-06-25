const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type EstadoCotizacion =
  | "PENDIENTE"
  | "CONTRAPROPUESTA"
  | "RECHAZADA"
  | "CERRADA";

export type LineaCotizacion = {
  idLineaCotizacion: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  idCotizacion: number;
  idVariante: number;
};

export type Contrapropuesta = {
  idContrapropuesta: number;
  sustento: string | null;
  fechaCreacion: string;
  precioNuevo: number;
  idCotizacion: number;
  idUserGenerador: number;
};

export type Cotizacion = {
  idCotizacion: number;
  fechaCreacion: string;
  estado: EstadoCotizacion;

  precioSugerido: number;
  sustento: string | null;
  montoSugerido: number;
  montoReal: number | null;

  idCliente: number;
  idComerciante: number | null;
  idProducto: number;

  lineas?: LineaCotizacion[];
  lineasCotizacion?: LineaCotizacion[];
  lineaCotizaciones?: LineaCotizacion[];

  contrapropuestas?: Contrapropuesta[];
  historialContrapropuestas?: Contrapropuesta[];

  cantidadContrapropuestas?: number | null;
  numeroContrapropuestas?: number | null;
};

export type LineaCotizacionRequest = {
  idVariante: number;
  cantidad: number;
};

export type CrearCotizacionRequest = {
  idProducto: number;
  precioSugerido: number;
  montoSugerido: number;
  sustento: string | null;
  lineas: LineaCotizacionRequest[];
};

export type ContrapropuestaRequest = {
  idCotizacion: number;
  precioNuevo: number;
  sustento: string | null;
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "No se pudo completar la operación.";

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

export function crearCotizacion(data: CrearCotizacionRequest) {
  return request<Cotizacion>("/api/cotizaciones", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function obtenerCotizacionPorId(idCotizacion: number) {
  return request<Cotizacion>(`/api/cotizaciones/${idCotizacion}`);
}

export function filtrarMisCotizaciones(params?: {
  estado?: EstadoCotizacion | "";
  page?: number;
  size?: number;
}) {
  const searchParams = new URLSearchParams();

  if (params?.estado) {
    searchParams.set("estado", params.estado);
  }

  searchParams.set("page", String(params?.page ?? 0));
  searchParams.set("size", String(params?.size ?? 5));

  return request<PageResponse<Cotizacion>>(
    `/api/cotizaciones/mis-cotizaciones/filtrar?${searchParams.toString()}`
  );
}

export function filtrarCotizaciones(params?: {
  estado?: EstadoCotizacion | "";
  idCliente?: number | null;
  idComerciante?: number | null;
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  montoMin?: number | null;
  montoMax?: number | null;
  page?: number;
  size?: number;
}) {
  const searchParams = new URLSearchParams();

  if (params?.estado) searchParams.set("estado", params.estado);
  if (params?.idCliente) searchParams.set("idCliente", String(params.idCliente));
  if (params?.idComerciante) {
    searchParams.set("idComerciante", String(params.idComerciante));
  }
  if (params?.fechaDesde) searchParams.set("fechaDesde", params.fechaDesde);
  if (params?.fechaHasta) searchParams.set("fechaHasta", params.fechaHasta);
  if (params?.montoMin != null) searchParams.set("montoMin", String(params.montoMin));
  if (params?.montoMax != null) searchParams.set("montoMax", String(params.montoMax));

  searchParams.set("page", String(params?.page ?? 0));
  searchParams.set("size", String(params?.size ?? 10));

  return request<PageResponse<Cotizacion>>(
    `/api/cotizaciones/filtrar?${searchParams.toString()}`
  );
}

export function aceptarCotizacion(idCotizacion: number) {
  return request<Cotizacion>(`/api/cotizaciones/${idCotizacion}/aceptar`, {
    method: "PUT",
  });
}

export function rechazarCotizacion(idCotizacion: number) {
  return request<Cotizacion>(`/api/cotizaciones/${idCotizacion}/rechazar`, {
    method: "PUT",
  });
}

export function crearContrapropuesta(data: ContrapropuestaRequest) {
  return request<Cotizacion>("/api/cotizaciones/contrapropuesta", {
    method: "POST",
    body: JSON.stringify(data),
  });
}