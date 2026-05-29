import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MessageCircle, Mail, Info } from "lucide-react"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import logoMeowtfit from "../assets/logo.png"

export default function OlvideContraPage() {
    const [identifier, setIdentifier] = useState("")
    const navigate = useNavigate()

    const handleRecover = (e: React.FormEvent) => {
    e.preventDefault()
    // --- AQUÍ IRÍA TU LÓGICA REAL ---
    // Llamada a la API para enviar el correo de recuperación
    console.log("Solicitando recuperación para:", identifier)

    // Ejemplo de redirección tras éxito:
    // alert("Enlace enviado a tu correo.")
    // navigate("/login")
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
            
            {/* Columna Izquierda - Imagen y Texto */}
            <div className="hidden md:flex md:w-1/2 relative bg-cover bg-center min-h-[550px]"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop')" }}
            >
            {/* Sombra oscura degradada para que el texto sea legible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                <div className="absolute bottom-10 left-10 right-10 text-white">
                <h2 className="text-3xl font-semibold mb-2">Redescubre tu estilo.</h2>
                <p className="text-sm text-gray-100 font-light pr-8">
                    Te ayudamos a recuperar el acceso a lo mejor de la moda felina y chic.
                </p>
                </div>
            </div>

            {/* Columna Derecha - Formulario */}
            <CardContent className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                
                {/* Botón de regreso */}
                <button onClick={() => navigate("/login")}
                className="cursor-pointer flex items-center text-[#b43b6c] text-xs font-bold uppercase tracking-wider hover:underline mb-10 w-fit transition-all"
                >
                <ArrowLeft size={14} className="mr-2" />
                Volver al inicio
                </button>

                {/* Títulos */}
                <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    ¿Olvidaste tu contraseña?
                </h1>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                    No te preocupes, sucede. Ingresa tus datos abajo y te enviaremos un enlace seguro para restablecer tu cuenta de inmediato.
                </p>
                </div>

                {/* Formulario */}
                <form className="space-y-6" onSubmit={handleRecover}>
                <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs font-bold text-[#b43b6c] uppercase tracking-wider">
                    Correo electrónico o DNI
                    </Label>
                    <Input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ejemplo@correo.com o 12345678"
                    className="h-12 bg-[#f9fafb] border-gray-200 focus-visible:ring-[#0a7c98] placeholder:text-gray-400 text-sm"
                    required
                    />
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                    <Info size={12} className="text-gray-400" />
                    <span>Usaremos este dato para localizar tu perfil.</span>
                    </div>
                </div>

                {/* Botón Principal */}
                <Button className="w-full h-12 bg-[#0a7c98] hover:bg-[#086379] text-white text-xs font-bold tracking-wide rounded-md transition-colors">
                    ENVIAR ENLACE DE RECUPERACIÓN
                </Button>
                </form>

                {/* Sección de Ayuda Adicional */}
                <div className="mt-12 pt-8 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4">¿Necesitas ayuda adicional?</p>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => window.open('https://wa.me/123456789', '_blank')} variant="outline" className="h-10 text-xs font-medium text-gray-600 border-gray-200 hover:bg-gray-50 rounded-full px-5 flex gap-2 items-center">
                        <MessageCircle size={16}/>
                        WhatsApp
                        </Button>
                        <Button variant="outline" className="h-10 text-xs font-medium text-gray-600 border-gray-200 hover:bg-gray-50 rounded-full px-5 flex gap-2 items-center">
                        <Mail size={16} />
                        Soporte por Email
                        </Button>
                    </div>
                </div>

            </CardContent>
            </Card>
        </main>

        {/* Pie de página (como en la imagen, versión reducida) */}
        <footer className="w-full py-8 px-4 md:px-12 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 bg-white mt-auto border-t border-gray-100">
            <div className="font-bold text-gray-900 text-sm mb-4 md:mb-0">Meowtfit Boutique</div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-4 md:mb-0">
            <a href="#" className="hover:text-gray-800 transition-colors">Guía de Tallas</a>
            <a href="#" className="hover:text-gray-800 transition-colors">Envíos y Retornos</a>
            <a href="#" className="hover:text-gray-800 transition-colors">Sostenibilidad</a>
            <a href="#" className="hover:text-gray-800 transition-colors">Contacto</a>
            </div>
            <div className="text-[10px] md:text-xs text-center md:text-right">
            © 2024 Meowtfit Boutique. Inspiración local, visión global.
            </div>
        </footer>
        </div>
    )
}