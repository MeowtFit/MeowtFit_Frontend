import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Definimos la estructura de la sesión igual que en tu UserSessionMenu
type SesionUsuario = {
  nombres: string;
  estaLogeado: boolean;
};

function obtenerDatosPerfil(): SesionUsuario {
  // Intentamos sacar el nombre guardado. Si no existe, usamos "Usuario" por defecto por seguridad.
  const nombres =
    localStorage.getItem("meowtfit_nombres") || 
    sessionStorage.getItem("meowtfit_nombres") || 
    "Usuario";

  const correo =
    localStorage.getItem("meowtfit_correo") ||
    sessionStorage.getItem("meowtfit_correo");

  const rol =
    localStorage.getItem("meowtfit_rol") ||
    sessionStorage.getItem("meowtfit_rol");

  return {
    nombres,
    estaLogeado: Boolean(correo && rol),
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [sesion, setSesion] = useState<SesionUsuario>(() => obtenerDatosPerfil());

  // Guardián de autenticación: Si no está logueado, se va al /login
  useEffect(() => {
    if (!sesion.estaLogeado) {
      navigate("/login", { replace: true });
    }
  }, [sesion.estaLogeado, navigate]);

  // Si no está logueado, evitamos renderizar el contenido mientras se procesa el redireccionamiento
  if (!sesion.estaLogeado) {
    return null;
  }

  // Extraemos la primera letra del nombre dinámicamente
  const inicialAvatar = sesion.nombres.trim() 
    ? sesion.nombres.trim().charAt(0).toUpperCase() 
    : "?";

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      {/* MAIN CON FONDO DE TELAS */}
      <main 
        className="flex flex-1 items-center justify-center p-4 sm:p-8 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop')",
        }}
      >
        {/* Capa de superposición ligera opcional */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        {/* TARJETA DE PERFIL (FLOTANTE) */}
        <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-[40px] bg-white px-8 py-12 shadow-2xl transition-all sm:px-12">
          
          {/* AVATAR CON LA INICIAL DINÁMICA */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#b43b6c] text-4xl font-bold text-white shadow-md">
            {inicialAvatar}
          </div>

          {/* NOMBRE DEL CLIENTE DINÁMICO */}
          <h1 className="mt-6 text-2xl font-medium text-gray-700 tracking-wide text-center">
            {sesion.nombres}
          </h1>

          {/* LÍNEA DIVISORIA SUPERIOR */}
          <div className="mt-6 h-[3px] w-full bg-[#b43b6c]" />

          {/* SECCIÓN DE BOTONES */}
          <div className="mt-6 flex w-full flex-col gap-4">
            <button
              type="button"
              onClick={() => navigate("/perfil/editar")}
              className="h-12 w-full rounded-md bg-[#0a7c98] text-lg font-medium text-white shadow-md transition-colors hover:bg-[#086379]"
            >
              Editar perfil
            </button>

            <button
              type="button"
              onClick={() => navigate("/historial-pedidos")}
              className="h-12 w-full rounded-md bg-[#0a7c98] text-lg font-medium text-white shadow-md transition-colors hover:bg-[#086379]"
            >
              Ver historial de pedidos
            </button>
          </div>

          {/* LÍNEA DIVISORIA INFERIOR */}
          <div className="mt-6 h-[3px] w-full bg-[#b43b6c]" />

          {/* BOTÓN VOLVER */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-[#b43b6c] transition-all hover:underline"
          >
            ← Volver
          </button>
        </div>
      </main>
    </div>
  );
}