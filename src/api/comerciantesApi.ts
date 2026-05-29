const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export type EstadoCuenta = "ACTIVO" | "INACTIVO";

export type RolUsuario = "ADMINISTRADOR" | "COMERCIANTE" | "CLIENTE";

export type Comerciante = {
  idUsuario: number;
  nombres: string;
  telefono: string | null;
  correo: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  estadoCuenta: EstadoCuenta;
  rol: RolUsuario;

  dni: string | null;
  fechaNacimiento: string | null;
  direccionEnvio: string | null;

  ruc: string | null;
  razonSocial: string | null;
  telefono2: string | null;
};

export type CrearComercianteRequest = {
  nombres: string;
  correo: string;
<<<<<<< Updated upstream
  rol: RolUsuario;
=======
  telefono: string;
  contrasena: string;
  rol: "COMERCIANTE";

  dni?: null;
  fechaNacimiento?: null;
  direccionEnvio?: null;
  ruc?: null;
  razonSocial?: null;
  telefono2?: null;
};

export type EditarComercianteRequest = {
  nombres: string;
  correo: string;
  telefono: string;
  rol: "COMERCIANTE";

  dni?: null;
  fechaNacimiento?: null;
  direccionEnvio?: null;
  ruc?: null;
  razonSocial?: null;
  telefono2?: null;
>>>>>>> Stashed changes
};

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
      message = data.message ?? data.error ?? data.mensaje ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function listarComerciantes() {
  return request<Comerciante[]>("/api/usuarios/comerciantes");
}

export function buscarComerciantePorId(idUsuario: number) {
  return request<Comerciante>(`/api/usuarios/${idUsuario}`);
}

export function crearComerciante(data: CrearComercianteRequest) {
  return request<Comerciante>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function editarComerciante(
  idUsuario: number,
  data: EditarComercianteRequest
) {
  return request<Comerciante>(`/api/usuarios/${idUsuario}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function cambiarEstadoComerciante(
  idUsuario: number,
  estadoActual: EstadoCuenta
) {
  const accion = estadoActual === "ACTIVO" ? "desactivar" : "activar";

  return request<Comerciante>(`/api/usuarios/${idUsuario}/${accion}`, {
    method: "PATCH",
  });
}