import { ArrowRight, ClipboardList, FileText, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

function obtenerSesionUsuario() {
  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");

  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");

  return {
    correo,
    rol,
    estaLogeado: Boolean(correo && rol),
  };
}

export default function CotizacionesPage() {
  const navigate = useNavigate();
  const sesion = obtenerSesionUsuario();

  const esComerciante = sesion.rol === "COMERCIANTE";
  const esAdministrador = sesion.rol === "ADMINISTRADOR";

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-8 py-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#bd2d73]">
            Gestión de cotizaciones
          </p>

          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Cotizaciones
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Selecciona qué tipo de cotizaciones quieres revisar. Puedes ver el
            listado general o solamente las cotizaciones que ya están asociadas
            a tu atención como comerciante.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#087f99]">
              <ClipboardList size={27} />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-slate-900">
              Ver todas las cotizaciones
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Revisa todas las solicitudes de cotización registradas en el
              sistema, incluyendo pendientes, contrapropuestas, rechazadas y
              cerradas.
            </p>

            <div className="mt-6 rounded-xl bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 text-[#087f99]" size={18} />

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Listado general
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Útil para administradores o comerciantes que necesitan ver
                    las cotizaciones disponibles antes de atender una.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => navigate("/admin/cotizaciones/todas")}
              className="mt-7 h-12 w-full rounded-xl bg-[#087f99] font-bold text-white hover:bg-[#076f86]"
            >
              Ver todas
              <ArrowRight size={17} />
            </Button>
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-[#bd2d73]">
              <Handshake size={28} />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-slate-900">
              Cotizaciones que atiendo
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Revisa únicamente las cotizaciones que ya fueron asociadas a tu
              usuario comerciante, normalmente después de enviar la primera
              contrapropuesta.
            </p>

            <div className="mt-6 rounded-xl bg-pink-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <Handshake className="mt-0.5 text-[#bd2d73]" size={18} />

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Mis cotizaciones asignadas
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Aquí deberían aparecer solo las cotizaciones cuyo
                    idComerciante coincide con el comerciante autenticado.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => navigate("/admin/cotizaciones/asignadas")}
              className="mt-7 h-12 w-full rounded-xl bg-[#bd2d73] font-bold text-white hover:bg-[#a82763]"
            >
              Ver las que atiendo
              <ArrowRight size={17} />
            </Button>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-cyan-100 bg-cyan-50 px-5 py-4">
          <p className="text-sm font-bold text-[#087f99]">
            Sesión actual
          </p>

          <p className="mt-1 text-sm text-slate-600">
            Usuario:{" "}
            <span className="font-bold text-slate-800">
              {sesion.correo ?? "No identificado"}
            </span>{" "}
            · Rol:{" "}
            <span className="font-bold text-slate-800">
              {sesion.rol ?? "Sin rol"}
            </span>
          </p>

          {esComerciante && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Como comerciante, la segunda opción debe filtrar las cotizaciones
              asociadas a tu idComerciante.
            </p>
          )}

          {esAdministrador && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Como administrador, puedes revisar el listado general y también
              acceder al módulo de cotizaciones asignadas si lo necesitas.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}