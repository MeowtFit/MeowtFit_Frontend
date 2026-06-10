import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  listarCategorias, 
  crearProducto, 
  type Categoria, 
  type VarianteProducto 
} from "@/api/productosApi";

// Diccionario de tallas dinámicas
const OPCIONES_TALLAS: Record<string, string[]> = {
  'blusas': ['S', 'M', 'L', 'XL'],
  'vestidos': ['S', 'M', 'L', 'XL'],
  'casacas': ['S', 'M', 'L', 'XL'],
  'pantalones': ['28', '30', '32', '34'],
  'jeans': ['28', '30', '32', '34'],
};

// Interfaz local para manejar las reglas de descuento en el estado
interface ReglaDescuento {
  rangoInicio: number;
  rangoFin: number;
  porcentajeDescuento: number;
}

export default function ProductoNuevoPage() {
  const navigate = useNavigate();

  // Estados de datos remotos
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del Formulario Principal
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioBase, setPrecioBase] = useState("");
  const [idCategoria, setIdCategoria] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");

  // Estado para la gestión de variantes dinámicas
  const [variantes, setVariantes] = useState<Array<{ talla: string; color: string; stockDisponible: number }>>([]);

  // Variables para agregar una nueva variante individualmente
  const [tallaSeleccionada, setTallaSeleccionada] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [stockInput, setStockInput] = useState("0");
  const [errorVariante, setErrorVariante] = useState<string | null>(null);
  //REGLAS DE DESCUENTO
  const [reglasDescuento, setReglasDescuento] = useState<ReglaDescuento[]>([]);
  const [rangoInicioInput, setRangoInicioInput] = useState("");
  const [rangoFinInput, setRangoFinInput] = useState("");
  const [porcentajeInput, setPorcentajeInput] = useState("");
  const [errorRegla, setErrorRegla] = useState<string | null>(null);

  // 1. Cargar categorías al montar el componente
  useEffect(() => {
    listarCategorias()
      .then((data) => {
        setCategorias(data);
        setCargandoCategorias(false);
      })
      .catch((err) => {
        console.error("Error al cargar categorías:", err);
        setError("No se pudieron cargar las categorías del servidor.");
        setCargandoCategorias(false);
      });
  }, []);

  // 2. Obtener qué tallas mostrar en los botones/select según la categoría elegida
  const categoriaActual = categorias.find(c => c.idCategoria === Number(idCategoria));
  const tallasDisponibles = categoriaActual 
    ? (Object.entries(OPCIONES_TALLAS).find(([key]) => categoriaActual.nombre.toLowerCase().includes(key))?.[1] || ['S', 'M', 'L', 'XL'])
    : ['S', 'M', 'L', 'XL']; // Tallas por defecto si no hay categoría seleccionada

  // 3. Agregar una variante a la tabla temporal
  const handleAgregarVariante = () => {
    setErrorVariante(null);

    if (!tallaSeleccionada) {
      setErrorVariante("Por favor, selecciona una talla.");
      return;
    }
    if (!colorInput.trim()) {
      setErrorVariante("Por favor, escribe un color.");
      return;
    }

    // Evitar duplicados exactos de Talla + Color
    const existe = variantes.some(v => v.talla === tallaSeleccionada && v.color.toLowerCase() === colorInput.toLowerCase().trim());
    if (existe) {
      setErrorVariante("Esta combinación de talla y color ya está agregada.");
      return;
    }

    setVariantes([
      ...variantes,
      {
        talla: tallaSeleccionada,
        color: colorInput.trim(),
        stockDisponible: Number(stockInput) || 0
      }
    ]);
    setColorInput("");
    setStockInput("0");
  };

  // 4. Eliminar variante de la lista temporal
  const handleEliminarVariante = (index: number) => {
    setVariantes(variantes.filter((_, i) => i !== index));
    setErrorVariante(null);
  };

  const handleAgregarRegla = () => {
    setErrorRegla(null);

    const inicio = Number(rangoInicioInput);
    const fin = Number(rangoFinInput);
    const porcentaje = Number(porcentajeInput);

    if (rangoInicioInput === "" || rangoFinInput === "" || porcentajeInput === "") {
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

    if (porcentaje > 100) {
      setErrorRegla("El porcentaje de descuento no puede ser mayor a 100%.");
      return;
    }

    // Validación opcional: verificar solapamiento básico de rangos
    const solapado = reglasDescuento.some(r => 
      (inicio >= r.rangoInicio && inicio <= r.rangoFin) || 
      (fin >= r.rangoInicio && fin <= r.rangoFin)
    );
    if (solapado) {
      if (!confirm("El rango ingresado parece cruzarse con una regla existente. ¿Deseas agregarlo de todas formas?")) {
        return;
      }
    }

    setReglasDescuento([
      ...reglasDescuento,
      { rangoInicio: inicio, rangoFin: fin, porcentajeDescuento: porcentaje }
    ]);
    setRangoInicioInput((fin + 1).toString());
    setRangoFinInput("");
    setPorcentajeInput("");
  };

  const handleEliminarRegla = (index: number) => {
    setReglasDescuento(reglasDescuento.filter((_, i) => i !== index));
    setErrorRegla(null);
  };

  // 5. Enviar el formulario completo al Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones básicas antes de enviar
    if (!nombre.trim() || !precioBase || !idCategoria) {
      setError("Por favor, completa los campos obligatorios (*).");
      return;
    }

    if (variantes.length === 0) {
      setError("Debes agregar al menos una variante (Talla/Color/Stock) para el producto.");
      return;
    }

    try {
      setGuardando(true);

      // Estructuramos la petición según el tipo "CrearProductoRequest" de productosApi.ts
      const productoRequest = {
        nombre: nombre.trim(),
        precioBase: Number(precioBase),
        descripcion: descripcion.trim() || undefined,
        imagenUrl: imagenUrl.trim() || undefined,
        idCategoria: Number(idCategoria),
        // Mapeamos a lo que espera el DTO del backend
        variantes: variantes.map(v => ({
          talla: v.talla,
          color: v.color,
          stockDisponible: v.stockDisponible,
          stockReservado: 0
        }))
        
        // Aquí adjuntas el arreglo de reglas al DTO. Asegúrate de que tu Backend (ProductoRequestDTO) reciba esta propiedad.
        /*reglasDescuento: reglasDescuento.map(r => ({
          rangoInicio: r.rangoInicio,
          rangoFin: r.rangoFin,
          porcentajeDescuento: r.porcentajeDescuento
        }))*/
      };

      await crearProducto(productoRequest);
      
      // Redirigir de vuelta al inventario tras el éxito
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
      
      {/* Cabecera / Navbar superior de acción */}
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
          disabled={guardando} 
          className="bg-[#087f99] hover:bg-[#066a80] text-white gap-2 font-medium"
        >
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Guardar Producto
        </Button>
      </div>

      {/* Mensaje de Error global */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Grid de Formulario */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA Y CENTRAL: Detalles del producto y Variantes (Ocupa 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Información Básica */}
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
                placeholder="Describe los detalles de la prenda, materiales, etc..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-zinc-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f99] focus-visible:ring-offset-0 text-zinc-800 placeholder:text-zinc-400"
              />
            </div>
            {/* Card: Multimedia / Imagen */}
            <div className="space-y-1">
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

              {/* Preview de la imagen si existe la URL */}
              {imagenUrl.trim() && (
                <div className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 flex justify-center items-center h-40 overflow-hidden">
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

          {/* Card: Variantes (Tallas y Colores) */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">Tallas y Variantes Disponibles</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Selecciona una talla, escribe el color y define el stock inicial.</p>
            </div>

            {/* Sub-formulario para agregar una variante temporal */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">1. Talla</label>
                <select 
                  value={tallaSeleccionada}
                  onChange={(e) => {setTallaSeleccionada(e.target.value); setErrorVariante(null);}}
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
                <Input 
                  type="text" 
                  placeholder="Ej. Blanco, Negro" 
                  value={colorInput}
                  onChange={(e) => {setColorInput(e.target.value); setErrorVariante(null);}}
                  className="border-zinc-200 bg-white h-10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-600">3. Stock Inicial</label>
                <Input 
                  type="number" 
                  min="0"
                  value={stockInput}
                  onChange={(e) => setStockInput(e.target.value)}
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
                        <td className="p-3">{v.color}</td>
                        <td className="p-3">
                          <span className="bg-zinc-100 px-2.5 py-0.5 rounded-full font-mono text-xs font-medium text-zinc-700">
                            {v.stockDisponible} uds
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

        {/* COLUMNA DERECHA: Organización, Precios y Multimedia (Ocupa 1/3) */}
        <div className="space-y-6">
  
          {/* Card: Precio y Categoría */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Precio y Categoría</h2>
            
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">Precio Base (S/.) *</label>
              <Input 
                type="number" 
                step="1.00"
                min="0"
                placeholder="0.00" 
                value={precioBase}
                onChange={(e) => setPrecioBase(e.target.value)}
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

          {/* NUEVO: CARD - REGLAS DE DESCUENTO POR VOLUMEN            */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800 border-b border-zinc-100 pb-2">Reglas de Descuento</h2>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Establece escalas de descuento según la cantidad total de unidades compradas.
              </p>
            </div>

            {/* Inputs de ingreso rápidos */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-600">Rango Inicial (und)</label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="Min"
                    value={rangoInicioInput}
                    onChange={(e) => {setRangoInicioInput(e.target.value); setErrorRegla(null);}}
                    className="h-9 bg-white text-xs border-zinc-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-zinc-600">Rango Final (und)</label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="Max"
                    value={rangoFinInput}
                    onChange={(e) => {setRangoFinInput(e.target.value); setErrorRegla(null);}}
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
                    onChange={(e) => {setPorcentajeInput(e.target.value); setErrorRegla(null);}}
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

            {/* Tabla resumen de reglas añadidas */}
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
                          {regla.rangoInicio} - {regla.rangoFin} und.
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded font-mono font-bold">
                          {regla.porcentajeDescuento.toFixed(2)}%
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