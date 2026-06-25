import type { ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Eye, Search, ShoppingCart } from "lucide-react";

import UserSessionMenu from "@/components/layout/UserSessionMenu";

type HeaderIconLinkProps = {
  to: string;
  label: string;
  children: ReactNode;
  activeVariant: "cart" | "orders";
};

function HeaderIconLink({
  to,
  label,
  children,
  activeVariant,
}: HeaderIconLinkProps) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      title={label}
      className={({ isActive }) => {
        const base =
          "grid h-12 w-12 place-items-center rounded-full transition-all duration-200";

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
    </NavLink>
  );
}

export default function CatalogLayout() {
  const navigate = useNavigate();
  const enVistaCliente =
    sessionStorage.getItem("meowtfit_vista_cliente") === "true";

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

      <header className="sticky top-0 z-40 border-b border-cyan-200 bg-white"
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