import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import logoMeowtfit from "../../assets/logo.png";
import fondoPerfil from "../../assets/ropa.jpg";

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

function limpiarSesionLocal() {
  localStorage.removeItem("meowtfit_correo");
  localStorage.removeItem("meowtfit_rol");

  sessionStorage.removeItem("meowtfit_correo");
  sessionStorage.removeItem("meowtfit_rol");
}

function obtenerNombreDesdeCorreo(correo: string | null) {
  if (!correo) return "Usuario";

  const nombreBase = correo.split("@")[0] ?? "Usuario";

  return nombreBase
    .replace(/[._-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

export default function PerfilUsuarioPage() {
  const navigate = useNavigate();
  const sesion = obtenerSesionUsuario();

  const nombrePerfil = useMemo(
    () => obtenerNombreDesdeCorreo(sesion.correo),
    [sesion.correo]
  );

  const inicial = nombrePerfil.charAt(0).toUpperCase();

  function handleCerrarSesion() {
    limpiarSesionLocal();
    navigate("/", { replace: true });
  }

  if (!sesion.estaLogeado) {
    navigate("/login", {
      replace: true,
      state: {
        from: "/perfil",
      },
    });

    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-[76px] items-center justify-center border-b border-cyan-200 bg-white">
        <Link to="/">
          <img
            src={logoMeowtfit}
            alt="Meowtfit"
            className="h-14 w-auto object-contain"
          />
        </Link>
      </header>

      <main
        className="flex min-h-[620px] flex-1 items-center justify-center bg-cover bg-center px-6 py-10"
        style={{
          backgroundImage: `url(${fondoPerfil})`,
        }}
      >
        <section className="w-full max-w-[430px] rounded-[56px] bg-white px-11 py-16 text-center shadow-[0_24px_35px_rgba(0,0,0,0.35)]">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#bd2d73] text-6xl font-extrabold text-white">
            {inicial}
          </div>

          <h1 className="mt-5 text-3xl font-medium text-zinc-700">
            {nombrePerfil}
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-400">
            {sesion.correo}
          </p>

          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[#087f99]">
            Rol: {sesion.rol}
          </p>

          <div className="mx-auto mt-6 h-[5px] w-full bg-[#bd2d73]" />

          <div className="mt-5 space-y-4">
            {/* NO ESTA EN EL ERS -> PA LA OTRA ITERACION SERA */}
            {/* Aquí puedes agregar más botones o enlaces según sea necesario 
            <button
              type="button"
              className="h-14 w-full rounded-md bg-[#087f99] text-2xl font-extrabold text-white shadow-lg shadow-slate-300 transition hover:bg-[#076f86]"
            >
              Editar perfil
            </button>
            */}

            <Link
              to="/historialPedidos"
              className="flex h-14 w-full items-center justify-center rounded-md bg-[#087f99] text-2xl font-extrabold text-white shadow-lg shadow-slate-300 transition hover:bg-[#076f86]"
            >
              Ver historial de pedidos
            </Link>

            <Link
              to="/cotizaciones"
              className="flex h-14 w-full items-center justify-center rounded-md bg-[#087f99] text-2xl font-extrabold text-white shadow-lg shadow-slate-300 transition hover:bg-[#076f86]"
            >
              Ver cotizaciones
            </Link>
          </div>

          <div className="mx-auto mt-6 h-[5px] w-full bg-[#bd2d73]" />

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-7 text-xs font-bold uppercase tracking-[0.15em] text-[#bd2d73] transition hover:underline"
          >
            Volver
          </button>

          <button
            type="button"
            onClick={handleCerrarSesion}
            className="mt-5 block w-full text-xs font-bold uppercase tracking-[0.15em] text-red-500 transition hover:underline"
          >
            Cerrar sesión
          </button>
        </section>
      </main>

      <footer className="flex min-h-[120px] flex-col items-center justify-between gap-4 border-t border-slate-100 bg-white px-8 py-8 text-center md:flex-row md:text-left">
        <h2 className="text-lg font-extrabold uppercase tracking-[0.18em] text-slate-800">
          Meowtfit Boutique
        </h2>

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
          Contactanos: 999 999 999 - 989 989 989
        </p>

        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
          © 2026 Meowtfit Boutique.
          <br />
          All rights reserved.
        </p>
      </footer>
    </div>
  );
}