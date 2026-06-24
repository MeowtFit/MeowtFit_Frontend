import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();

  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");

  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");

  if (!correo || !rol) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(rol)) {
    if (rol === "ADMINISTRADOR") {
      return <Navigate to="/admin/comerciantes" replace />;
    }
    if (rol === "COMERCIANTE") {
      return <Navigate to="/admin/inventario" replace />;
    }

    localStorage.removeItem("meowtfit_correo");
    localStorage.removeItem("meowtfit_rol");
    sessionStorage.removeItem("meowtfit_correo");
    sessionStorage.removeItem("meowtfit_rol");

    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}