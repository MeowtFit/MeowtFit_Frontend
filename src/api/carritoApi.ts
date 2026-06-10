const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type Carrito = {
  idCarrito: number;
  fechaCreacion: string;
  estado: "ACTIVO" | "INACTIVO";
  idUsuario: number;
};

export type LineaCarrito = {
  idLineaCarrito: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  idCarrito: number;
  idVariante: number;
};

export type LineaCarritoRequest = {
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  idCarrito: number;
  idVariante: number;
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

  return response.json() as Promise<T>;
}

export function obtenerCarritoActivo() {
  return request<Carrito>("/api/carritos/activo");
}

export function crearCarrito() {
  return request<Carrito>("/api/carritos", {
    method: "POST",
  });
}

export async function obtenerOCrearCarritoActivo() {
  try {
    return await obtenerCarritoActivo();
  } catch {
    return await crearCarrito();
  }
}

export function listarLineasPorCarrito(idCarrito: number) {
  return request<LineaCarrito[]>(`/api/lineas-carrito/carrito/${idCarrito}`);
}

export function crearLineaCarrito(data: LineaCarritoRequest) {
  return request<LineaCarrito>("/api/lineas-carrito", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function actualizarLineaCarrito(
  idLineaCarrito: number,
  data: LineaCarritoRequest
) {
  return request<LineaCarrito>(`/api/lineas-carrito/${idLineaCarrito}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}