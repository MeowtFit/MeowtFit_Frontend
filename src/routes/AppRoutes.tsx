import { createBrowserRouter, Navigate } from "react-router-dom";

import CatalogDetailPage from "../pages/cliente/catalogo/CatalogoDetailPage";
import CatalogHomePage from "../pages/cliente/catalogo/CatalogoHomePage";

import SignUpPage from "../pages/login/SignUpPage";
import LoginPage from "../pages/login/LoginPage";
import OlvideContraPage from "../pages/login/OlvideContraPage";
import RecuperarContraPage from "../pages/login/RecuperarContraPage";
import PerfilUsuarioPage from "../pages/login/PerfilUsuarioPage";

import CarritoPage from "../pages/cliente/carrito/CarritoPage";
import PedidosListPage from "../pages/cliente/pedido/PedidosListPage";

import CotizacionCreatePage from "../pages/cliente/cotizacion/CotizacionCreatePage";
import CotizacionesClientePage from "../pages/cliente/cotizacion/CotizacionClientePage";
import CotizacionClienteDetailPage from "../pages/cliente/cotizacion/CotizacionDetailPage";
import PedidosClientePage from "../pages/cliente/pedido/PedidosClientePage";

import PersonalizarPrenda from "../pages/PersonalizarPrenda";

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
import PedidosGestionPage from "../pages/admin/PedidosGestionPage";
import PedidosValidarPagoPage from "../pages/admin/PedidosValidarPagoPage";

import ProductoNuevoPage from "../pages/admin/ProductoNuevoPage";
import ProductoEditarPage from "../pages/admin/ProductoEditarPage";
import ProductoNuevaVariantePage from "../pages/admin/ProductoNuevaVariantePage";

import CotizacionesTodasPage from "../pages/admin/cotizacion/CotizacionesTodasPage";
import CotizacionesAsignadasPage from "../pages/admin/cotizacion/CotizacionesAsignadasPage";
import CotizacionAdminDetailPage from "../pages/admin/cotizacion/CotizacionesDetailPage";

import ProtectedRoute from "./ProtectedRoute";
import AdminIndexRedirect from "./AdminIndexRedirect";

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
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <CarritoPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/pedidos",
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <PedidosListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/historialPedidos",
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <PedidosClientePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cotizaciones",
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <CotizacionesClientePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cotizaciones/crear",
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <CotizacionCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cotizaciones/:id",
        element: (
          <ProtectedRoute allowedRoles={["CLIENTE"]}>
            <CotizacionClienteDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/personalizar/:id",
        element: <PersonalizarPrenda />,
      },
    ],
  },
  {
    path: "/perfil",
    element: (
      <ProtectedRoute allowedRoles={["CLIENTE", "ADMINISTRADOR", "COMERCIANTE"]}>
        <PerfilUsuarioPage />
      </ProtectedRoute>
    ),
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
        element: (
          <ProtectedRoute allowedRoles={["ADMINISTRADOR"]}>
            <DashboardPage />
          </ProtectedRoute>
        ),
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
        path: "cotizaciones/todas",
        element: <CotizacionesTodasPage />,
      },
      {
        path: "cotizaciones/asignadas",
        element: <CotizacionesAsignadasPage />,
      },
      {
        path: "cotizaciones/:id",
        element: <CotizacionAdminDetailPage />,
      },

      {
        path: "pedidos",
        element: <PedidosGestionPage />,
      },
      {
        path: "pedidos/validarPago/:id",
        element: <PedidosValidarPagoPage />,
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