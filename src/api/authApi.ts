const API_BASE_URL = "http://localhost:8080";

export type RolUsuario = "ADMINISTRADOR" | "COMERCIANTE" | "CLIENTE";

export type LoginRequest = {
  correo: string;
  contrasena: string;
};

export type LoginResponse = {
  correo: string;
  rol: RolUsuario;
};

export type RegistroClienteRequest = {
  nombres: string;
  correo: string;
  contrasena: string;
  telefono: string;
  rol: "CLIENTE";
};

export type RegistroClienteResponse = {
  idUsuario: number;
  nombres: string;
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

export async function registrarUsuario(data: RegistroClienteRequest): Promise<RegistroClienteResponse> {
  const response = await fetch(`${API_BASE_URL}/api/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = "No se pudo completar el registro.";
    try {
      const errorData = await response.json();
      // Mapea el mensaje que retorne tu validación DTO de Spring Boot
      message = errorData.mensaje ?? errorData.error ?? errorData.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<RegistroClienteResponse>;
}
