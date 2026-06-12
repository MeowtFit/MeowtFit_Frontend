import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Nota: Asegúrate de exportar esta función en tu authApi
import { registrarUsuario } from "@/api/authApi"; 
import logoMeowtfit from "../assets/logo.png";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      setError("Ingresa tu nombre completo.");
      return;
    }
    if (!correo.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    if (!contrasena.trim()) {
      setError("Ingresa una contraseña.");
      return;
    }
    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!telefono.trim()) {
      setError("Ingresa un número de teléfono.");
      return;
    }

    try {
      setCargando(true);
      setError(null);

      // LLAMADA A LA API AJUSTADA
      await registrarUsuario({
        nombres: nombre.trim(), // Tu backend usa 'nombres'
        correo: correo.trim(),
        contrasena,
        telefono: telefono.trim(),
        rol: "CLIENTE",          // Tu backend necesita el rol para guardarlo en la BD
      });

      // Si todo sale fino, redirigimos al login
      navigate("/login", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo completar el registro. Inténtalo nuevamente.";

      setError(message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#f8fafc] via-[#fdfbfb] to-[#fceef5] font-sans">
      {/* HEADER */}
      <header className="flex w-full items-center justify-center pb-4 pt-8">
        <div className="flex flex-col items-center">
          <img
            src={logoMeowtfit}
            alt="Logo Meowtfit"
            className="h-20 w-auto object-contain"
          />
        </div>
      </header>

      {/* MAIN */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Card className="flex w-full max-w-4xl flex-col overflow-hidden rounded-md border-0 bg-white shadow-2xl md:flex-row">
          
          {/* COLUMNA IZQUIERDA (IMAGEN) */}
          <div
            className="relative hidden min-h-[550px] bg-cover bg-center md:flex md:w-1/2"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute bottom-10 left-10 right-10 text-white">
              <h2 className="mb-2 text-xl font-medium">Sé parte de Meowtfit</h2>
              <p className="text-sm text-gray-200">
                Crea tu cuenta y accede a colecciones exclusivas con lo mejor del diseño boutique peruano.
              </p>
            </div>
          </div>

          {/* COLUMNA DERECHA (FORMULARIO) */}
          <CardContent className="flex w-full flex-col justify-center p-8 sm:p-12 md:w-1/2">
            <div className="mb-8">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-5 flex w-fit cursor-pointer items-center text-xs font-bold uppercase tracking-wider text-[#b43b6c] transition-all hover:underline"
              >
                <ArrowLeft size={14} className="mr-2" />
                Volver
              </button>

              <h1 className="text-xl font-medium text-gray-800">
                Crear una cuenta
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Regístrate para gestionar tus pedidos y carritos.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-4">
                
                {/* NOMBRE COMPLETO */}
                <Input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="NOMBRE COMPLETO"
                  className="h-12 rounded-sm border-gray-300 placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-[#0a7c98]"
                  autoComplete="name"
                  required
                />

                {/* CORREO ELECTRÓNICO */}
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

                {/* CONTRASEÑA */}
                <div className="relative">
                  <Input
                    id="contrasena"
                    type={showPassword ? "text" : "password"}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="CONTRASEÑA"
                    className="h-12 rounded-sm border-gray-300 pr-10 placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-[#0a7c98]"
                    autoComplete="new-password"
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

                {/* TELÉFONO */}
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(event) => setTelefono(event.target.value)}
                  placeholder="TELÉFONO / CELULAR"
                  className="h-12 rounded-sm border-gray-300 placeholder:text-xs placeholder:text-gray-400 focus-visible:ring-[#0a7c98]"
                  autoComplete="tel"
                  required
                />

                {/* MENSAJE DE ERROR */}
                {error && (
                  <p className="text-xs font-medium text-red-500">{error}</p>
                )}
              </div>

              {/* BOTÓN SUBMIT */}
              <Button
                type="submit"
                disabled={cargando}
                className="mt-6 h-11 w-full rounded-sm bg-[#0a7c98] text-xs font-medium tracking-wide text-white hover:bg-[#086379]"
              >
                {cargando && <Loader2 className="animate-spin" size={16} />}
                REGISTRARME
              </Button>

              {/* ENLACE AL LOGIN */}
              <div className="mt-1 text-center text-xs text-gray-500">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  to="/login"
                  className="font-bold tracking-wide text-[#b43b6c] hover:underline"
                >
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* FOOTER */}
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
