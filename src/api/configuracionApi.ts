const API_BASE_URL = "http://localhost:8080";

export type ConfiguracionNegocio = {
  idConfiguracion: number;
  stockMinimoCotizacion: number;
  porcentajePrecioPiso: number;
};

export async function obtenerConfiguracionNegocio() {
  const response = await fetch(
    `${API_BASE_URL}/api/configuracion`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "No se pudo obtener la configuración"
    );
  }

  return response.json() as Promise<ConfiguracionNegocio>;
}