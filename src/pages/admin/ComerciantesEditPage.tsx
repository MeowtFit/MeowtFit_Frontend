import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    buscarComerciantePorId,
    editarComerciante,
    type Comerciante,
    type EstadoCuenta,
} from "@/api/comerciantesApi";

type FormState = {
    nombres: string;
    correo: string;
    telefono: string;
    estadoCuenta: EstadoCuenta;
};

const initialFormState: FormState = {
    nombres: "",
    correo: "",
    telefono: "",
    estadoCuenta: "ACTIVO",
};

export default function ComerciantesEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const idUsuario = Number(id);

    const [form, setForm] = useState<FormState>(initialFormState);
    const [comerciante, setComerciante] = useState<Comerciante | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarComerciante() {
            if (!idUsuario || Number.isNaN(idUsuario)) {
                setError("El ID del comerciante no es válido.");
                setCargando(false);
                return;
            }

            try {
                setCargando(true);
                setError(null);

                const data = await buscarComerciantePorId(idUsuario);

                setComerciante(data);
                setForm({
                    nombres: data.nombres ?? "",
                    correo: data.correo ?? "",
                    telefono: data.telefono ?? "",
                    estadoCuenta: data.estadoCuenta,
                });
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "No se pudo cargar el comerciante.";

                setError(message);
            } finally {
                setCargando(false);
            }
        }

        void cargarComerciante();
    }, [idUsuario]);

    function handleChange(field: keyof FormState, value: string) {
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

        if (!form.correo.trim()) {
            setError("El correo del comerciante es obligatorio.");
            return;
        }

        if (!form.telefono.trim()) {
            setError("El teléfono del comerciante es obligatorio.");
            return;
        }

        try {
            setGuardando(true);
            setError(null);

            await editarComerciante(idUsuario, {
                nombres: form.nombres.trim(),
                correo: form.correo.trim(),
                telefono: form.telefono.trim(),
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
                    : "No se pudieron guardar los cambios.";

            setError(message);
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <section className="min-h-screen bg-[#f7f5f2]">
                <header className="flex h-[62px] items-center border-b border-zinc-100 bg-white px-6">
                    <p className="text-sm text-zinc-600">Gestión de Comerciantes</p>
                </header>

                <main className="flex min-h-[calc(100vh-62px)] items-center justify-center">
                    <div className="flex items-center gap-3 text-sm font-medium text-zinc-500">
                        <Loader2 className="animate-spin" size={18} />
                        Cargando comerciante...
                    </div>
                </main>
            </section>
        );
    }

    return (
        <section className="min-h-screen bg-[#f7f5f2]">
            <header className="flex h-[62px] items-center border-b border-zinc-100 bg-white px-6">
                <p className="text-sm text-zinc-600">Gestión de Comerciantes</p>
            </header>

            <main className="flex justify-center px-8 py-8">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-[820px] rounded-2xl border border-zinc-100 bg-white px-9 py-8 shadow-sm"
                >
                    <div className="mb-7 flex items-start justify-between gap-4">
                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-pink-500">
                                Editar comerciante
                            </p>

                            <h1 className="text-2xl font-extrabold text-zinc-800">
                                Actualizar datos del comerciante
                            </h1>

                            <p className="mt-2 max-w-[430px] text-sm leading-6 text-zinc-500">
                                Modifica la información básica de la cuenta. El usuario seguirá
                                teniendo permisos de comerciante.
                            </p>
                        </div>

                        <Button
                            asChild
                            type="button"
                            variant="ghost"
                            className="text-xs font-bold uppercase tracking-wider text-pink-500 hover:text-pink-600"
                        >
                            <Link to="/admin/comerciantes/listar">
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
                                    value={form.nombres}
                                    onChange={(event) =>
                                        handleChange("nombres", event.target.value)
                                    }
                                    placeholder="Ej. Sofía Mendoza"
                                    className="h-11 bg-zinc-50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                    Correo electrónico
                                </label>

                                <Input
                                    type="email"
                                    value={form.correo}
                                    onChange={(event) =>
                                        handleChange("correo", event.target.value)
                                    }
                                    placeholder="sofia@ejemplo.com"
                                    className="h-11 bg-zinc-50"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                    Teléfono
                                </label>

                                <Input
                                    value={form.telefono}
                                    onChange={(event) =>
                                        handleChange("telefono", event.target.value)
                                    }
                                    placeholder="+51 999 999 999"
                                    className="h-11 bg-zinc-50"
                                    required
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                        Rol
                                    </label>

                                    <Input
                                        value="COMERCIANTE"
                                        readOnly
                                        className="h-11 bg-zinc-100 font-semibold text-zinc-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                                        Estado de cuenta
                                    </label>

                                    <Input
                                        value={form.estadoCuenta}
                                        readOnly
                                        className="h-11 bg-zinc-100 font-semibold text-zinc-500"
                                    />
                                </div>
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
                                    Este comerciante podrá gestionar productos, catálogo e
                                    interactuar con clientes desde el panel asignado.
                                </p>

                                <div className="mt-6 rounded-xl border border-zinc-100 bg-white p-4 text-sm text-zinc-500">
                                    <p className="font-bold text-zinc-700">
                                        Datos del registro
                                    </p>

                                    <p className="mt-2">
                                        ID:{" "}
                                        <span className="font-semibold text-zinc-700">
                                            #{comerciante?.idUsuario}
                                        </span>
                                    </p>

                                    <p>
                                        Estado actual:{" "}
                                        <span className="font-semibold text-zinc-700">
                                            {form.estadoCuenta}
                                        </span>
                                    </p>

                                    <p>
                                        Rol:{" "}
                                        <span className="font-semibold text-zinc-700">
                                            COMERCIANTE
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
                                    Guardar cambios
                                </Button>

                                <Button
                                    asChild
                                    type="button"
                                    variant="ghost"
                                    className="h-11 w-full text-zinc-500"
                                >
                                    <Link to="/admin/comerciantes/listar">Cancelar</Link>
                                </Button>
                            </div>
                        </aside>
                    </div>
                </form>
            </main>
        </section>
    );
}