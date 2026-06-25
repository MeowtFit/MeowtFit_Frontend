import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  limpiarSesionLocal,
  obtenerRutaInicialPorRol,
  obtenerSesionUsuario,
  type RolUsuario,
} from "./authStorage";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: RolUsuario[];
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const sesion = obtenerSesionUsuario();

  const from = `${location.pathname}${location.search}`;

  if (!sesion.estaLogeado) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (!sesion.rol) {
    limpiarSesionLocal();
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (allowedRoles && !allowedRoles.includes(sesion.rol)) {
    const rutaSegura = obtenerRutaInicialPorRol(sesion.rol);

    return <Navigate to={rutaSegura} replace />;
  }

  return <>{children}</>;
}