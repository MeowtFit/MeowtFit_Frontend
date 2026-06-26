const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type RolUsuario = "ADMINISTRADOR" | "COMERCIANTE" | "CLIENTE";

export type LoginRequest = {
  correo: string;
  contrasena: string;
};

export type LoginResponse = {
  correo: string;
  rol: RolUsuario;
  id: number;
};

// UPDATE: Se agregaron los campos polimórficos de la BD como opcionales o nulos
export type RegistrarUsuarioRequest = {
  nombres: string;
  correo: string;
  contrasena: string;
  telefono: string;
  rol: RolUsuario;
  
  // Campos exclusivos Cliente B2C
  dni?: string | null;
  fechaNacimiento?: string | null;
  direccionEnvio?: string | null;

  // Campos exclusivos Cliente B2B (Tu regla de negocio: ruc != null identifica B2B)
  ruc?: string | null;
  razonSocial?: string | null;
  telefono2?: string | null;
};

export type UsuarioResponse = {
  idUsuario?: number;
  id?: number;
  nombres?: string;
  correo: string;
  telefono?: string;
  rol?: RolUsuario;
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
      const errorData = await response.json();
      message =
        errorData.mensaje ??
        errorData.message ??
        errorData.error ??
        message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginUsuario(
  data: LoginRequest
): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Ajusta esta ruta si tu backend usa otro endpoint.
 *
 * Ejemplos posibles según tu controller:
 * - POST /api/usuarios
 * - POST /api/usuarios/registrar
 * - POST /api/auth/register
 */
export async function registrarUsuario(
  data: RegistrarUsuarioRequest
): Promise<UsuarioResponse> {
  return request<UsuarioResponse>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logoutUsuario(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error("No se pudo cerrar sesión en el servidor.");
  }
}

export function limpiarSesionLocal() {
  localStorage.removeItem("meowtfit_correo");
  localStorage.removeItem("meowtfit_rol");
  localStorage.removeItem("meowtfit_idUsuario");
  localStorage.removeItem("meowtfit_idComerciante");

  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
  sessionStorage.removeItem("meowtfit_idUsuario");
  sessionStorage.removeItem("meowtfit_idComerciante");
}