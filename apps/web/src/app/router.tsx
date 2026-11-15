import { Navigate, createBrowserRouter } from "react-router-dom";
import { CatalogPage } from "../features/admin-catalog/CatalogPage";
import { DashboardPage } from "../features/admin-dashboard/DashboardPage";
import { OrdersBoard } from "../features/admin-orders/OrdersBoard";
import { SettingsPage } from "../features/admin-settings/SettingsPage";
import { LoginPage, RegisterPage } from "../features/auth/AuthPages";
import { CheckoutPage } from "../features/checkout/CheckoutPage";
import { OrderSentPage } from "../features/checkout/OrderSentPage";
import { MenuPage } from "../features/menu/MenuPage";
import { AdminLayout } from "./AdminLayout";
import { LandingPage } from "./LandingPage";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/cadastro", element: <RegisterPage /> },

  // Cliente final
  { path: "/r/:slug", element: <MenuPage /> },
  { path: "/r/:slug/checkout", element: <CheckoutPage /> },
  { path: "/r/:slug/pedido/:number", element: <OrderSentPage /> },

  // Painel do restaurante
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <OrdersBoard /> },
      { path: "cardapio", element: <CatalogPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "configuracoes", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
