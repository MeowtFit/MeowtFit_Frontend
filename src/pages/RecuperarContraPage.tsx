import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import logoMeowtfit from "../assets/logo.png"

export default function RecuperarContraPage() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token") || ""

    const [nuevaContrasena, setNuevaContrasena] = useState("")
    const [confirmarContrasena, setConfirmarContrasena] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) {
            setError("No se ha proporcionado un token válido en la URL.")
        }
    }, [token])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (nuevaContrasena !== confirmarContrasena) {
            setError("Las contraseñas no coinciden.")
            return
        }

        setIsLoading(true)
        setMessage("")
        setError("")

        try {
            const response = await fetch("http://localhost:8080/api/auth/recuperar-password/confirmar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    token,
                    nuevaContrasena,
                    confirmarContrasena
                })
            })

            const data = await response.json()

            if (response.ok) {
                setMessage(data.mensaje || "Contraseña actualizada exitosamente.")
                // Redirigir al login después de unos segundos
                setTimeout(() => {
                    navigate("/login")
                }, 3000)
            } else {
                setError(data.mensaje || "El token es inválido o ha expirado.")
            }
        } catch (err) {
            setError("Error de conexión con el servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#fdfbfb] to-[#fceef5] font-sans">
        <header className="w-full pt-8 pb-4 flex justify-center items-center">
            <div className="flex flex-col items-center">
                <img src={logoMeowtfit} alt="Logo Meowtfit" className="h-20 w-auto object-contain" />
            </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <Card className="w-full max-w-lg overflow-hidden rounded-md shadow-2xl border-0 bg-white">
            <CardContent className="p-8 sm:p-12 flex flex-col justify-center">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-[#fceef5] p-3 rounded-full text-[#b43b6c]">
                            <Lock size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Crea una nueva contraseña
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Ingresa tu nueva contraseña a continuación.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleReset}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nuevaContrasena" className="text-xs font-bold text-[#b43b6c] uppercase tracking-wider">
                                Nueva Contraseña
                            </Label>
                            <Input 
                                id="nuevaContrasena" 
                                type="password" 
                                value={nuevaContrasena} 
                                onChange={(e) => setNuevaContrasena(e.target.value)}
                                className="h-12 bg-[#f9fafb] border-gray-200 focus-visible:ring-[#0a7c98] text-sm"
                                required
                                disabled={!token || isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmarContrasena" className="text-xs font-bold text-[#b43b6c] uppercase tracking-wider">
                                Confirmar Contraseña
                            </Label>
                            <Input 
                                id="confirmarContrasena" 
                                type="password" 
                                value={confirmarContrasena} 
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                className="h-12 bg-[#f9fafb] border-gray-200 focus-visible:ring-[#0a7c98] text-sm"
                                required
                                disabled={!token || isLoading}
                            />
                        </div>
                    </div>

                    <Button 
                        type="submit"
                        disabled={!token || isLoading}
                        className="w-full h-12 bg-[#0a7c98] hover:bg-[#086379] text-white text-xs font-bold tracking-wide rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "ACTUALIZANDO..." : "CAMBIAR CONTRASEÑA"}
                    </Button>

                    {message && (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-200 text-center">
                            {message} <br/><span className="text-xs opacity-80">Redirigiendo al login...</span>
                        </div>
                    )}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 text-center">
                            {error}
                        </div>
                    )}
                </form>
            </CardContent>
            </Card>
        </main>
        </div>
    )
}
