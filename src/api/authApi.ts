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

export async function loginUsuario(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = "Correo o contraseña incorrectos.";

    try {
      const errorData = await response.json();
      message = errorData.mensaje ?? errorData.error ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json() as Promise<LoginResponse>;
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

  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
}