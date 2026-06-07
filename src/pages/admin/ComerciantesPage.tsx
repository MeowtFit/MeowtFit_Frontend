import { ClipboardList, PlusCircle, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";


export default function ComerciantesPage() {
  return (
    <section className="relative min-h-screen bg-[#f7f5f2]">
      <header className="flex h-[62px] items-center border-b border-zinc-100 bg-white px-6">
        <p className="text-sm text-zinc-700">Gestión de Comerciantes</p>
      </header>

      <div className="flex justify-center pt-10">
        <article className="min-h-[470px] w-[680px] rounded-xl border border-zinc-100 bg-white px-12 py-10 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-pink-500">
            Gestión de comerciantes
          </p>

          <h2 className="text-[22px] font-extrabold text-zinc-800">
            ¿Qué te gustaría hacer?
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            &gt; De aquí se encargan los comerciantes...
          </p>

          <div className="mt-14 flex flex-col gap-6">
            <Link
              to="/admin/comerciantes/listar"
              className="flex min-h-[86px] flex-col items-start gap-3 rounded-lg bg-[#cddfe5] px-6 py-5 text-left text-[#087f99] transition hover:-translate-y-0.5 hover:bg-[#d4e5ea] hover:shadow-md"
            >
              <ClipboardList size={20} />

              <span className="text-[10px] font-extrabold uppercase tracking-wide">
                Gestionar comerciantes existentes
              </span>
            </Link>

            <Link
              to="/admin/comerciantes/crear"
              className="flex min-h-[86px] flex-col items-start gap-3 rounded-lg bg-[#e3eef2] px-6 py-5 text-left text-[#087f99] transition hover:-translate-y-0.5 hover:bg-[#d4e5ea] hover:shadow-md"
            >
              <PlusCircle size={20} />

              <span className="text-[10px] font-extrabold uppercase tracking-wide">
                Agregar comerciantes
              </span>
            </Link>
          </div>
        </article>
      </div>

      <Button
        type="button"
        size="icon"
        className="fixed bottom-9 right-11 h-12 w-12 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 hover:bg-green-600"
      >
        <ShoppingBag size={18} />
      </Button>
    </section>
  );
}