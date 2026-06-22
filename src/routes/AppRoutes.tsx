import { createBrowserRouter, Navigate } from "react-router-dom";

import CatalogDetailPage from "../pages/CatalogoDetailPage";
import CatalogHomePage from "../pages/CatalogoHomePage";

import SignUpPage from "../pages/SignUpPage";
import LoginPage from "../pages/LoginPage";
import OlvideContraPage from "../pages/OlvideContraPage";
import RecuperarContraPage from "../pages/RecuperarContraPage";

import CarritoPage from "../pages/CarritoPage";
import PedidosListPage from "../pages/PedidosListPage";

import CatalogLayout from "../components/layout/CatalogLayout";
import AdminLayout from "../components/layout/AdminLayout";

import ComerciantesPage from "../pages/admin/ComerciantesPage";
import ComerciantesCreatePage from "../pages/admin/ComerciantesCreatePage";
import ComerciantesListPage from "../pages/admin/ComerciantesListPage";
import ComerciantesEditPage from "../pages/admin/ComerciantesEditPage";

import ConfiguraciónPage from "../pages/admin/ConfiguraciónPage";
import CotizacionesPage from "../pages/admin/CotizacionesPage";
import DashboardPage from "../pages/admin/DashboardPage";
import InventarioPage from "../pages/admin/InventarioPage";
import VentasPage from "../pages/admin/VentasPage";

import ProductoNuevoPage from "../pages/admin/ProductoNuevoPage";
import ProductoEditarPage from "../pages/admin/ProductoEditarPage";
import ProductoNuevaVariantePage from "../pages/admin/ProductoNuevaVariantePage";

import ProtectedRoute from "./ProtectedRoute";

function AdminIndexRedirect() {
  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");

  if (rol === "ADMINISTRADOR") {
    return <Navigate to="/admin/comerciantes" replace />;
  }
  return <Navigate to="/admin/inventario" replace />;
}

export const router = createBrowserRouter([
  {
    element: <CatalogLayout />,
    children: [
      {
        path: "/",
        element: <CatalogHomePage />,
      },
      {
        path: "/catalogDetail/:id",
        element: <CatalogDetailPage />,
      },
      {
        path: "/carrito",
        element: <CarritoPage />,
      },
      {
        path: "/pedidos",
        element: <PedidosListPage />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignUpPage />,
  },
  {
    path: "/olvideContra",
    element: <OlvideContraPage />,
  },
  {
    path: "/recuperar-password",
    element: <RecuperarContraPage />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["ADMINISTRADOR", "COMERCIANTE"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminIndexRedirect />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "inventario",
        element: <InventarioPage />,
      },
      {
        path: "inventario/crear",
        element: <ProductoNuevoPage />,
      },
      {
        path: "inventario/:id/editar/:idColor",
        element: <ProductoEditarPage />,
      },
      {
        path: "inventario/:id/agregarVariante",
        element: <ProductoNuevaVariantePage />,
      },
      {
        path: "ventas",
        element: <VentasPage />,
      },
      {
        path: "cotizaciones",
        element: <CotizacionesPage />,
      },
      {
        path: "comerciantes",
        element: (
          <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
            <ComerciantesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "comerciantes/listar",
        element: (
          <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
            <ComerciantesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "comerciantes/crear",
        element: (
          <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
            <ComerciantesCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "comerciantes/:id/editar",
        element: (
          <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
            <ComerciantesEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "configuracion",
        element: <ConfiguraciónPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);