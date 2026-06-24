import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listarCategorias,
  listarColores,
  crearProducto,
  subirImagenProducto,
  type Categoria,
  type Color,
  type ReglaDescuentoRequestDTO,
  type ProductoRequestDTO,
} from "@/api/productosApi";
import { obtenerConfiguracionNegocio, type ConfiguracionNegocio } from "@/api/configuracionApi";

const OPCIONES_TALLAS: Record<string, string[]> = {
  'blusas': ['S', 'M', 'L', 'XL'],
  'vestidos': ['S', 'M', 'L', 'XL'],
  'casacas': ['S', 'M', 'L', 'XL'],
  'pantalones': ['28', '30', '32', '34'],
  'jeans': ['28', '30', '32', '34'],
};

export default function ProductoNuevoPage() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [colores, setColores] = useState<Color[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configuracion, setConfiguracion] = useState<ConfiguracionNegocio | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [previewLocal, setPreviewLocal] = useState<string | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [variantes, setVariantes] = useState<Array<{ talla: string; idColor: number; colorNombre: string; stockDisponible: number }>>([]);

  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [idColorSeleccionado, setIdColorSeleccionado] = useState("");
  const [stockInput, setStockInput] = useState("0");
  const [errorVariante, setErrorVariante] = useState<string | null>(null);

  const [reglasDescuento, setReglasDescuento] = useState<ReglaDescuentoRequestDTO[]>([]);
  const [rangoMinInput, setRangoMinInput] = useState("");
  const [rangoMaxInput, setRangoMaxInput] = useState("");
  const [porcentajeInput, setPorcentajeInput] = useState("");
  const [errorRegla, setErrorRegla] = useState<string | null>(null);

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
    Promise.all([listarCategorias(), listarColores(), obtenerConfiguracionNegocio()])
      .then(([dataCategorias, dataColores, dataConfig]) => {
        setCategorias(dataCategorias);
        setColores(dataColores);
        setConfiguracion(dataConfig);
        setCargandoCategorias(false);
      })
      .catch((err) => {
        console.error("Error al cargar datos iniciales:", err);
        setError("No se pudieron cargar las categorías, colores o la configuración de negocio del servidor.");
        setCargandoCategorias(false);
      });
  }, []);

  const categoriaActual = categorias.find(c => c.idCategoria === Number(idCategoria));
  const tallasDisponibles = categoriaActual
    ? (Object.entries(OPCIONES_TALLAS).find(([key]) => categoriaActual.nombre.toLowerCase().includes(key))?.[1] || ['S', 'M', 'L', 'XL'])
    : ['S', 'M', 'L', 'XL'];

  const handleArchivoSeleccionado = (file: File | null) => {
    if (!file) return;
    const permitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!permitidos.includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG, WEBP o GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar los 10 MB.");
      return;
    }
    setArchivoImagen(file);
    setImagenUrl("");
    setPreviewLocal(URL.createObjectURL(file));
    setError(null);
  };

  const handleQuitarImagen = () => {
    if (previewLocal) URL.revokeObjectURL(previewLocal);
    setArchivoImagen(null);
    setPreviewLocal(null);
    setImagenUrl("");
  };

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
    setIdColorSeleccionado("");
    setStockInput("0");
  };

  const handleEliminarVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index));
    setErrorVariante(null);
  };

  const handleAgregarRegla = () => {
    setErrorRegla(null);

    const inicio = Number(rangoMinInput);
    const fin = Number(rangoMaxInput);
    const porcentaje = Number(porcentajeInput);

    if (rangoMinInput === "" || rangoMaxInput === "" || porcentajeInput === "") {
      setErrorRegla("Por favor, completa todos los campos de la regla de descuento.");
      return;
    }

    if (inicio < 0 || fin < 0 || porcentaje < 0) {
      setErrorRegla("Los valores numéricos no pueden ser negativos.");
      return;
    }

    if (inicio > fin) {
      setErrorRegla("El rango inicial no puede ser mayor que el rango final.");
      return;
    }

    if (configuracion && fin >= configuracion.stockMinimoCotizacion) {
      setErrorRegla(`El rango final (${fin}) no puede superar el stock mínimo de cotización (${configuracion.stockMinimoCotizacion}).`);
      return;
    }

    if (porcentaje > 100) {
      setErrorRegla("El porcentaje de descuento no puede ser mayor a 100%.");
      return;
    }

    const solapado = reglasDescuento.some(r =>
      (inicio >= r.rangoMinimo && inicio <= r.rangoMaximo) ||
      (fin >= r.rangoMinimo && fin <= r.rangoMaximo)
    );
    if (solapado) {
      setErrorRegla("El rango de esta regla se cruza con el de otra ya existente.");
      return;
    }

    setReglasDescuento([
      ...reglasDescuento,
      { rangoMinimo: inicio, rangoMaximo: fin, porcentaje: porcentaje }
    ]);
    setRangoMinInput((fin + 1).toString());
    setRangoMaxInput("");
    setPorcentajeInput("");
  };

  const handleEliminarRegla = (index: number) => {
    setReglasDescuento(reglasDescuento.filter((_, i) => i !== index));
    setErrorRegla(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !precioBase || !idCategoria) {
      setError("Por favor, completa los campos obligatorios (*).");
      return;
    }

    if (variantes.length === 0) {
      setError("Debes agregar al menos una variante (Talla/Color/Stock) para el producto.");
      return;
    }

    if (configuracion && reglasDescuento.some(r => r.rangoMaximo >= configuracion.stockMinimoCotizacion)) {
      setError(`Hay reglas de descuento cuyo rango final supera el stock mínimo de cotización (${configuracion.stockMinimoCotizacion}).`);
      return;
    }

    try {
      setGuardando(true);

      // Si hay un archivo seleccionado, subirlo primero a S3 para obtener la URL
      let urlFinal = imagenUrl.trim() || undefined;
      if (archivoImagen) {
        setSubiendoImagen(true);
        try {
          urlFinal = await subirImagenProducto(archivoImagen);
        } finally {
          setSubiendoImagen(false);
        }
      }

      const productoRequest: ProductoRequestDTO = {
        nombre: nombre.trim(),
        precioBase: Number(precioBase),
        descripcion: descripcion.trim() || undefined,
        imagenUrl: urlFinal,
        idCategoria: Number(idCategoria),

        variantes: variantes.map(v => ({
          talla: v.talla,
          idColor: v.idColor,
          stockDisponible: v.stockDisponible,
          stockReservado: 0
        })),

        reglasDescuento: reglasDescuento.map(r => ({
          rangoMinimo: r.rangoMinimo,
          rangoMaximo: r.rangoMaximo,
          porcentaje: r.porcentaje
        }))
      };

      await crearProducto(productoRequest);
      navigate("/admin/inventario");

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al registrar el producto.");
    } finally {
      setGuardando(false);
    }
  };

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
            <h1 className="text-xl font-bold text-zinc-900">Registrar Nuevo Producto</h1>
            <p className="text-xs text-zinc-500">Agrega un nuevo producto físico y sus variantes al inventario.</p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={guardando || subiendoImagen}
          className="bg-[#087f99] hover:bg-[#066a80] text-white gap-2 font-medium"
        >
          {subiendoImagen ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Subiendo imagen...
            </>
          ) : guardando ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save size={16} />
              Guardar Producto
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}


      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-6">

          {/* Información Básica */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">1. Información Básica</h2>

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
                placeholder="Describe los detalles de la prenda, materiales, etc..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-zinc-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f99] focus-visible:ring-offset-0 text-zinc-800 placeholder:text-zinc-400"
              />
            </div>
            {/* Imagen */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">
                Imagen del Producto
              </h2>

              {/* Vista previa + quitar */}
              {(previewLocal ?? imagenUrl.trim()) ? (
                <div className="relative border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center h-52">
                  <img
                    src={previewLocal ?? imagenUrl}
                    alt="Vista previa del producto"
                    className="max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/600x400?text=Error+al+cargar";
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleQuitarImagen}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 border border-zinc-200 shadow flex items-center justify-center text-zinc-500 hover:text-rose-600 hover:border-rose-300 transition"
                    title="Quitar imagen"
                  >
                    <X size={13} />
                  </button>
                  {archivoImagen && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-white/90 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow">
                      {archivoImagen.name}
                    </span>
                  )}
                </div>
              ) : (
                /* Zona drag-and-drop */
                <label
                  htmlFor="input-imagen-producto"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleArchivoSeleccionado(e.dataTransfer.files[0] ?? null);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 h-44 rounded-lg border-2 border-dashed cursor-pointer transition ${
                    dragOver
                      ? "border-[#087f99] bg-cyan-50"
                      : "border-zinc-200 bg-zinc-50 hover:border-[#087f99] hover:bg-cyan-50/50"
                  }`}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                    <ImageIcon size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-700">
                      Arrastra una imagen aquí o{" "}
                      <span className="text-[#087f99]">haz clic para seleccionar</span>
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      JPG, PNG, WEBP o GIF · Máx. 10 MB
                    </p>
                  </div>
                  <input
                    id="input-imagen-producto"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) =>
                      handleArchivoSeleccionado(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              )}

              {/* Divider con opción URL alternativa */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-zinc-100" />
                <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  o pega una URL
                </span>
                <div className="h-px flex-1 bg-zinc-100" />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imagenUrl}
                  onChange={(e) => {
                    setImagenUrl(e.target.value);
                    if (e.target.value.trim()) {
                      // Si escribe URL, descarta el archivo
                      if (previewLocal) URL.revokeObjectURL(previewLocal);
                      setArchivoImagen(null);
                      setPreviewLocal(null);
                    }
                  }}
                  disabled={Boolean(archivoImagen)}
                  className="border-zinc-200 focus-visible:ring-[#087f99] h-9 text-xs disabled:opacity-40"
                />
                {imagenUrl.trim() && !archivoImagen && (
                  <button
                    type="button"
                    onClick={() => setImagenUrl("")}
                    className="shrink-0 text-zinc-400 hover:text-rose-500 transition"
                    title="Limpiar URL"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tallas y Variantes */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">3. Tallas y Variantes Disponibles </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Selecciona una talla, el color y define el stock inicial. (Min. 1 variante)*</p>
            </div>

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
                  {colores.map((color) => (
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
                  <AlertCircle size={14} />
                  {errorVariante}
                </div>
              )}
            </div>

            {/* Tabla de variantes agregadas */}
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
                        No has añadido ninguna variante aún. Usa el recuadro de arriba.
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
                            <span>{v.colorNombre}</span>
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

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">

          {/* Precio y Categoría */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">2. Precio y Categoría</h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Precio Base (S/.) *</label>
              <Input
                type="number"
                step="1.00"
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
                onChange={(e) => {
                  setIdCategoria(e.target.value);
                  setVariantes([]);
                  setTallaSeleccionada("");
                }}
                disabled={cargandoCategorias}
                className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-md text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#087f99] disabled:bg-zinc-50"
                required
              >
                <option value="">{cargandoCategorias ? "Cargando categorías..." : "Selecciona una categoría"}</option>
                {categorias.map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {cat.nombre}
                  </option>
                ))}
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
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">4. Reglas de Descuento</h2>
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
                    placeholder="Min"
                    value={rangoMinInput}
                    onChange={(e) => { setRangoMinInput(e.target.value); setErrorRegla(null); }}
                    onKeyDown={preventInvalidCharsStock}
                    className="h-9 bg-white text-xs border-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-600">Rango Final (und)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={rangoMaxInput}
                    onChange={(e) => { setRangoMaxInput(e.target.value); setErrorRegla(null); }}
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
                    onChange={(e) => { setPorcentajeInput(e.target.value); setErrorRegla(null); }}
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
                          <Trash2 size={13} />
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
    </div>
  );
}