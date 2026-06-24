import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, AlertCircle, Layers, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listarCategorias,
  editarProducto,
  buscarProductoPorId,
  obtenerVariantesPorProducto,
  editarVarianteProducto,
  obtenerReglasPorProducto,
  eliminarVarianteProducto,
  crearVarianteProducto,
  type Categoria,
  type VarianteProducto,
  type ProductoRequestDTO,
  type ReglaDescuentoRequestDTO
} from "@/api/productosApi";
import { obtenerConfiguracionNegocio, type ConfiguracionNegocio } from "@/api/configuracionApi";

const OPCIONES_TALLAS: Record<string, string[]> = {
  'blusas': ['S', 'M', 'L', 'XL'],
  'vestidos': ['S', 'M', 'L', 'XL'],
  'casacas': ['S', 'M', 'L', 'XL'],
  'pantalones': ['28', '30', '32', '34'],
  'jeans': ['28', '30', '32', '34'],
};

export default function ProductoEditarPage() {
  const navigate = useNavigate();
  const { id, idColor } = useParams<{ id: string; idColor: string }>();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuracion, setConfiguracion] = useState<ConfiguracionNegocio | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState<string>("");
  const [idCategoria, setIdCategoria] = useState<string>("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");

  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [idsVariantesEliminadas, setIdsVariantesEliminadas] = useState<number[]>([]);

  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevoStock, setNuevoStock] = useState<number>(0);
  const [creandoVariante, setCreandoVariante] = useState(false);
  const [errorVariante, setErrorVariante] = useState<string | null>(null);

  const [reglasDescuento, setReglasDescuento] = useState<ReglaDescuentoRequestDTO[]>([]);
  const [rangoMinimoInput, setRangoMinimoInput] = useState("");
  const [rangoMaximoInput, setRangoMaximoInput] = useState("");
  const [porcentajeInput, setPorcentajeInput] = useState("");
  const [errorRegla, setErrorRegla] = useState<string | null>(null);

  const [modalEliminar, setModalEliminar] = useState<{
    mostrar: boolean;
    tipo: "ADVERTENCIA" | "CONFIRMACION";
    elemento: "TALLA" | "REGLA" | null;
    razonAdvertencia: "UNICA_TALLA" | "STOCK_RESERVADO" | null;
    datosTalla: VarianteProducto | null;
    datosRegla: { index: number; rangoMinimo: number; rangoMaximo: number; porcentaje: number } | null;
  }>({
    mostrar: false,
    tipo: "CONFIRMACION",
    elemento: null,
    razonAdvertencia: null,
    datosTalla: null,
    datosRegla: null
  });

  const preventInvalidCharsParaDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const preventInvalidCharsStock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      if (!id || !idColor) return;

      try {
        setCargando(true);
        setError(null);

        const dataCategorias = await listarCategorias();
        setCategorias(dataCategorias);

        const dataProducto = await buscarProductoPorId(Number(id));
        setNombre(dataProducto.nombre || "");

        setPrecioBase(dataProducto.precioBase !== undefined && dataProducto.precioBase !== null
          ? dataProducto.precioBase.toString()
          : ""
        );
        setDescripcion(dataProducto.descripcion || "");

        const categoriaId = dataProducto.idCategoria ?? dataProducto.categoria?.idCategoria;
        setIdCategoria(categoriaId ? categoriaId.toString() : "");

        setImagenUrl(dataProducto.imagenUrl || "");
        setEstado(dataProducto.estado || "ACTIVO");

        try {
          const dataConfig = await obtenerConfiguracionNegocio();
          setConfiguracion(dataConfig);
        } catch (errConfig) {
          console.warn("No se pudo cargar la configuración de negocio:", errConfig);
        }

        try {
          const dataVariantes = await obtenerVariantesPorProducto(Number(id));
          if (dataVariantes && dataVariantes.length > 0) {
            setVariantes(dataVariantes);
          }
        } catch (errVar) {
          console.warn("No se pudieron cargar las variantes:", errVar);
        }

        try {
          const dataReglas = await obtenerReglasPorProducto(Number(id));
          if (dataReglas && dataReglas.length > 0) {
            setReglasDescuento(dataReglas.map(r => ({
              rangoMinimo: r.rangoMinimo,
              rangoMaximo: r.rangoMaximo,
              porcentaje: r.porcentaje
            })));
          }
        } catch (errReglas) {
          console.warn("No se pudieron cargar las reglas de descuento:", errReglas);
        }

      } catch (err: any) {
        console.error("Error crítico al cargar el producto:", err);
        setError("No se pudieron cargar los datos principales del producto.");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [id, idColor]);

  const variantesFiltradas = variantes.filter((v) => v.idColor === Number(idColor));
  const colorActual = variantesFiltradas.length > 0 ? variantesFiltradas[0].color : null;

  const categoriaActual = categorias.find(c => c.idCategoria === Number(idCategoria));
  const tallasDisponibles = categoriaActual
    ? (Object.entries(OPCIONES_TALLAS).find(([key]) => categoriaActual.nombre.toLowerCase().includes(key))?.[1] || ['S', 'M', 'L', 'XL'])
    : ['S', 'M', 'L', 'XL'];

  const handleStockChange = (idVariante: number, nuevoStock: number) => {
    setVariantes((prev) =>
      prev.map((v) =>
        v.idVariante === idVariante ? { ...v, stockDisponible: Math.max(0, nuevoStock) } : v
      )
    );
  };

  const handleEliminarVariante = (variante: VarianteProducto) => {
    setErrorVariante(null);
    if (variantesFiltradas.length <= 1) {
      setModalEliminar({
        mostrar: true,
        tipo: "ADVERTENCIA",
        elemento: "TALLA",
        razonAdvertencia: "UNICA_TALLA",
        datosTalla: variante,
        datosRegla: null
      });
      return;
    }
    if (variante.stockReservado > 0) {
      setModalEliminar({
        mostrar: true,
        tipo: "ADVERTENCIA",
        elemento: "TALLA",
        razonAdvertencia: "STOCK_RESERVADO",
        datosTalla: variante,
        datosRegla: null
      });
      return;
    }
    setModalEliminar({
      mostrar: true,
      tipo: "CONFIRMACION",
      elemento: "TALLA",
      razonAdvertencia: null,
      datosTalla: variante,
      datosRegla: null
    });
  };

  const ejecutarEliminacionTalla = () => {
    const { datosTalla } = modalEliminar;
    if (!datosTalla) return;

    if (datosTalla.idVariante > 0) {
      setIdsVariantesEliminadas((prev) => [...prev, datosTalla.idVariante]);
    }
    setVariantes((prev) => prev.filter((v) => v.idVariante !== datosTalla.idVariante));
    setModalEliminar({ ...modalEliminar, mostrar: false });
  };

  const handleAgregarVarianteLocal = () => {
    setErrorVariante(null);
    if (!nuevaTalla) {
      setErrorVariante("Por favor, selecciona una talla.");
      return;
    }

    const existe = variantes.some(
      (v) => v.talla === nuevaTalla && v.idColor === Number(idColor)
    );
    if (existe) {
      setErrorVariante("Esta talla ya está agregada para este color.");
      return;
    }

    const tempIds = variantes.map((v) => v.idVariante).filter((id) => id < 0);
    const nuevoIdTemp = tempIds.length > 0 ? Math.min(...tempIds) - 1 : -1;

    const nuevaVariante: VarianteProducto = {
      idVariante: nuevoIdTemp,
      talla: nuevaTalla,
      idColor: Number(idColor),
      color: colorActual,
      stockDisponible: nuevoStock,
      stockReservado: 0,
      idProducto: Number(id)
    };

    setVariantes((prev) => [...prev, nuevaVariante]);
    setNuevaTalla("");
    setNuevoStock(0);
    setCreandoVariante(false);
  };

  const handleAgregarRegla = () => {
    setErrorRegla(null);

    const min = Number(rangoMinimoInput);
    const max = Number(rangoMaximoInput);
    const porcentaje = Number(porcentajeInput);

    if (rangoMinimoInput === "" || rangoMaximoInput === "" || porcentajeInput === "") {
      setErrorRegla("Por favor, completa todos los campos de la regla de descuento.");
      return;
    }
    if (min < 0 || max < 0 || porcentaje < 0) {
      setErrorRegla("Los valores no pueden ser negativos.");
      return;
    }
    if (min > max) {
      setErrorRegla("El rango inicial no puede ser mayor que el rango final.");
      return;
    }
    if (configuracion && max >= configuracion.stockMinimoCotizacion) {
      setErrorRegla(`El rango final (${max}) no puede superar el stock mínimo de cotización (${configuracion.stockMinimoCotizacion}).`);
      return;
    }
    if (porcentaje > 100) {
      setErrorRegla("El porcentaje no puede ser mayor a 100%.");
      return;
    }

    const solapado = reglasDescuento.some(r =>
      (min >= r.rangoMinimo && min <= r.rangoMaximo) ||
      (max >= r.rangoMinimo && max <= r.rangoMaximo)
    );

    if (solapado) {
      setErrorRegla("El rango de esta regla se cruza con el de otra ya existente.");
      return;
    }

    setReglasDescuento([
      ...reglasDescuento,
      { rangoMinimo: min, rangoMaximo: max, porcentaje }
    ]);
    setRangoMinimoInput((max + 1).toString());
    setRangoMaximoInput("");
    setPorcentajeInput("");
  };

  const handleEliminarRegla = (index: number) => {
    setErrorRegla(null);
    const regla = reglasDescuento[index];
    if (!regla) return;
    setModalEliminar({
      mostrar: true,
      tipo: "CONFIRMACION",
      elemento: "REGLA",
      razonAdvertencia: null,
      datosTalla: null,
      datosRegla: { index, rangoMinimo: regla.rangoMinimo, rangoMaximo: regla.rangoMaximo, porcentaje: regla.porcentaje }
    });
  };

  const ejecutarEliminacionRegla = () => {
    const { datosRegla } = modalEliminar;
    if (!datosRegla) return;
    setReglasDescuento(reglasDescuento.filter((_, i) => i !== datosRegla.index));
    setErrorRegla(null);
    setModalEliminar({ ...modalEliminar, mostrar: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !precioBase || !idCategoria) {
      setError("Por favor, completa los campos obligatorios (*).");
      return;
    }

    if (configuracion && reglasDescuento.some(r => r.rangoMaximo >= configuracion.stockMinimoCotizacion)) {
      setError(`Hay reglas de descuento cuyo rango final supera el stock mínimo de cotización (${configuracion.stockMinimoCotizacion}).`);
      return;
    }

    try {
      setGuardando(true);

      const productoDto: ProductoRequestDTO = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precioBase: Number(precioBase),
        idCategoria: Number(idCategoria),
        imagenUrl: imagenUrl.trim() || undefined,
        estado,
        reglasDescuento: reglasDescuento.map(r => ({
          rangoMinimo: r.rangoMinimo,
          rangoMaximo: r.rangoMaximo,
          porcentaje: r.porcentaje
        }))
      };
      await editarProducto(Number(id), productoDto);

      if (idsVariantesEliminadas.length > 0) {
        await Promise.all(
          idsVariantesEliminadas.map((idVar) => eliminarVarianteProducto(idVar))
        );
      }

      await Promise.all(
        variantesFiltradas.map((v) => {
          if (v.idVariante > 0) {
            return editarVarianteProducto(v.idVariante, {
              talla: v.talla,
              idColor: v.idColor,
              stockDisponible: v.stockDisponible,
              stockReservado: v.stockReservado,
              idProducto: Number(id)
            });
          } else {
            return crearVarianteProducto({
              talla: v.talla,
              idColor: v.idColor,
              stockDisponible: v.stockDisponible,
              stockReservado: 0,
              idProducto: Number(id)
            });
          }
        })
      );

      navigate("/admin/inventario");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al intentar guardar los cambios.");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 border-zinc-200 rounded-lg">
            <Link to="/admin/inventario">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Editar Variante de Producto</h1>
            <p className="text-xs text-zinc-500">Modifica los detalles, reglas y existencias del producto.</p>
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

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-6">

          {/* Información Básica */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Información Básica</h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Nombre del Producto *</label>
              <Input
                type="text"
                placeholder='Ej. Blazer Lino "Arena"'
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border-zinc-200 focus-visible:ring-[#087f99] h-10"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Descripción</label>
              <textarea
                placeholder="Describe los detalles de la prenda, materiales, colección, etc..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-zinc-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f99] focus-visible:ring-offset-0 text-zinc-800 placeholder:text-zinc-400"
              />
            </div>

            {/* Imagen */}
            <div className="space-y-1 mt-2">
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Imagen del Producto</h2>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">URL de la Imagen</label>
                <Input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imagenUrl}
                  onChange={(e) => setImagenUrl(e.target.value)}
                  className="border-zinc-200 focus-visible:ring-[#087f99] h-10 text-xs"
                />
              </div>

              {imagenUrl.trim() && (
                <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 flex justify-center items-center h-40 overflow-hidden mt-3">
                  <img
                    src={imagenUrl}
                    alt="Vista previa del producto"
                    className="max-h-full object-contain rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Error+al+cargar+imagen";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Color y tallas*/}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="text-zinc-400" size={20} />
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">Color:</span>
                  <span className="text-zinc-600 font-medium capitalize">{colorActual?.nombre || "Cargando..."}</span>
                  {colorActual?.hexadecimal && (
                    <span
                      className="w-5 h-5 rounded-full border border-zinc-300 shadow-sm ml-1 inline-block"
                      style={{ backgroundColor: colorActual.hexadecimal }}
                      title={colorActual.nombre}
                    />
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreandoVariante(!creandoVariante);
                  setErrorVariante(null);
                }}
                className="h-8 border-zinc-300 hover:bg-zinc-100 text-xs font-semibold gap-1"
              >
                <Plus size={14} />
                Añadir Talla
              </Button>
            </div>

            {creandoVariante && (
              <div className="p-4 bg-zinc-50/50 border-b border-zinc-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Talla</label>
                  <select
                    value={nuevaTalla}
                    onChange={(e) => { setNuevaTalla(e.target.value); setErrorVariante(null); }}
                    className="w-full h-9 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99]"
                  >
                    <option value="">Seleccionar...</option>
                    {tallasDisponibles.map((talla) => (
                      <option key={talla} value={talla}>{talla}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Stock Inicial</label>
                  <Input
                    type="number"
                    min="0"
                    value={nuevoStock}
                    onChange={(e) => { setNuevoStock(Math.max(0, Number(e.target.value))); setErrorVariante(null); }}
                    onKeyDown={preventInvalidCharsStock}
                    className="h-9 bg-white text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAgregarVarianteLocal}
                    className="h-9 bg-[#087f99] hover:bg-[#066a80] text-white text-xs font-semibold flex-1"
                  >
                    Confirmar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCreandoVariante(false);
                      setNuevaTalla("");
                      setNuevoStock(0);
                      setErrorVariante(null);
                    }}
                    className="h-9 border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-semibold"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {errorVariante && (
              <div className="mx-5 my-3 flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-100 p-2.5 rounded-lg">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorVariante}</span>
              </div>
            )}

            {/* Tabla de Tallas */}
            <div className="overflow-x-auto">
              {variantesFiltradas.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">
                  No hay tallas registradas para este color.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-zinc-50/30 text-zinc-500 text-[11px] uppercase tracking-wider font-semibold border-b border-zinc-100">
                    <tr>
                      <th className="px-5 py-3 w-1/4">Tallas</th>
                      <th className="px-5 py-3 w-1/4 text-center">Stock Disponible</th>
                      <th className="px-5 py-3 w-1/4 text-center">Stock Reservado</th>
                      <th className="px-5 py-3 w-1/4 text-center">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {variantesFiltradas.map((variante) => (
                      <tr key={variante.idVariante} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-zinc-800">
                          {variante.talla || "Única"}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex justify-center items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={variante.stockDisponible}
                              onChange={(e) => handleStockChange(variante.idVariante, Number(e.target.value))}
                              onKeyDown={preventInvalidCharsStock}
                              className="w-24 border-zinc-200 focus-visible:ring-[#087f99] h-9 text-center text-sm font-mono font-bold"
                            />
                            <span className="text-zinc-400 text-xs">und.</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className="text-zinc-600 font-mono font-medium">
                            {variante.stockReservado} und.
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarVariante(variante)}
                            className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors mx-auto flex"
                          >
                            <Trash2 size={16} className="text-zinc-600 hover:text-[#087f99] transition-colors" />
                          </Button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          {/* Precio y Categoría */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Precio y Categoría</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Precio Base (S/.) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
                onKeyDown={preventInvalidCharsParaDecimal}
                className="border-zinc-200 focus-visible:ring-[#087f99] h-10 font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Categoría del Producto *</label>
              <select
                value={idCategoria}
                onChange={(e) => setIdCategoria(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99]"
                required
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99]"
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Configuración de Negocio */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Configuración de Negocio</h2>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Valores establecidos para el stock mínimo de cotización y precio piso.
              </p>
            </div>
            {configuracion ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-500 block">Stock Mínimo Cotización</span>
                  <span className="font-mono text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg block">
                    {configuracion.stockMinimoCotizacion} und
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-zinc-500 block">Porcentaje Precio Piso</span>
                  <span className="font-mono text-sm font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg block">
                    {configuracion.porcentajePrecioPiso}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin text-[#087f99] h-5 w-5 mr-2" />
                <span className="text-xs text-zinc-500 italic">Cargando configuración de negocio...</span>
              </div>
            )}
          </div>

          {/* Reglas de descuento */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Reglas de Descuento</h2>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Establece escalas de descuento según la cantidad total de unidades compradas. El rango no debe superar el stock minimo de cotización.
              </p>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-600">Rango Inicial (und)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={rangoMinimoInput}
                    onChange={(e) => {
                      setRangoMinimoInput(e.target.value);
                      setErrorRegla(null);
                    }}
                    onKeyDown={preventInvalidCharsStock}
                    className="h-9 bg-white text-xs border-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-600">Rango Final (und)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={rangoMaximoInput}
                    onChange={(e) => {
                      setRangoMaximoInput(e.target.value);
                      setErrorRegla(null);
                    }}
                    onKeyDown={preventInvalidCharsStock}
                    className="h-9 bg-white text-xs border-zinc-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-600">Porcentaje Descuento (%)</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={porcentajeInput}
                    onChange={(e) => {
                      setPorcentajeInput(e.target.value);
                      setErrorRegla(null);
                    }}
                    onKeyDown={preventInvalidCharsParaDecimal}
                    className="h-9 bg-white text-xs border-zinc-200 pr-7 font-mono"
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-zinc-400 font-medium">%</span>
                </div>
              </div>

              {errorRegla && (
                <div className="flex items-center gap-2 text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-100 p-2 rounded">
                  <AlertCircle size={13} className="shrink-0" />
                  {errorRegla}
                </div>
              )}

              <Button
                type="button"
                onClick={handleAgregarRegla}
                variant="outline"
                className="w-full h-8 border-zinc-300 hover:bg-zinc-100 text-xs gap-1 font-medium mt-1"
              >
                <Plus size={13} />
                Añadir Regla Comercial
              </Button>
            </div>

            {/* Tabla de reglas añadidas */}
            <div className="border border-zinc-100 rounded-lg overflow-hidden text-xs">
              <div className="bg-zinc-50 border-b border-zinc-100 p-2 text-[10px] font-semibold text-zinc-400 tracking-wider">
                REGLAS ACTIVAS CONFIGURADAS
              </div>
              <div className="max-h-[160px] overflow-y-auto divide-y divide-zinc-100">
                {reglasDescuento.length === 0 ? (
                  <p className="p-4 text-center text-zinc-400 text-[11px] italic">
                    Sin reglas. Venta directa a precio de lista base.
                  </p>
                ) : (
                  reglasDescuento.map((regla, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-zinc-50/50 transition-colors">
                      <div className="space-y-0.5">
                        <span className="font-medium text-zinc-500 text-[10px] block uppercase">Regla {idx + 1}</span>
                        <span className="font-mono text-zinc-800 font-medium">
                          {regla.rangoMinimo} - {regla.rangoMaximo} und.
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded font-mono font-bold">
                          {regla.porcentaje.toFixed(2)}%
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminarRegla(idx)}
                          className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={13} className="text-zinc-600 hover:text-[#087f99] transition-colors" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Modal de eliminación */}
      {modalEliminar.mostrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl mx-4 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-full ${modalEliminar.tipo === "ADVERTENCIA" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                <AlertCircle size={24} />
              </span>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {modalEliminar.tipo === "ADVERTENCIA" ? "Acción Bloqueada" : "Confirmar Eliminación"}
                </h3>
              </div>
            </div>

            <div className="text-sm text-zinc-600 leading-relaxed py-2">
              {modalEliminar.elemento === "TALLA" && modalEliminar.datosTalla && (
                modalEliminar.tipo === "ADVERTENCIA" ? (
                  modalEliminar.razonAdvertencia === "UNICA_TALLA" ? (
                    <span>
                      No se puede eliminar la talla{" "}
                      <strong className="text-zinc-800 uppercase">"{modalEliminar.datosTalla.talla || "Única"}"</strong>{" "}
                      porque es la <strong className="text-rose-600">única talla registrada</strong> para este color. Debe existir al menos una talla activa.
                    </span>
                  ) : (
                    <span>
                      No se puede eliminar la talla{" "}
                      <strong className="text-zinc-800 uppercase">"{modalEliminar.datosTalla.talla || "Única"}"</strong>{" "}
                      porque tiene{" "}
                      <strong className="text-rose-600">{modalEliminar.datosTalla.stockReservado} unidades</strong> en stock reservado.
                    </span>
                  )
                ) : (
                  <span>
                    ¿Estás seguro de que deseas eliminar la talla{" "}
                    <strong className="text-zinc-800 uppercase">"{modalEliminar.datosTalla.talla || "Única"}"</strong>?
                    <br />
                    <span className="text-xs text-rose-500 font-semibold mt-2 block">
                      * Esta acción removerá la talla de la lista.
                    </span>
                  </span>
                )
              )}

              {modalEliminar.elemento === "REGLA" && modalEliminar.datosRegla && (
                <span>
                  ¿Estás seguro de que deseas eliminar la regla de descuento para el rango de{" "}
                  <strong className="text-zinc-800">{modalEliminar.datosRegla.rangoMinimo} a {modalEliminar.datosRegla.rangoMaximo} unidades</strong> con{" "}
                  <strong className="text-zinc-800">{modalEliminar.datosRegla.porcentaje}% de descuento</strong>?
                  <br />
                  <span className="text-xs text-rose-500 font-semibold mt-2 block">
                    * Esta acción es reversible antes de guardar los cambios del producto.
                  </span>
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
              {modalEliminar.tipo === "ADVERTENCIA" ? (
                <Button
                  onClick={() => setModalEliminar({ ...modalEliminar, mostrar: false })}
                  className="bg-[#087f99] hover:bg-[#066a80] text-white px-5 font-semibold"
                >
                  Entendido
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setModalEliminar({ ...modalEliminar, mostrar: false })}
                    className="border-zinc-200 text-zinc-500 hover:bg-zinc-50 font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={modalEliminar.elemento === "TALLA" ? ejecutarEliminacionTalla : ejecutarEliminacionRegla}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 font-semibold"
                  >
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}