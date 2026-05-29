import { createBrowserRouter, Navigate } from "react-router-dom";

import CatalogDetailPage from "../pages/CatalogDetailPage";
import CatalogHomePage from "../pages/CatalogHomePage";
import LoginPage from "../pages/LoginPage";

import AdminLayout from "../components/layout/AdminLayout";

import ComerciantesPage from "../pages/admin/ComerciantesPage";
import ConfiguraciónPage from "../pages/admin/ConfiguraciónPage";
import CotizacionesPage from "../pages/admin/CotizacionesPage";
import DashboardPage from "../pages/admin/DashboardPage";
import InventarioPage from "../pages/admin/InventarioPage";
import VentasPage from "../pages/admin/VentasPage";
import ComerciantesListPage from "../pages/admin/ComerciantesListPage";
import ComerciantesEditPage from "../pages/admin/ComerciantesEditPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <CatalogHomePage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/catalogDetail",
    element: <CatalogDetailPage />,
  },
  {
    path: "/admin",
    element: <AdminLayout />,
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
        path: "configuracion",
        element: <ConfiguraciónPage />,
      },
      {
        path: "comerciantes/listar",
        element: <ComerciantesListPage />,
      },
      {
        path: "comerciantes/:id/editar",
        element: <ComerciantesEditPage />,
      },
    ],
  },
]);