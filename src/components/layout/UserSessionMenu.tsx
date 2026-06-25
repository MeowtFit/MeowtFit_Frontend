import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, UserPlus, UserRound } from "lucide-react";

type SesionUsuario = {
  correo: string | null;
  rol: string | null;
  estaLogeado: boolean;
};

function obtenerSesionUsuario(): SesionUsuario {
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

function limpiarSesionLocal() {
  localStorage.removeItem("meowtfit_correo");
  localStorage.removeItem("meowtfit_rol");

  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
}

export default function UserSessionMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const [abierto, setAbierto] = useState(false);
  const [sesion, setSesion] = useState<SesionUsuario>(() =>
    obtenerSesionUsuario()
  );

  function handleCerrarSesion() {
    limpiarSesionLocal();
    setSesion(obtenerSesionUsuario());
    setAbierto(false);
    navigate("/", { replace: true });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setSesion(obtenerSesionUsuario());
          setAbierto((actual) => !actual);
        }}
        className="grid h-10 w-10 place-items-center rounded-full text-[#087f99] transition hover:bg-cyan-50"
      >
        <UserRound size={20} />
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
          {sesion.estaLogeado ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Sesión activa
              </p>

              <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                {sesion.correo}
              </p>

              <p className="mt-1 text-xs font-medium text-[#087f99]">
                Rol: {sesion.rol}
              </p>

              <Link
                to="/perfil"
                onClick={() => setAbierto(false)}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-[#087f99] text-sm font-bold text-white transition hover:bg-[#076f86]"
              >
                Ver perfil
              </Link>

              <button
                type="button"
                onClick={handleCerrarSesion}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Mi cuenta
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Inicia sesión para comprar y agregar productos al carrito.
              </p>

              <Link
                to="/login"
                state={{ from: location.pathname }}
                onClick={() => setAbierto(false)}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-lg bg-[#087f99] text-sm font-bold text-white transition hover:bg-[#076f86]"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/signup"
                onClick={() => setAbierto(false)}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <UserPlus size={16} className="text-[#087f99]" />
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}