import {
  Boxes,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarOption = {
  label: string;
  path: string;
  icon: React.ElementType;
};

const sidebarOptions: SidebarOption[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Inventario",
    path: "/admin/inventario",
    icon: Boxes,
  },
  {
    label: "Ventas",
    path: "/admin/ventas",
    icon: ChartColumn,
  },
  {
    label: "Cotizaciones",
    path: "/admin/cotizaciones",
    icon: ClipboardList,
  },
  {
    label: "Comerciantes",
    path: "/admin/comerciantes",
    icon: Store,
  },
  {
    label: "Ajustes",
    path: "/admin/configuracion",
    icon: Settings,
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[235px] flex-col justify-between border-2 border-cyan-500 bg-[#087f99] px-4 py-5 text-white">
      <div>
        <div className="px-2 pb-7 pt-2">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
            Panel Meowtfit
          </h1>

          <p className="mt-0.5 text-xs italic text-cyan-100/80">
            Moda Femenina Premium
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {sidebarOptions.map((option) => {
            const Icon = option.icon;

            return (
              <NavLink
                key={option.path}
                to={option.path}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-cyan-50/85 transition hover:bg-white/10 hover:text-white",
                    isActive && "bg-white/15 font-bold text-white"
                  )
                }
              >
                <Icon size={19} strokeWidth={2} />
                <span>{option.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-3 border-y border-dashed border-white/25 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-cyan-50">
            <UserRound size={20} />
          </div>

          <div>
            <h3 className="text-sm font-bold leading-none">Admin Meowtfit</h3>
            <p className="mt-1 text-[9px] font-bold tracking-[0.08em] text-cyan-100/75">
              SUPER USER MEOW
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="h-10 w-full bg-white text-[#087f99] hover:bg-cyan-50"
        >
          <ShoppingBag size={16} />
          Subir Producto
        </Button>
      </div>
    </aside>
  );
}