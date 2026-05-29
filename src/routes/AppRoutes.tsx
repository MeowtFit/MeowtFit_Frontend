import { createBrowserRouter } from "react-router-dom"

import CatalogDetailPage from "../pages/CatalogDetailPage"
import CatalogHomePage from "../pages/CatalogHomePage"
import LoginPage from "../pages/LoginPage"
import ForgotPasswordPage from "../pages/ForgotPasswordPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <CatalogHomePage />,
  },
  {
    path: "/login",
    element: <LoginPage/>,
  },
  {
    path: "/catalogDetail",
    element: <CatalogDetailPage />,
  },
  {
    path: "/forgotPassword",
    element: <ForgotPasswordPage />,
  }
])