import { createBrowserRouter } from "react-router-dom"

import CatalogDetailPage from "../pages/CatalogDetailPage"
import CatalogHomePage from "../pages/CatalogHomePage"
import LoginPage from "../pages/LoginPage"

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
])