import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Eye, Search, ShoppingCart } from "lucide-react";

import UserSessionMenu from "@/components/layout/UserSessionMenu";
import { obtenerCarritoActivo, listarLineasPorCarrito } from "@/api/carritoApi";

// ─── Evento global para que otras páginas notifiquen cambios en el carrito ────
export const CART_UPDATED_EVENT = "cart-updated";

export function notificarCambioCarrito() {
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

// ─── HeaderIconLink ────────────────────────────────────────────────────────────

type HeaderIconLinkProps = {
  to: string;
  label: string;
  children: ReactNode;
  activeVariant: "cart" | "orders";
  badge?: number;
};

function HeaderIconLink({
  to,
  label,
  children,
  activeVariant,
  badge,
}: HeaderIconLinkProps) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      className={({ isActive }) => {
        const base =
          "relative grid h-12 w-12 place-items-center rounded-full transition-all duration-200";

        if (activeVariant === "cart") {
          return isActive
            ? `${base} bg-[#bd2d73] text-white ring-2 ring-[#bd2d73] ring-offset-4 ring-offset-white hover:bg-[#a82365]`
            : `${base} bg-[#bd2d73] text-white hover:bg-[#a82365]`;
        }

        return isActive
          ? `${base} bg-[#087f99] text-white ring-2 ring-[#087f99] ring-offset-4 ring-offset-white`
          : `${base} text-[#087f99] hover:bg-cyan-50`;
      }}
    >
      {children}

      {/* Badge numérico — solo visible cuando hay artículos */}
      {badge != null && badge > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm ring-2 ring-white"
          aria-label={`${badge} artículos en el carrito`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── CatalogLayout ─────────────────────────────────────────────────────────────

export default function CatalogLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const enVistaCliente =
    sessionStorage.getItem("meowtfit_vista_cliente") === "true";

  const [cartCount, setCartCount] = useState(0);

  // Obtener rol para decidir si mostrar el badge
  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");
  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");
  const estaLogeado = Boolean(correo && rol);
  // Mostrar badge solo a CLIENTE (o en vista cliente de Admin/Comerciante)
  const mostrarBadge =
    estaLogeado && (rol === "CLIENTE" || enVistaCliente);

  async function actualizarConteoCarrito() {
    if (!mostrarBadge) {
      setCartCount(0);
      return;
    }
    try {
      const carrito = await obtenerCarritoActivo();
      const lineas = await listarLineasPorCarrito(carrito.idCarrito);
      const total = lineas.reduce((sum, l) => sum + l.cantidad, 0);
      setCartCount(total);
    } catch {
      // Sin carrito activo → 0 artículos
      setCartCount(0);
    }
  }

  // Re-fetch en cada cambio de ruta
  useEffect(() => {
    void actualizarConteoCarrito();
  }, [location.pathname, mostrarBadge]);

  // Escuchar evento global cuando otras páginas modifiquen el carrito
  useEffect(() => {
    const handler = () => void actualizarConteoCarrito();
    window.addEventListener(CART_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
  }, [mostrarBadge]);

  function handleVolverPanel() {
    sessionStorage.removeItem("meowtfit_vista_cliente");
    navigate("/admin");
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-800">
      {/* Banner de modo vista cliente */}
      {enVistaCliente && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-400 px-6 py-2 text-sm font-semibold text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Eye size={16} />
            <span>
              Modo Vista Cliente — Estás visualizando la plataforma como la
              vería un cliente final. Las acciones transaccionales están
              deshabilitadas.
            </span>
          </div>
          <button
            type="button"
            onClick={handleVolverPanel}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-700/40 bg-amber-500/40 px-3 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-500/60"
          >
            <ArrowLeft size={13} />
            Volver al panel
          </button>
        </div>
      )}

      <header
        className="sticky top-0 z-40 border-b border-cyan-200 bg-white"
        style={enVistaCliente ? { top: "36px" } : undefined}
      >
        <div className="mx-auto flex h-[66px] max-w-7xl items-center justify-between px-6">
          <NavLink
            to="/"
            className="text-xl font-extrabold tracking-wide text-[#087f99]"
          >
            MEOWTFIT
          </NavLink>

          <div className="flex items-center gap-4 text-[#087f99]">
            <HeaderIconLink
              to="/carrito"
              label="Carrito"
              activeVariant="cart"
              badge={cartCount}
            >
              <ShoppingCart size={20} />
            </HeaderIconLink>

            <HeaderIconLink
              to="/pedidos"
              label="Mis pedidos"
              activeVariant="orders"
            >
              <ClipboardList size={20} />
            </HeaderIconLink>

            <button
              type="button"
              aria-label="Buscar"
              title="Buscar"
              className="grid h-10 w-10 place-items-center rounded-full text-[#087f99] transition hover:bg-cyan-50"
            >
              <Search size={19} />
            </button>

            <UserSessionMenu />
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
