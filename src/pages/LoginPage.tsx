import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { loginUsuario } from "@/api/authApi";
import logoMeowtfit from "../assets/logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!correo.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    if (!contrasena.trim()) {
      setError("Ingresa tu contraseña.");
      return;
    }

    try {
      setCargando(true);
      setError(null);

      const data = await loginUsuario({
        correo: correo.trim(),
        contrasena,
      });

      const rolNormalizado = data.rol?.toUpperCase();

      localStorage.removeItem("meowtfit_correo");
      localStorage.removeItem("meowtfit_rol");
      sessionStorage.removeItem("meowtfit_correo");
      sessionStorage.removeItem("meowtfit_rol");

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("meowtfit_correo", data.correo);
      storage.setItem("meowtfit_rol", rolNormalizado);

      if (rolNormalizado === "ADMINISTRADOR") {
        navigate("/admin/comerciantes", { replace: true });
        return;
      }

      if (rolNormalizado === "CLIENTE") {
        navigate(redirectTo, { replace: true });
        return;
      }

      if (rolNormalizado === "COMERCIANTE") {
        setError("El acceso para comerciantes todavía no está habilitado.");
        localStorage.removeItem("meowtfit_correo");
        localStorage.removeItem("meowtfit_rol");
        sessionStorage.removeItem("meowtfit_correo");
        sessionStorage.removeItem("meowtfit_rol");
        return;
      }

      setError("Rol de usuario no reconocido.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo iniciar sesión. Inténtalo nuevamente.";

      setError(message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#f8fafc] via-[#fdfbfb] to-[#fceef5] font-sans">
      <header className="flex w-full items-center justify-center pb-4 pt-8">
        <div className="flex flex-col items-center">
          <img
            src={logoMeowtfit}
            alt="Logo Meowtfit"
            className="h-20 w-auto object-contain"
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="flex w-full max-w-4xl flex-col overflow-hidden rounded-md border-0 bg-white shadow-2xl md:flex-row">
          <div
            className="relative hidden min-h-[550px] bg-cover bg-center md:flex md:w-1/2"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-10 left-10 right-10 text-white">
              <h2 className="mb-2 text-xl font-medium">Inspiración local</h2>
              <p className="text-sm text-gray-200">
                Descubre la esencia de la moda boutique con sello peruano.
              </p>
            </div>
          </div>

          <CardContent className="flex w-full flex-col justify-center p-8 sm:p-12 md:w-1/2">
            <div className="mb-8">
              {/* Botón de regreso */}
                <button onClick={() => navigate(-1)}
                className="cursor-pointer flex items-center text-[#b43b6c] text-xs font-bold uppercase tracking-wider hover:underline mb-5 w-fit transition-all"
                >
                <ArrowLeft size={14} className="mr-2" />
                Volver
                </button>
              <h1 className="text-xl font-medium text-gray-800">
                Bienvenida de nuevo
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Accede a tu cuenta exclusiva de Meowtfit.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-4">
                <Input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  placeholder="CORREO ELECTRÓNICO"
                  className="h-12 rounded-sm border-gray-300 placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-[#0a7c98]"
                  autoComplete="email"
                  required
                />

                <div className="relative">
                  <Input
                    id="contrasena"
                    type={showPassword ? "text" : "password"}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="CONTRASEÑA"
                    className="h-12 rounded-sm border-gray-300 pr-10 placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-[#0a7c98]"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((actual) => !actual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-500">{error}</p>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-3.5 w-3.5 rounded-sm border-gray-300 text-[#0a7c98] focus:ring-[#0a7c98]"
                  />
                  Recordarme
                </label>

                <Link
                  to="/olvideContra"
                  className="font-semibold tracking-wide text-[#b43b6c] hover:underline"
                >
                  Olvidé mi contraseña
                </Link>
              </div>

              <Button
                type="submit"
                disabled={cargando}
                className="mt-6 h-11 w-full rounded-sm bg-[#0a7c98] text-xs font-medium tracking-wide text-white hover:bg-[#086379]"
              >
                {cargando && <Loader2 className="animate-spin" size={16} />}
                INICIAR SESIÓN
              </Button>

              <div className="mb-2 mt-6 text-center text-xs text-gray-500">
                Accede a tu cuenta exclusiva de Meowtfit.
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="flex w-full flex-col items-center justify-between px-4 py-6 text-xs text-gray-500 md:flex-row md:px-12">
        <div className="mb-4 text-sm font-bold text-gray-900 md:mb-0">
          Meowtfit
        </div>

        <div className="mb-4 flex flex-wrap justify-center gap-4 md:mb-0 md:gap-8">
          <a href="#" className="transition-colors hover:text-gray-800">
            Guía de Tallas
          </a>
          <a href="#" className="transition-colors hover:text-gray-800">
            Envíos y Retornos
          </a>
          <a href="#" className="transition-colors hover:text-gray-800">
            Sostenibilidad
          </a>
          <a href="#" className="transition-colors hover:text-gray-800">
            Contacto
          </a>
        </div>

        <div className="text-center text-[10px] md:text-right md:text-xs">
          © 2026 Meowtfit.
        </div>
      </footer>
    </div>
  );
}