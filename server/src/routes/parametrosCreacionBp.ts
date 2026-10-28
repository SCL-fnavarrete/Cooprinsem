// Variables de sistema de la creación de cliente, destinatario de mercancía y
// persona que retira en SAP (correo de José Castillo, 27-10-2026). Viven en
// pos_parametro_general (auto-init en pgSetup.ts) y se editan en Admin >
// Parámetros. Los valores van con el formato de SAP ("00", "02", "0002"): la
// tabla del correo venía de Excel y perdía los ceros a la izquierda.

export interface IParametroCreacionBp {
  clave: string;
  valor: string;
  descripcion: string;
}

export const PARAMETROS_CREACION_BP: IParametroCreacionBp[] = [
  // Cliente (ZNAC)
  { clave: 'BP_AGRUPACION', valor: 'ZNAC', descripcion: 'Crear cliente: agrupación BP' },
  { clave: 'CLI_NUMERACION_EXTERNA', valor: 'S', descripcion: 'Crear cliente: S = el POS envía el número (IDCLIENTE); N = SAP asigna el número (ZNAC sigue externa en DEV, 28-10-2026)' },
  { clave: 'CLI_GRUPO_CUENTA', valor: 'ZD01', descripcion: 'Crear cliente: grupo de cuentas deudor' },
  { clave: 'CLI_SOCIEDAD', valor: 'COOP', descripcion: 'Crear cliente: sociedad' },
  { clave: 'CLI_SOC_COND_PAGO', valor: 'D001', descripcion: 'Crear cliente: condición de pago (sociedad)' },
  { clave: 'CLI_SOC_CUENTA_ASOC', valor: '1010401000', descripcion: 'Crear cliente: cuenta asociada (ReconciliationAccount)' },
  { clave: 'CLI_SOC_GRUPO_TESOR', valor: 'E1', descripcion: 'Crear cliente: grupo de tesorería (CashPlanningGroup)' },
  { clave: 'CLI_ORG_VENTAS', valor: 'COOP', descripcion: 'Cliente y persona retira: organización de ventas' },
  { clave: 'CLI_CANAL', valor: '00', descripcion: 'Cliente y persona retira: canal de distribución' },
  { clave: 'CLI_SECTOR', valor: '00', descripcion: 'Cliente y persona retira: sector' },
  { clave: 'CLI_VTA_COND_PAGO', valor: 'D001', descripcion: 'Crear cliente: condición de pago (ventas)' },
  { clave: 'CLI_COND_EXPEDICION', valor: '02', descripcion: 'Crear cliente: condición de expedición' },
  { clave: 'CLI_ESQUEMA_CLIENTE', valor: '1', descripcion: 'Crear cliente: esquema de cliente (CustomerPricingProcedure)' },
  { clave: 'CLI_GR_IMPUTACION', valor: '01', descripcion: 'Crear cliente: grupo de imputación (CustomerAccountAssignmentGroup)' },
  { clave: 'CLI_GRUPO_ESTAD', valor: '1', descripcion: 'Crear cliente: grupo estadístico — NO se envía (la API de SAP no tiene CustomerStatisticsGroup)' },
  { clave: 'CLI_GRUPO_CLIENTES', valor: '10', descripcion: 'Crear cliente: grupo de clientes (CustomerGroup)' },
  { clave: 'CLI_IMP_PAIS', valor: 'CL', descripcion: 'Crear cliente: país de salida (impuesto)' },
  { clave: 'CLI_IMP_CATEGORIA', valor: 'MWST', descripcion: 'Crear cliente: categoría de impuesto' },

  // Destinatario de mercancía (ZDES)
  { clave: 'DEST_CATEGORIA', valor: '2', descripcion: 'Crear destinatario: categoría BP (2 = organización)' },
  { clave: 'DEST_AGRUPACION', valor: 'ZDES', descripcion: 'Crear destinatario: agrupación BP' },
  { clave: 'DEST_IDIOMA_CORRESP', valor: 'ES', descripcion: 'Crear destinatario: idioma de correspondencia' },
  { clave: 'DEST_ROL', valor: 'FLCU01', descripcion: 'Crear destinatario: rol BP' },
  { clave: 'DEST_DIR_PAIS', valor: 'CL', descripcion: 'Crear destinatario: país de la dirección' },
  { clave: 'DEST_DIR_IDIOMA', valor: 'ES', descripcion: 'Crear destinatario: idioma de la dirección' },
  { clave: 'DEST_TIPO_IMPUESTO', valor: 'CL1', descripcion: 'Crear destinatario: tipo de número fiscal' },
  { clave: 'DEST_GRUPO_CUENTA', valor: 'ZD06', descripcion: 'Crear destinatario: grupo de cuentas deudor' },
  { clave: 'DEST_ORG_VENTAS', valor: 'COOP', descripcion: 'Crear destinatario: organización de ventas' },
  { clave: 'DEST_CANAL', valor: '00', descripcion: 'Crear destinatario: canal de distribución' },
  { clave: 'DEST_SECTOR', valor: '00', descripcion: 'Crear destinatario: sector' },
  { clave: 'DEST_MONEDA', valor: 'CLP', descripcion: 'Crear destinatario: moneda' },
  { clave: 'DEST_COND_EXPEDICION', valor: '02', descripcion: 'Crear destinatario: condición de expedición' },
  { clave: 'DEST_IMP_PAIS', valor: 'CL', descripcion: 'Crear destinatario: país de salida (impuesto)' },
  { clave: 'DEST_IMP_CATEGORIA', valor: 'MWST', descripcion: 'Crear destinatario: categoría de impuesto' },
  { clave: 'DEST_IMP_CLASIF', valor: '1', descripcion: 'Crear destinatario: clasificación fiscal' },
  { clave: 'DEST_FUNCION_INTERLOC', valor: 'WE', descripcion: 'Crear destinatario: función de interlocutor en el cliente' },

  // Persona que retira (ZPER)
  { clave: 'RET_CATEGORIA', valor: '1', descripcion: 'Crear persona retira: categoría BP (1 = persona)' },
  { clave: 'RET_AGRUPACION', valor: 'ZPER', descripcion: 'Crear persona retira: agrupación BP' },
  { clave: 'RET_IDIOMA_CORRESP', valor: 'ES', descripcion: 'Crear persona retira: idioma de correspondencia' },
  { clave: 'RET_TRATAMIENTO', valor: '0002', descripcion: 'Crear persona retira: tratamiento por defecto' },
  { clave: 'RET_DIR_PAIS', valor: 'CL', descripcion: 'Crear persona retira: país de la dirección' },
  { clave: 'RET_DIR_IDIOMA', valor: 'ES', descripcion: 'Crear persona retira: idioma de la dirección' },
  { clave: 'RET_TEL_PAIS', valor: 'CL', descripcion: 'Crear persona retira: país del teléfono' },
  { clave: 'RET_TIPO_IMPUESTO', valor: 'CL1', descripcion: 'Crear persona retira: tipo de número fiscal' },
  { clave: 'RET_VALIDEZ_HASTA', valor: '31-12-9999', descripcion: 'Crear persona retira (AP): fin de validez de la relación con el cliente (DD-MM-AAAA)' },
  { clave: 'RET_FUNCION_CONTACTO', valor: '', descripcion: 'Crear persona retira: función de la persona de contacto (por confirmar, no se envía)' },
  { clave: 'RET_FUNCION_INTERLOC', valor: 'ZB', descripcion: 'Crear persona retira: ZB = cuelga del destinatario (como en SAP hoy); AP = contacto del cliente (correo José)' },
  // Solo con ZB (copiados de las personas ZB que ya existen en SAP, ej. 90001424)
  { clave: 'RET_ROL', valor: 'FLCU01', descripcion: 'Crear persona retira (ZB): rol BP' },
  { clave: 'RET_GRUPO_CUENTA', valor: 'ZD09', descripcion: 'Crear persona retira (ZB): grupo de cuentas deudor' },
  { clave: 'RET_MONEDA', valor: 'CLP', descripcion: 'Crear persona retira (ZB): moneda del área de ventas' },
];

export type ParametrosCreacionBp = Record<string, string>;

/** Valores leídos de la BD sobre los por defecto: un parámetro vacío o borrado usa el valor por defecto. */
export function completarParametrosCreacionBp(leidos: Record<string, string | null | undefined>): ParametrosCreacionBp {
  const resultado: ParametrosCreacionBp = {};
  for (const p of PARAMETROS_CREACION_BP) {
    const valor = leidos[p.clave]?.trim();
    resultado[p.clave] = valor ? valor : p.valor;
  }
  return resultado;
}
