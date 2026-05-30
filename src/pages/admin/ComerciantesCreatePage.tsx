import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { crearComerciante } from "@/api/comerciantesApi";

type FormState = {
  nombres: string;
  correo: string;
  telefono: string;
  contrasena: string;
};

const initialFormState: FormState = {
  nombres: "",
  correo: "",
  telefono: "",
  contrasena: "",
};

export default function ComerciantesCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialFormState);

  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState, value: string) {
    setError(null);

    // 1. Filtrar teléfono: Solo permitir números, el signo "+" y espacios " "
    if (field === "telefono") {
      // Explicación de la RegEx:
      // [^\d+ ] -> Busca todo lo que NO sea un dígito (\d), un signo de más (\+) o un espacio ( )
      // /g      -> Lo aplica de forma global a todo el texto
      const telefonoValido = value.replace(/[^\d+ ]/g, "");

      setForm((current) => ({
        ...current,
        [field]: telefonoValido,
      }));
      return;
    }

    // 2. Filtrar nombres: Evitar que escriban números en tiempo real (opcional pero recomendado)
    if (field === "nombres") {
      const sinNumeros = value.replace(/[0-9]/g, ""); // Remueve cualquier número del 0 al 9
      setForm((current) => ({
        ...current,
        [field]: sinNumeros,
      }));
      return;
    }

    // Comportamiento normal para el resto de campos
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nombres.trim()) {
      setError("El nombre del comerciante es obligatorio.");
      return;
    }

    if (form.nombres.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (!form.correo.trim()) {
      setError("El correo del comerciante es obligatorio.");
      return;
    }

    if (!form.correo.includes("@")) {
      setError("Ingresa un correo válido.");
      return;
    }

    if (!form.telefono.trim()) {
      setError("El teléfono del comerciante es obligatorio.");
      return;
    }

    // 1. Limpiamos el teléfono eliminando los espacios múltiples
    const telefonoLimpio = form.telefono.trim();

    // 2. Usamos una RegEx para capturar el prefijo (si existe) y el número local
    // Explicación: 
    // ^(\+\d+)? -> Captura opcionalmente un "+" seguido de dígitos al inicio (el prefijo)
    // \s* -> Captura cualquier espacio opcional entre el prefijo y el número
    // (.*)$     -> Captura el resto del texto (el número local)
    const matches = telefonoLimpio.match(/^(\+\d+)?\s*(.*)$/);

    // Extraemos solo la parte local (lo que va después del prefijo) y le quitamos caracteres no numéricos
    const numeroLocalSoloNumeros = matches && matches[2]
      ? matches[2].replace(/\D/g, "")
      : telefonoLimpio.replace(/\D/g, "");

    // 3. Validamos que el número local tenga los dígitos requeridos (por ejemplo, 9)
    if (numeroLocalSoloNumeros.length < 9) {
      setError("El número de teléfono local debe tener al menos 9 dígitos (sin contar el prefijo).");
      return;
    }

    if (!form.contrasena.trim()) {
      setError("La contraseña es obligatoria.");
      return;
    }

    if (form.contrasena.trim().length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres.");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      await crearComerciante({
        nombres: form.nombres.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        contrasena: form.contrasena.trim(),
        rol: "COMERCIANTE",

        dni: null,
        fechaNacimiento: null,
        direccionEnvio: null,
        ruc: null,
        razonSocial: null,
        telefono2: null,
      });

      navigate("/admin/comerciantes/listar");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo crear el comerciante.";

      setError(message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#f7f5f2]">
      <header className="flex h-[62px] items-center border-b border-zinc-100 bg-white px-6">
        <p className="text-sm text-zinc-600">
          Gestión de Comerciantes
        </p>
      </header>

      <main className="flex justify-center px-8 py-8">
        <form
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit}
          className="w-full max-w-[820px] rounded-2xl border border-zinc-100 bg-white px-9 py-8 shadow-sm"
        >
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-pink-500">
                Nuevo comerciante
              </p>

              <h1 className="text-2xl font-extrabold text-zinc-800">
                Registrar comerciante
              </h1>

              <p className="mt-2 max-w-[430px] text-sm leading-6 text-zinc-500">
                Completa la información básica para crear una nueva
                cuenta de comerciante dentro del sistema.
              </p>
            </div>

            <Button
              asChild
              type="button"
              variant="ghost"
              className="text-xs font-bold uppercase tracking-wider text-pink-500 hover:text-pink-600"
            >
              <Link to="/admin/comerciantes/">
                <ArrowLeft size={15} />
                Regresar
              </Link>
            </Button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Nombre completo
                </label>

                <Input
                  autoComplete="off"
                  value={form.nombres}
                  onChange={(event) =>
                    handleChange("nombres", event.target.value)
                  }
                  placeholder="Ej. Sofía Mendoza"
                  className="h-11 bg-zinc-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Correo electrónico
                </label>

                <Input
                  type="email"
                  autoComplete="off"
                  value={form.correo}
                  onChange={(event) =>
                    handleChange("correo", event.target.value)
                  }
                  placeholder="sofia@ejemplo.com"
                  className="h-11 bg-zinc-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Teléfono
                </label>

                <Input
                  autoComplete="off"
                  value={form.telefono}
                  onChange={(event) =>
                    handleChange("telefono", event.target.value)
                  }
                  placeholder="+51 999 999 999"
                  className="h-11 bg-zinc-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Contraseña
                </label>

                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.contrasena}
                  onChange={(event) =>
                    handleChange("contrasena", event.target.value)
                  }
                  placeholder="********"
                  className="h-11 bg-zinc-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Foto de perfil
                </label>

                <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50">
                  <div className="text-center text-zinc-400">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#087f99] shadow-sm">
                      <Camera size={22} />
                    </div>

                    <p className="text-sm font-semibold text-zinc-500">
                      Imagen referencial
                    </p>

                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                      No se guardará en la base de datos
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-2xl bg-[#f8fafb] p-6">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-800">
                  Importante ⚠️
                </h2>

                <p className="mt-4 text-sm leading-6 text-zinc-600">
                  El nuevo comerciante podrá gestionar productos,
                  catálogo e interactuar con clientes desde el panel
                  asignado.
                </p>

                <div className="mt-6 rounded-xl border border-zinc-100 bg-white p-4 text-sm text-zinc-500">
                  <p className="font-bold text-zinc-700">
                    Datos a registrar:
                  </p>

                  <p className="mt-2">
                    Rol asignado:{" "}
                    <span className="font-semibold text-zinc-700">
                      COMERCIANTE
                    </span>
                  </p>

                  <p>
                    Estado inicial:{" "}
                    <span className="font-semibold text-zinc-700">
                      ACTIVO
                    </span>
                  </p>

                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button
                  type="submit"
                  disabled={guardando}
                  className="h-11 w-full bg-[#087f99] text-white hover:bg-[#076f86]"
                >
                  {guardando ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}

                  Crear comerciante
                </Button>

                <Button
                  asChild
                  type="button"
                  variant="ghost"
                  className="h-11 w-full text-zinc-500"
                >
                  <Link to="/admin/comerciantes/">
                    Cancelar
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </section>
  );
}