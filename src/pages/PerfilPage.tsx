import { useNavigate } from "react-router-dom";

// NOTA: Asumo que estos datos vendrán de tu contexto de autenticación o estado global.
// Puedes cambiarlos por props o cargarlos mediante un useEffect.
interface ProfilePageProps {
  userNombres?: string;
}

export default function ProfilePage({ userNombres = "Saco'S" }: ProfilePageProps) {
  const navigate = useNavigate();

  // Extraemos la primera letra del nombre de manera segura y la pasamos a mayúscula
  const inicialAvatar = userNombres.trim() ? userNombres.trim().charAt(0).toUpperCase() : "?";

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
        {/* Capa de superposición ligera opcional si deseas oscurecer un poco el fondo */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />

        {/* TARJETA DE PERFIL (FLOTANTE) */}
        <div className="relative z-10 flex w-full max-w-md flex-col items-center rounded-[40px] bg-white px-8 py-12 shadow-2xl transition-all sm:px-12">
          
          {/* AVATAR CON LA INICIAL */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#b43b6c] text-4xl font-bold text-white shadow-md">
            {inicialAvatar}
          </div>

          {/* NOMBRE DEL CLIENTE */}
          <h1 className="mt-6 text-2xl font-medium text-gray-700 tracking-wide text-center">
            {userNombres}
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
              onClick={() => navigate("/cotizaciones")}
              className="h-12 w-full rounded-md bg-[#0a7c98] text-lg font-medium text-white shadow-md transition-colors hover:bg-[#086379]"
            >
              Ver cotizaciones
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