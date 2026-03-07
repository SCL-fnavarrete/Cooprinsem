import type { MATNR, WERKS, LGORT } from './sap'

// Artículo del catálogo SAP (desde GET /api/materiales)
export interface IArticulo {
  codigoMaterial: MATNR       // matnr
  descripcion: string          // descripcion
  precioUnitario: number       // precio_unitario en CLP, entero
  unidadMedida: string         // unidad_medida (UN, KG, MT, L, GL, SA)
  stockDisponible: number      // stock_disponible en el centro/almacén principal
  centro: WERKS                // centro consultado (ej: D190)
  almacen: LGORT               // almacen consultado (ej: B000)
}

// Resultado de búsqueda (incluye stockDisponible para ordenar)
export type IArticuloBusqueda = IArticulo
