import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowLeft,
    Pencil,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldOff,
    Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    cambiarEstadoComerciante,
    listarComerciantes,
    type Comerciante,
} from "@/api/comerciantesApi";

function formatearFecha(fecha: string) {
    if (!fecha) return "-";

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(fecha));
}

function estadoClass(estado: Comerciante["estadoCuenta"]) {
    return estado === "ACTIVO"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-zinc-100 text-zinc-600 border-zinc-200";
}

export default function ComerciantesListPage() {
    const [comerciantes, setComerciantes] = useState<Comerciante[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actualizandoId, setActualizandoId] = useState<number | null>(null);

    async function cargarComerciantes() {
        try {
            setCargando(true);
            setError(null);

            const data = await listarComerciantes();
            setComerciantes(data);
        } catch {
            setError("No se pudieron cargar los comerciantes.");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        void cargarComerciantes();
    }, []);

    const comerciantesFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        if (!texto) return comerciantes;

        return comerciantes.filter((comerciante) => {
            return (
                comerciante.nombres.toLowerCase().includes(texto) ||
                comerciante.correo.toLowerCase().includes(texto) ||
                comerciante.telefono.toLowerCase().includes(texto) ||
                comerciante.estadoCuenta.toLowerCase().includes(texto)
            );
        });
    }, [busqueda, comerciantes]);

    async function handleCambiarEstado(comerciante: Comerciante) {
        try {
            setActualizandoId(comerciante.idUsuario);
            setError(null);

            const actualizado = await cambiarEstadoComerciante(
                comerciante.idUsuario,
                comerciante.estadoCuenta
            );

            setComerciantes((actuales) =>
                actuales.map((item) =>
                    item.idUsuario === actualizado.idUsuario ? actualizado : item
                )
            );
        } catch {
            setError("No se pudo actualizar el estado del comerciante.");
        } finally {
            setActualizandoId(null);
        }
    }

    return (
        <section className="min-h-screen bg-[#f7f5f2]">
            <header className="flex h-[62px] items-center justify-between border-b border-zinc-100 bg-white px-6">
                <div>
                    <p className="text-sm text-zinc-500">Gestión de Comerciantes</p>
                    <h1 className="text-lg font-bold text-zinc-800">
                        Comerciantes registrados
                    </h1>
                </div>
            </header>

            <main className="px-8 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <Button asChild variant="ghost">
                        <Link to="/admin/comerciantes">
                            <ArrowLeft size={17} />
                            Volver
                        </Link>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => void cargarComerciantes()}
                        disabled={cargando}
                    >
                        <RefreshCw
                            size={16}
                            className={cargando ? "animate-spin" : ""}
                        />
                        Actualizar
                    </Button>
                </div>

                <section className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 border-b border-zinc-100 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#087f99]">
                                <Users size={20} />
                            </div>

                            <div>
                                <h2 className="text-base font-extrabold text-zinc-800">
                                    Lista de comerciantes
                                </h2>
                                <p className="text-sm text-zinc-500">
                                    Cuentas con permiso para gestionar el negocio.
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-[330px]">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                            />

                            <Input
                                value={busqueda}
                                onChange={(event) => setBusqueda(event.target.value)}
                                placeholder="Buscar por nombre, correo o teléfono"
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mx-6 mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto p-6">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                                    <th className="px-4 py-3 font-bold">ID</th>
                                    <th className="px-4 py-3 font-bold">Nombre</th>
                                    <th className="px-4 py-3 font-bold">Correo</th>
                                    <th className="px-4 py-3 font-bold">Teléfono</th>
                                    <th className="px-4 py-3 font-bold">Fecha creación</th>
                                    <th className="px-4 py-3 font-bold">Estado</th>
                                    <th className="px-16 py-3 text-right font-bold">Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cargando && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-zinc-500"
                                        >
                                            Cargando comerciantes...
                                        </td>
                                    </tr>
                                )}

                                {!cargando &&
                                    comerciantesFiltrados.map((comerciante) => (
                                        <tr
                                            key={comerciante.idUsuario}
                                            className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                                        >
                                            <td className="px-4 py-4 font-semibold text-zinc-500">
                                                #{comerciante.idUsuario}
                                            </td>

                                            <td className="px-4 py-4">
                                                <p className="font-bold text-zinc-800">
                                                    {comerciante.nombres}
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    {comerciante.rol}
                                                </p>
                                            </td>

                                            <td className="px-4 py-4 text-zinc-600">
                                                {comerciante.correo}
                                            </td>

                                            <td className="px-4 py-4 text-zinc-600">
                                                {comerciante.telefono}
                                            </td>

                                            <td className="px-4 py-4 text-zinc-600">
                                                {formatearFecha(comerciante.fechaCreacion)}
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${estadoClass(
                                                        comerciante.estadoCuenta
                                                    )}`}
                                                >
                                                    {comerciante.estadoCuenta}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button asChild type="button" variant="outline">
                                                        <Link to={`/admin/comerciantes/${comerciante.idUsuario}/editar`}>
                                                            <Pencil size={16} />
                                                            Editar
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={actualizandoId === comerciante.idUsuario}
                                                        onClick={() => void handleCambiarEstado(comerciante)}
                                                    >
                                                        {comerciante.estadoCuenta === "ACTIVO" ? (
                                                            <ShieldOff size={16} />
                                                        ) : (
                                                            <ShieldCheck size={16} />
                                                        )}

                                                        {comerciante.estadoCuenta === "ACTIVO" ? "Desactivar" : "Activar"}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                {!cargando && comerciantesFiltrados.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-zinc-500"
                                        >
                                            No se encontraron comerciantes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </section>
    );
}