import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ClipboardList, Search, ShoppingCart } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-cyan-200 bg-white">
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