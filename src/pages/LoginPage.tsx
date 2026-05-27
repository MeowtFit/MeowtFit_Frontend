import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardContent className="p-8">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">
              Iniciar sesión
            </h1>

            <p className="text-muted-foreground mt-2">
              Bienvenido de nuevo
            </p>
          </div>

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">
                Correo electrónico
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="correo@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña
              </Label>

              <Input
                id="password"
                type="password"
                placeholder="********"
              />
            </div>

            <Button className="w-full" type="submit">
              Ingresar
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  )
}