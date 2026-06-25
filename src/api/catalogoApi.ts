const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type EstadoProducto = "ACTIVO" | "INACTIVO";

export type Categoria = {
  idCategoria: number;
  nombre: string;
};

export type ColorVariante =
  | string
  | {
      idColor?: number;
      nombre?: string;
      nombreColor?: string;
      codigoHex?: string;
      hex?: string;
      hexadecimal?: string;
    };

export type VarianteProducto = {
  idVariante: number;
  talla: string;
  color: ColorVariante | null;
  stockDisponible: number;
  stockReservado: number;
  imagenUrl?: string | null;
};

export type Producto = {
  idProducto: number;
  nombre: string;
  precioBase: number;
  estado: EstadoProducto;
  descripcion: string | null;
  imagenUrl: string | null;
  categoria: Categoria | null;
  variantes: VarianteProducto[];
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

export type ProductoFilters = {
  nombre?: string;
  idCategoria?: number;
  precioMin?: number;
  precioMax?: number;
  talla?: string;
  page?: number;
  size?: number;
  sort?: string;
};

export type ProductoResumen = {
  idProducto: number;
  nombre: string;
  precioBase: number;
  imagenUrl: string | null;
};

export type Color = {
  idColor: number;
  nombre: string;
  hexadecimal: string;
};

export type VarianteProductoDetalle = {
  idVariante: number;
  talla: string;
  stockDisponible: number;
  stockReservado: number;
  color: Color;
  producto: ProductoResumen;
};

export interface ReglaDescuentoDTO {
  idRegla: number;
  rangoMinimo: number;
  rangoMaximo: number;
  porcentaje: number;
  idProducto: number;
}

export async function listarReglasPorProducto(idProducto: number): Promise<ReglaDescuentoDTO[]> {
  const response = await fetch(`${API_BASE_URL}/api/reglas/producto/${idProducto}`);
  if (!response.ok) {
    throw new Error("Error al obtener las reglas de descuento");
  }
  return response.json();
}

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
    let message = "No se pudo conectar con el servidor";

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

export function listarCategorias() {
  return request<Categoria[]>("/api/categorias");
}

export function listarProductos(filters: ProductoFilters) {
  const params = new URLSearchParams();

  if (filters.nombre) {
    params.set("nombre", filters.nombre);
  }

  if (filters.idCategoria !== undefined) {
    params.set("idCategoria", String(filters.idCategoria));
  }

  if (filters.precioMin !== undefined) {
    params.set("precioMin", String(filters.precioMin));
  }

  if (filters.precioMax !== undefined) {
    params.set("precioMax", String(filters.precioMax));
  }

  if (filters.talla) {
    params.set("talla", filters.talla);
  }

  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 6));

  if (filters.sort) {
    params.set("sort", filters.sort);
  }

  return request<PageResponse<Producto>>(`/api/productos?${params.toString()}`);
}

export function buscarProductoPorId(idProducto: number) {
  return request<Producto>(`/api/productos/${idProducto}`);
}

export function obtenerVariantePorId(idVariante: number) {
  return request<VarianteProductoDetalle>(
    `/api/variantes/${idVariante}`
  );
}
