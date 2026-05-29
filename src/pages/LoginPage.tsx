import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff} from "lucide-react"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import logoMeowtfit from "../assets/logo.png"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    let esUsuarioCorrecto = false;

    // --- AQUÍ IRÍA TU LÓGICA REAL ---
    // Normalmente aquí leerías los valores del correo y contraseña
    // y preguntarías a tu servidor/API si son correctos.
    if (email === "mi@correo.com" && password === "1234") { esUsuarioCorrecto = true }
    //

    if (esUsuarioCorrecto) {
      navigate("/")
    } else {
      setError("El correo o contraseña son incorrectos. Por favor, inténtalo de nuevo.")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#fdfbfb] to-[#fceef5] font-sans">
      
      {/* Cabecera */}
      <header className="w-full pt-8 pb-4 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <img src={logoMeowtfit} alt="Logo Meowtfit" className="h-20 w-auto object-contain" />
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-md shadow-2xl border-0 bg-white">
          {/* Columna Izquierda - Imagen */}
          <div 
            className="hidden md:flex md:w-1/2 relative bg-cover bg-center min-h-[550px]"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop')" }}
          >
            {/* Sombra oscura degradada para que el texto sea legible */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            
            <div className="absolute bottom-10 left-10 right-10 text-white">
              <h2 className="text-xl font-medium mb-2">Inspiración local</h2>
              <p className="text-sm text-gray-200">
                Descubre la esencia de la moda boutique con sello peruano.
              </p>
            </div>
          </div>

          {/* Columna Derecha - Formulario */}
          <CardContent className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
            
            <div className="mb-8">
              <h1 className="text-xl font-medium text-gray-800">
                Bienvenida de nuevo
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Accede a tu cuenta exclusiva de Meowtfit.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-4">
                <Input
                  id="identifier"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="CORREO O DNI"
                  className="h-12 rounded-sm border-gray-300 focus-visible:ring-[#0a7c98] placeholder:text-gray-400 placeholder:text-xs"
                />

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="CONTRASEÑA"
                    className="h-12 rounded-sm border-gray-300 focus-visible:ring-[#0a7c98] placeholder:text-gray-400 placeholder:text-xs pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                     {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (<p className="text-red-500 text-xs mt-1 font-medium animate-in fade-in duration-200">{error}</p>)}
              </div>

              {/* Checkbox y Olvidé Contraseña */}
              <div className="flex items-center justify-between text-xs mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input type="checkbox" className="rounded-sm border-gray-300 text-[#0a7c98] focus:ring-[#0a7c98] w-3.5 h-3.5" />
                  Recordarme
                </label>
                <Link to="/forgotPassword" className="text-[#b43b6c] font-semibold hover:underline tracking-wide">
                  Olvidé mi contraseña
                </Link>
              </div>

              {/* Botón Principal */}
              <Button className="w-full h-11 bg-[#0a7c98] hover:bg-[#086379] text-white text-xs font-medium tracking-wide mt-6 rounded-sm">
                INICIAR SESIÓN
              </Button>

              <div className="text-center text-xs text-gray-500 mt-6 mb-2">
                Accede a tu cuenta exclusiva de Meowtfit.
              </div>
              
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Pie de página */}
      <footer className="w-full py-6 px-4 md:px-12 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
        <div className="font-bold text-gray-900 text-sm mb-4 md:mb-0">Meowtfit</div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-4 md:mb-0">
          <a href="#" className="hover:text-gray-800 transition-colors">Guía de Tallas</a>
          <a href="#" className="hover:text-gray-800 transition-colors">Envíos y Retornos</a>
          <a href="#" className="hover:text-gray-800 transition-colors">Sostenibilidad</a>
          <a href="#" className="hover:text-gray-800 transition-colors">Contacto</a>
        </div>
        <div className="text-[10px] md:text-xs text-center md:text-right">
          © 2026 Meowtfit.
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a href="https://wa.me/123456789" target="_blank" rel="noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:bg-[#20bd5a] hover:scale-105 transition-all z-50 flex items-center justify-center"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>

  )
}