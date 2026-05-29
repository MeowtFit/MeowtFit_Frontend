import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginUsuario } from "@/api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCargando(true);
      setError(null);

      const data = await loginUsuario({
        correo: correo.trim(),
        contrasena,
      });

      if (data.rol !== "ADMINISTRADOR") {
        localStorage.removeItem("meowtfit_correo");
        localStorage.removeItem("meowtfit_rol");

        setError("No tienes permisos para ingresar al panel de administrador.");
        return;
      }

      localStorage.setItem("meowtfit_correo", data.correo);
      localStorage.setItem("meowtfit_rol", data.rol);

      navigate("/admin/comerciantes", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión.";

      setError(message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardContent className="p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Iniciar sesión</h1>

            <p className="mt-2 text-muted-foreground">Bienvenido de nuevo</p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>

              <Input
                id="email"
                type="email"
                placeholder="correo@gmail.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>

              <Input
                id="password"
                type="password"
                placeholder="********"
                value={contrasena}
                onChange={(event) => setContrasena(event.target.value)}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={cargando}>
              {cargando && <Loader2 className="animate-spin" size={17} />}
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}