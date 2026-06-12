import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    listarCategorias,
    listarColores,
    buscarProductoPorId,
    obtenerVariantesPorProducto,
    crearVarianteProducto,
    type Categoria,
    type Color,
    type VarianteProducto,
} from "@/api/productosApi";

// Diccionario de tallas dinámicas
const OPCIONES_TALLAS: Record<string, string[]> = {
    'blusas': ['S', 'M', 'L', 'XL'],
    'vestidos': ['S', 'M', 'L', 'XL'],
    'casacas': ['S', 'M', 'L', 'XL'],
    'pantalones': ['28', '30', '32', '34'],
    'jeans': ['28', '30', '32', '34'],
};

export default function ProductoNuevaVariantePage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Estados de carga y error
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listas maestras
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [colores, setColores] = useState<Color[]>([]);

    // Datos del producto
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [precioBase, setPrecioBase] = useState("");
    const [idCategoria, setIdCategoria] = useState("");
    const [imagenUrl, setImagenUrl] = useState("");

    // Variantes existentes del producto en BD
    const [variantesExistentes, setVariantesExistentes] = useState<VarianteProducto[]>([]);

    // Nuevas variantes locales temporales (para los colores no utilizados)
    const [variantes, setVariantes] = useState<Array<{ talla: string; idColor: number; colorNombre: string; stockDisponible: number }>>([]);

    // Campos para añadir nueva variante local
    const [tallaSeleccionada, setTallaSeleccionada] = useState("");
    const [idColorSeleccionado, setIdColorSeleccionado] = useState("");
    const [stockInput, setStockInput] = useState("0");
    const [errorVariante, setErrorVariante] = useState<string | null>(null);

    const preventInvalidCharsStock = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
            e.preventDefault();
        }
    };

    // 1. Cargar datos del producto e inventario actual
    useEffect(() => {
        const cargarDatos = async () => {
            if (!id) return;
            try {
                setCargando(true);
                setError(null);

                const [dataCategorias, dataColores, dataProducto, dataVariantes] = await Promise.all([
                    listarCategorias(),
                    listarColores(),
                    buscarProductoPorId(Number(id)),
                    obtenerVariantesPorProducto(Number(id)).catch(() => [] as VarianteProducto[])
                ]);

                setCategorias(dataCategorias);
                setColores(dataColores);

                setNombre(dataProducto.nombre || "");
                setDescripcion(dataProducto.descripcion || "");
                setPrecioBase(dataProducto.precioBase?.toString() || "");

                const catId = dataProducto.idCategoria ?? dataProducto.categoria?.idCategoria;
                setIdCategoria(catId ? catId.toString() : "");
                setImagenUrl(dataProducto.imagenUrl || "");

                setVariantesExistentes(dataVariantes || []);
            } catch (err: any) {
                console.error("Error al cargar producto:", err);
                setError(err.message || "No se pudieron cargar los datos del producto.");
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [id]);

    // 2. Obtener colores ya utilizados en la base de datos para este producto
    const coloresUtilizadosIds = useMemo(() => {
        return variantesExistentes.map(v => v.idColor).filter(Boolean) as number[];
    }, [variantesExistentes]);

    // 3. Filtrar colores para mostrar solo los que el producto NO utiliza
    const coloresDisponibles = useMemo(() => {
        return colores.filter(c => !coloresUtilizadosIds.includes(c.idColor));
    }, [colores, coloresUtilizadosIds]);

    // 4. Agrupar variantes existentes del producto por color (para el sidebar derecho)
    const coloresAgrupados = useMemo(() => {
        const mapa = new Map<number, { color: Color; variantes: VarianteProducto[] }>();
        variantesExistentes.forEach((v) => {
            if (!v.idColor || !v.color) return;
            if (!mapa.has(v.idColor)) {
                mapa.set(v.idColor, { color: v.color, variantes: [] });
            }
            mapa.get(v.idColor)!.variantes.push(v);
        });
        return Array.from(mapa.values());
    }, [variantesExistentes]);

    // 5. Obtener tallas dinámicas por categoría
    const categoriaActual = categorias.find(c => c.idCategoria === Number(idCategoria));
    const tallasDisponibles = categoriaActual
        ? (Object.entries(OPCIONES_TALLAS).find(([key]) => categoriaActual.nombre.toLowerCase().includes(key))?.[1] || ['S', 'M', 'L', 'XL'])
        : ['S', 'M', 'L', 'XL'];

    // 6. Agregar variante localmente
    const handleAgregarVariante = () => {
        setErrorVariante(null);

        if (!tallaSeleccionada) {
            setErrorVariante("Por favor, selecciona una talla.");
            return;
        }
        if (!idColorSeleccionado) {
            setErrorVariante("Por favor, selecciona un color.");
            return;
        }

        const colorObj = colores.find(c => c.idColor === Number(idColorSeleccionado));
        if (!colorObj) {
            setErrorVariante("El color seleccionado no es válido.");
            return;
        }

        // Evitar duplicados exactos talla + color locales
        const existe = variantes.some(v => v.talla === tallaSeleccionada && v.idColor === colorObj.idColor);
        if (existe) {
            setErrorVariante("Esta combinación de talla y color ya está agregada.");
            return;
        }

        setVariantes([
            ...variantes,
            {
                talla: tallaSeleccionada,
                idColor: colorObj.idColor,
                colorNombre: colorObj.nombre,
                stockDisponible: Number(stockInput) || 0
            }
        ]);
        setTallaSeleccionada("");
        setIdColorSeleccionado("");
        setStockInput("0");
    };

    // 7. Eliminar variante de la lista local
    const handleEliminarVariante = (index: number) => {
        setVariantes(variantes.filter((_, i) => i !== index));
        setErrorVariante(null);
    };

    // 8. Registrar variantes nuevas en la base de datos
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (variantes.length === 0) {
            setError("Debes agregar al menos una talla y variante de stock antes de guardar.");
            return;
        }

        try {
            setGuardando(true);

            // Guardamos cada variante nueva asignándole el idProducto
            await Promise.all(
                variantes.map(v =>
                    crearVarianteProducto({
                        talla: v.talla,
                        idColor: v.idColor,
                        stockDisponible: v.stockDisponible,
                        stockReservado: 0,
                        idProducto: Number(id)
                    })
                )
            );

            navigate("/admin/inventario");
        } catch (err: any) {
            console.error("Error al registrar variantes:", err);
            setError(err.message || "Ocurrió un error al intentar agregar las nuevas variantes.");
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="p-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-[#087f99] mb-4" size={32} />
                <p className="text-zinc-500 font-medium text-sm">Cargando información del producto...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Cabecera superior de acciones */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="outline" size="icon" className="h-9 w-9 border-zinc-200 rounded-lg">
                        <Link to="/admin/inventario">
                            <ArrowLeft size={16} />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Añadir Variante de Color</h1>
                        <p className="text-xs text-zinc-500">Agrega existencias y tallas para colores que este producto no tenga.</p>
                    </div>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={guardando}
                    className="bg-[#087f99] hover:bg-[#066a80] text-white gap-2 font-medium"
                >
                    {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Guardar Cambios
                </Button>
            </div>

            {/* Error general */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda/Central: Detalles lectura y Formulario de Tallas */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card: Información Básica (Lectura) */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
                        <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Información del Producto</h2>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500">Nombre del Producto</label>
                            <Input
                                type="text"
                                value={nombre}
                                className="border-zinc-200 bg-zinc-50 cursor-not-allowed h-10 text-zinc-500"
                                disabled
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500">Descripción</label>
                            <textarea
                                value={descripcion}
                                className="w-full min-h-[80px] rounded-md border border-zinc-200 bg-zinc-50 cursor-not-allowed p-3 text-sm text-zinc-500 focus-visible:outline-none"
                                disabled
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Categoría</label>
                                <Input
                                    type="text"
                                    value={categoriaActual?.nombre || ""}
                                    className="border-zinc-200 bg-zinc-50 cursor-not-allowed h-10 text-zinc-500"
                                    disabled
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500">Precio Base</label>
                                <Input
                                    type="text"
                                    value={precioBase ? `S/. ${Number(precioBase).toFixed(2)}` : ""}
                                    className="border-zinc-200 bg-zinc-50 cursor-not-allowed h-10 text-zinc-500 font-mono"
                                    disabled
                                />
                            </div>
                        </div>

                        {imagenUrl.trim() && (
                            <div className="space-y-1 mt-2">
                                <label className="text-xs font-medium text-zinc-500">Imagen</label>
                                <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 flex justify-center items-center h-40 overflow-hidden">
                                    <img
                                        src={imagenUrl}
                                        alt="Vista previa del producto"
                                        className="max-h-full object-contain rounded opacity-75"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Error+al+cargar+imagen";
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Card: Añadir Variantes */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-800">Tallas y Variantes Disponibles</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">Selecciona una talla, un color no utilizado y define el stock inicial.</p>
                        </div>

                        {/* Formulario variante temporal */}
                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">1. Talla</label>
                                <select
                                    value={tallaSeleccionada}
                                    onChange={(e) => { setTallaSeleccionada(e.target.value); setErrorVariante(null); }}
                                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99]"
                                >
                                    <option value="">Seleccionar...</option>
                                    {tallasDisponibles.map((talla) => (
                                        <option key={talla} value={talla}>{talla}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">2. Color</label>
                                <select
                                    value={idColorSeleccionado}
                                    onChange={(e) => { setIdColorSeleccionado(e.target.value); setErrorVariante(null); }}
                                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99]"
                                >
                                    <option value="">Seleccionar...</option>
                                    {coloresDisponibles.map((color) => (
                                        <option key={color.idColor} value={color.idColor.toString()}>
                                            {color.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">3. Stock Inicial</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={stockInput}
                                    onChange={(e) => setStockInput(e.target.value)}
                                    onKeyDown={preventInvalidCharsStock}
                                    className="border-zinc-200 bg-white h-10"
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={handleAgregarVariante}
                                variant="outline"
                                className="h-10 border-zinc-300 hover:bg-zinc-100 font-medium text-xs gap-1"
                            >
                                <Plus size={14} />
                                Añadir Variante
                            </Button>
                            {errorVariante && (
                                <div className="sm:col-span-4 flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-100 p-2 rounded">
                                    <AlertCircle size={14} className="shrink-0" />
                                    {errorVariante}
                                </div>
                            )}
                        </div>

                        {/* Tabla de variantes locales agregadas */}
                        <div className="border border-zinc-100 rounded-lg overflow-hidden">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-medium text-xs">
                                        <th className="p-3">Talla</th>
                                        <th className="p-3">Color</th>
                                        <th className="p-3">Stock Disponible</th>
                                        <th className="p-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                                    {variantes.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-zinc-400 text-xs">
                                                No has añadido ninguna variante de color nueva aún. Usa el formulario superior.
                                            </td>
                                        </tr>
                                    ) : (
                                        variantes.map((v, index) => (
                                            <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="p-3 font-semibold text-zinc-900">{v.talla}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {colores.find(c => c.idColor === v.idColor)?.hexadecimal && (
                                                            <span
                                                                className="w-3.5 h-3.5 rounded-full border border-zinc-300 shadow-sm"
                                                                style={{ backgroundColor: colores.find(c => c.idColor === v.idColor)?.hexadecimal }}
                                                            />
                                                        )}
                                                        <span className="capitalize">{v.colorNombre}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <span className="bg-zinc-100 px-2.5 py-0.5 rounded-full font-mono text-xs font-medium text-zinc-700">
                                                        {v.stockDisponible} und
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEliminarVariante(index)}
                                                        className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                    >
                                                        <Trash2 size={15} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Colores Actuales */}
                <div className="space-y-6">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Colores Actuales</h2>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                Este producto ya cuenta con existencias y variantes en los siguientes colores:
                            </p>
                        </div>
                        <div className="space-y-3">
                            {coloresAgrupados.length === 0 ? (
                                <p className="text-xs text-zinc-500 italic p-4 text-center bg-zinc-50 border border-zinc-100 rounded-lg">
                                    El producto no tiene variantes de color registradas aún.
                                </p>
                            ) : (
                                coloresAgrupados.map(({ color, variantes }) => (
                                    <div key={color.idColor} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100 shadow-sm hover:shadow transition-shadow">
                                        {color.hexadecimal && (
                                            <span
                                                className="w-4 h-4 rounded-full border border-zinc-300 shadow-sm mt-0.5 shrink-0 inline-block"
                                                style={{ backgroundColor: color.hexadecimal }}
                                                title={color.nombre}
                                            />
                                        )}
                                        <div className="space-y-1">
                                            <span className="text-sm font-semibold text-zinc-800 capitalize">{color.nombre}</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {variantes.map((v) => (
                                                    <span key={v.idVariante} className="text-[10px] bg-white border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded font-mono font-medium">
                                                        {v.talla}: {v.stockDisponible} und
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}