export type RolUsuario = "ADMINISTRADOR" | "COMERCIANTE" | "CLIENTE";

const CORREO_KEY = "meowtfit_correo";
const ROL_KEY = "meowtfit_rol";

export type SesionUsuario = {
  correo: string | null;
  rol: RolUsuario | null;
  estaLogeado: boolean;
};

function normalizarRol(rol: string | null): RolUsuario | null {
  if (
    rol === "ADMINISTRADOR" ||
    rol === "COMERCIANTE" ||
    rol === "CLIENTE"
  ) {
    return rol;
  }

  return null;
}

export function obtenerSesionUsuario(): SesionUsuario {
  const correo =
    localStorage.getItem(CORREO_KEY) || sessionStorage.getItem(CORREO_KEY);

  const rolRaw =
    localStorage.getItem(ROL_KEY) || sessionStorage.getItem(ROL_KEY);

  const rol = normalizarRol(rolRaw);

  return {
    correo,
    rol,
    estaLogeado: Boolean(correo && rol),
  };
}

export function limpiarSesionLocal() {
  localStorage.removeItem(CORREO_KEY);
  localStorage.removeItem(ROL_KEY);

  sessionStorage.removeItem(CORREO_KEY);
  sessionStorage.removeItem(ROL_KEY);
}

export function obtenerRutaInicialPorRol(rol: RolUsuario | null) {
  if (rol === "ADMINISTRADOR") {
    return "/admin/comerciantes";
  }

  if (rol === "COMERCIANTE") {
    return "/admin/inventario";
  }

  if (rol === "CLIENTE") {
    return "/";
  }

  return "/login";
}