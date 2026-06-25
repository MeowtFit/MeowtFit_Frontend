const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type EstadoProducto = "ACTIVO" | "INACTIVO";

export interface Categoria {
  idCategoria: number;
  nombre: string;
}

export interface Color {
  idColor: number;
  nombre: string;
  hexadecimal: string;
}

export interface VarianteProducto {
  idVariante: number;
  talla: string;
  idColor: number;
  color: Color | null;
  stockDisponible: number;
  stockReservado: number;
  idProducto: number;
}

export interface Producto {
  idProducto: number;
  nombre: string;
  precioBase: number;
  estado: EstadoProducto;
  descripcion: string | null;
  imagenUrl: string | null;
  idCategoria: number;
  categoria?: Categoria;
  variantes?: VarianteProducto[];
  reglasDescuento?: ReglaDescuento[];
}

export interface ReglaDescuento {
  idRegla: number;
  rangoMinimo: number;
  rangoMaximo: number;
  porcentaje: number;
  idProducto: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CategoriaRequestDTO {
  nombre: string;
}

export interface ProductoRequestDTO {
  nombre: string;
  precioBase: number;
  descripcion?: string;
  imagenUrl?: string;
  idCategoria: number;
  estado?: EstadoProducto;
  variantes?: VarianteProductoRequestDTO[];
  reglasDescuento?: ReglaDescuentoRequestDTO[];
}

export interface VarianteProductoRequestDTO {
  talla: string;
  idColor: number;
  stockDisponible: number;
  stockReservado: number;
  idProducto?: number;
}

export interface ReglaDescuentoRequestDTO {
  rangoMinimo: number;
  rangoMaximo: number;
  porcentaje: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      if (data.campos) {
        const detail = Object.entries(data.campos)
          .map(([field, err]) => `${field}: ${err}`)
          .join(", ");
        message = `${data.error || "Error de validación"}: ${detail}`;
      } else {
        message = data.mensaje ?? data.message ?? data.error ?? message;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export function listarCategorias() {
  return request<Categoria[]>("/api/categorias");
}

export function crearCategoria(data: CategoriaRequestDTO) {
  return request<Categoria>("/api/categorias", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function editarCategoria(idCategoria: number, data: CategoriaRequestDTO) {
  return request<Categoria>(`/api/categorias/${idCategoria}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function eliminarCategoria(idCategoria: number) {
  return request<void>(`/api/categorias/${idCategoria}`, { method: "DELETE" });
}

export function filtrarProductos(params?: {
  nombre?: string;
  idCategoria?: number;
  page?: number;
  size?: number;
  sort?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.nombre) queryParams.append("nombre", params.nombre);
  if (params?.idCategoria) queryParams.append("idCategoria", params.idCategoria.toString());
  if (params?.page !== undefined) queryParams.append("page", params.page.toString());
  if (params?.size !== undefined) queryParams.append("size", params.size.toString());
  if (params?.sort) queryParams.append("sort", params.sort);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return request<PageResponse<Producto>>(`/api/productos${queryString}`);
}

export function buscarProductoPorId(idProducto: number) {
  return request<Producto>(`/api/productos/${idProducto}`);
}

export function listarProductosPorCategoria(idCategoria: number) {
  return request<Producto[]>(`/api/productos/categoria/${idCategoria}`);
}

export function listarProductosPorNombre(nombre: string) {
  return request<Producto[]>(`/api/productos/buscar?nombre=${encodeURIComponent(nombre)}`);
}

export function crearProducto(data: ProductoRequestDTO) {
  return request<Producto>("/api/productos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function editarProducto(idProducto: number, data: ProductoRequestDTO) {
  return request<Producto>(`/api/productos/${idProducto}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function activarProducto(idProducto: number) {
  return request<Producto>(`/api/productos/${idProducto}/activar`, { method: "PATCH" });
}

export function desactivarProducto(idProducto: number) {
  return request<Producto>(`/api/productos/${idProducto}/desactivar`, { method: "PATCH" });
}

export function obtenerVariantesPorProducto(idProducto: number) {
  return request<VarianteProducto[]>(`/api/variantes/producto/${idProducto}`);
}

export function obtenerVariantePorId(idVariante: number) {
  return request<any>(`/api/variantes/${idVariante}`);
}

export function crearVarianteProducto(data: VarianteProductoRequestDTO) {
  return request<VarianteProducto>("/api/variantes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function editarVarianteProducto(idVariante: number, data: VarianteProductoRequestDTO) {
  return request<VarianteProducto>(`/api/variantes/${idVariante}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function subirImagenProducto(archivo: File): Promise<string> {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const response = await fetch(`${API_BASE_URL}/api/productos/imagen`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let message = "No se pudo subir la imagen";
    try {
      const data = await response.json();
      message = data.mensaje ?? data.message ?? data.error ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(`${response.status} ${message}`);
  }

  const data = await response.json();
  // El backend devuelve { url: "..." } o { imagenUrl: "..." }
  const url = data.url ?? data.imagenUrl ?? data;
  if (typeof url !== "string") throw new Error("El servidor no devolvió una URL de imagen válida.");
  return url;
}

export function eliminarVarianteProducto(idVariante: number) {
  return request<void>(`/api/variantes/${idVariante}`, { method: "DELETE" });
}

export function obtenerReglasPorProducto(idProducto: number) {
  return request<ReglaDescuentoRequestDTO[]>(`/api/reglas/producto/${idProducto}`);
}

export function eliminarReglaPorProducto(idRegla: number) {
  return request<void>(`/api/reglas/${idRegla}`, { method: "DELETE" });
}

export function listarColores() {
  return request<Color[]>("/api/colores");
}