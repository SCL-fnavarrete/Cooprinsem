// Números de serie de materiales — PE-23 Materiales seriados (ventana "Series"
// de Crear Pedido). Imagen local de lo enviado a SAP: tabla pedido_posicion_serie.

// Serie tal como la devuelve la validación (POST /api/sap-series/validar).
export interface ISerieValidada {
  numeroSerie: string   // SERNR
  material: string      // MATNR validado contra Sap_producto
  lote: string          // CHARG, ej. GENERICO
  centro: string        // WERKS, ej. D190
  almacen: string       // LGORT, ej. B000
  disponible: boolean   // Disponible para entrega según SAP
  motivo?: string       // Motivo cuando no está disponible
}

// Serie asignada a una línea del pedido (solo series disponibles).
export type ISerieAsignada = Omit<ISerieValidada, 'disponible' | 'motivo'>
