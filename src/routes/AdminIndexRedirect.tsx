import { Navigate } from "react-router-dom";

import {
  obtenerRutaInicialPorRol,
  obtenerSesionUsuario,
} from "./authStorage";

export default function AdminIndexRedirect() {
  const sesion = obtenerSesionUsuario();

  return <Navigate to={obtenerRutaInicialPorRol(sesion.rol)} replace />;
}