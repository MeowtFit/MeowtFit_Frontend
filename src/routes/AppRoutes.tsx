import { createBrowserRouter, Navigate } from "react-router-dom";

import CatalogDetailPage from "../pages/CatalogoDetailPage";
import CatalogHomePage from "../pages/CatalogoHomePage";
import LoginPage from "../pages/LoginPage";
import OlvideContraPage from "../pages/OlvideContraPage";

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

import PedidosListPage from "../pages/PedidosListPage";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <CatalogHomePage />,
  },
  {
    // Accesible para CLIENTE y ADMINISTRADOR (validación interna en el componente)
    path: "/pedidos",
    element: <PedidosListPage />,
  },
  {
    path: "/catalogDetail/:id",
    element: <CatalogDetailPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/olvideContra",
    element: <OlvideContraPage />,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requiredRole="ADMINISTRADOR">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/comerciantes" replace />,
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
        path: "ventas",
        element: <VentasPage />,
      },
      {
        path: "cotizaciones",
        element: <CotizacionesPage />,
      },
      {
        path: "comerciantes",
        element: <ComerciantesPage />,
      },
      {
        path: "comerciantes/listar",
        element: <ComerciantesListPage />,
      },
      {
        path: "comerciantes/crear",
        element: <ComerciantesCreatePage />,
      },
      {
        path: "comerciantes/:id/editar",
        element: <ComerciantesEditPage />,
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