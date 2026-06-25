const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type RolUsuario = "ADMINISTRADOR" | "COMERCIANTE" | "CLIENTE";

export type LoginRequest = {
  correo: string;
  contrasena: string;
};

export type LoginResponse = {
  correo: string;
  rol: RolUsuario;
};

export type RegistrarUsuarioRequest = {
  nombres: string;
  correo: string;
  contrasena: string;
  telefono?: string | null;
  rol: RolUsuario;

  dni?: string | null;
  fechaNacimiento?: string | null;
  direccionEnvio?: string | null;

  ruc?: string | null;
  razonSocial?: string | null;
  telefono2?: string | null;
};

export type UsuarioResponse = {
  idUsuario: number;
  nombres: string;
  telefono: string | null;
  correo: string;
  fechaCreacion: string;
  fechaActualizacion?: string | null;
  estadoCuenta: "ACTIVO" | "INACTIVO";
  rol: RolUsuario;

  dni?: string | null;
  fechaNacimiento?: string | null;
  direccionEnvio?: string | null;
  ruc?: string | null;
  razonSocial?: string | null;
  telefono2?: string | null;
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

export function loginUsuario(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function registrarUsuario(
  data: RegistrarUsuarioRequest
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logoutUsuario(): Promise<void> {
  await request<void>("/api/auth/logout", {
    method: "POST",
  });
}

export function limpiarSesionLocal() {
  localStorage.removeItem("meowtfit_correo");
  localStorage.removeItem("meowtfit_rol");

  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
}