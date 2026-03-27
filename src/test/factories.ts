import type { ICliente, IClienteBusqueda } from '@/types/cliente'
import type { IArticulo, IArticuloBusqueda } from '@/types/articulo'
import type { IPartidaAbierta } from '@/types/caja'
import type { IPagare } from '@/types/pagare'
import type { IAnticipo } from '@/types/anticipo'
import type { IArqueoCaja, IArqueoDetalle, ICierreCaja } from '@/types/arqueo'
import type { IUsuarioAdmin, IRol, ISucursal } from '@/types/admin'
import type { IPedidoListItem, IPedidoDetalle } from '@/types/pedido'
import { CLIENTE_BOLETA } from '@/config/sap'

// Helper: calcula dígito verificador RUT módulo 11
function calcDV(cuerpo: number): string {
  let sum = 0
  let factor = 2
  let n = cuerpo
  while (n > 0) {
    sum += (n % 10) * factor
    n = Math.floor(n / 10)
    factor = factor === 7 ? 2 : factor + 1
  }
  const r = 11 - (sum % 11)
  if (r === 11) return '0'
  if (r === 10) return 'K'
  return String(r)
}

function fmtRUT(cuerpo: number): string {
  return `${cuerpo.toLocaleString('es-CL')}-${calcDV(cuerpo)}`
}

// ----------------------------------------------------------------
// CLIENTES
// ----------------------------------------------------------------

export function crearClienteMock(overrides: Partial<ICliente> = {}): ICliente {
  return {
    codigoCliente: '0001000001',
    nombre: 'Agricola Los Boldos Ltda.',
    rut: fmtRUT(76543210),
    condicionPago: 'CONT',
    estadoCredito: 'AL_DIA',
    creditoAsignado: 5000000,
    creditoUtilizado: 1200000,
    porcentajeAgotamiento: 24,
    sucursal: 'D190',
    tratamiento: 'Señor',
    conceptoBusqueda: 'BOLDOS',
    giro: 'AGRICOLA',
    direccion: 'Camino Los Boldos Km 5',
    region: 'X- De los Lagos',
    ciudad: 'Osorno',
    comuna: 'Osorno',
    zonaTransporte: 'TIENDA',
    telefono: '642345678',
    celular: '979123456',
    correoFactura: 'facturacion@losboldos.cl',
    razonSocial: 'Agricola Los Boldos Ltda.',
    clasificacionComercial: 'AGRICOLA',
    grupoControlCredito: '1',
    ...overrides,
  }
}

export function crearClienteBloqueadoMock(overrides: Partial<ICliente> = {}): ICliente {
  return crearClienteMock({
    codigoCliente: '0001000003',
    nombre: 'Ferreteria Central Osorno',
    rut: fmtRUT(78901234),
    condicionPago: 'CONT',
    estadoCredito: 'BLOQUEADO',
    creditoAsignado: 2000000,
    creditoUtilizado: 2100000,
    porcentajeAgotamiento: 105,
    ...overrides,
  })
}

export const CLIENTE_BOLETA_MOCK: ICliente = {
  codigoCliente: CLIENTE_BOLETA,
  nombre: 'Consumidor Final (Boleta)',
  rut: '',
  condicionPago: 'CONT',
  estadoCredito: 'AL_DIA',
  creditoAsignado: 0,
  creditoUtilizado: 0,
  porcentajeAgotamiento: 0,
  sucursal: 'D190',
}

// 10 clientes realistas alineados con el seed del backend
export const CLIENTES_MOCK: IClienteBusqueda[] = [
  crearClienteMock(),
  crearClienteMock({
    codigoCliente: '0001000002',
    nombre: 'Fundo El Roble SpA',
    rut: fmtRUT(77123456),
    condicionPago: '30D',
    estadoCredito: 'CON_DEUDA',
    creditoAsignado: 3000000,
    creditoUtilizado: 2800000,
    porcentajeAgotamiento: 93,
    sucursal: 'D190',
  }),
  crearClienteBloqueadoMock(),
  crearClienteMock({
    codigoCliente: '0001000004',
    nombre: 'Cooperativa Campesina San Jose',
    rut: fmtRUT(73456789),
    condicionPago: '60D',
    estadoCredito: 'AL_DIA',
    creditoAsignado: 10000000,
    creditoUtilizado: 3500000,
    porcentajeAgotamiento: 35,
    sucursal: 'D052',
  }),
  crearClienteMock({
    codigoCliente: '0001000005',
    nombre: 'Agricola y Ganadera Patagonia Ltda.',
    rut: fmtRUT(79234567),
    condicionPago: '30D',
    estadoCredito: 'BLOQUEADO',
    creditoAsignado: 1500000,
    creditoUtilizado: 1600000,
    porcentajeAgotamiento: 107,
    sucursal: 'D052',
  }),
  crearClienteMock({
    codigoCliente: '0001000006',
    nombre: 'Constructora Los Lagos S.A.',
    rut: fmtRUT(76789012),
    condicionPago: 'CONT',
    estadoCredito: 'AL_DIA',
    creditoAsignado: 0,
    creditoUtilizado: 0,
    porcentajeAgotamiento: 0,
    sucursal: 'D014',
  }),
  crearClienteMock({
    codigoCliente: '0001000007',
    nombre: 'Semillas y Fertilizantes del Sur Ltda.',
    rut: fmtRUT(77654321),
    condicionPago: '30D',
    estadoCredito: 'CON_DEUDA',
    creditoAsignado: 8000000,
    creditoUtilizado: 5200000,
    porcentajeAgotamiento: 65,
    sucursal: 'D190',
  }),
  crearClienteMock({
    codigoCliente: '0001000008',
    nombre: 'Insumos Agropecuarios Rucalhue SpA',
    rut: fmtRUT(78345678),
    condicionPago: '60D',
    estadoCredito: 'AL_DIA',
    creditoAsignado: 6000000,
    creditoUtilizado: 900000,
    porcentajeAgotamiento: 15,
    sucursal: 'D190',
  }),
  crearClienteMock({
    codigoCliente: '0001000009',
    nombre: 'Ganaderia y Lecheria Pilmaiquen Ltda.',
    rut: fmtRUT(76012345),
    condicionPago: 'CONT',
    estadoCredito: 'BLOQUEADO',
    creditoAsignado: 4000000,
    creditoUtilizado: 4500000,
    porcentajeAgotamiento: 113,
    sucursal: 'D052',
  }),
  CLIENTE_BOLETA_MOCK,
]

// ----------------------------------------------------------------
// ARTÍCULOS (30 materiales alineados con seed del backend)
// ----------------------------------------------------------------

let articuloCounter = 0

export function crearArticuloMock(overrides: Partial<IArticulo> = {}): IArticulo {
  articuloCounter++
  return {
    codigoMaterial: `MAT${String(articuloCounter).padStart(6, '0')}`,
    descripcion: `Artículo de prueba ${articuloCounter}`,
    precioUnitario: 9990,
    unidadMedida: 'UN',
    stockDisponible: 50,
    centro: 'D190',
    almacen: 'B000',
    ...overrides,
  }
}

export const ARTICULOS_MOCK: IArticuloBusqueda[] = [
  // Ferretería
  { codigoMaterial: 'MAT000001', descripcion: 'Clavo de acero 3" caja 1kg', precioUnitario: 2490, unidadMedida: 'UN', stockDisponible: 21, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000002', descripcion: 'Clavo de acero 4" caja 1kg', precioUnitario: 2690, unidadMedida: 'UN', stockDisponible: 22, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000003', descripcion: 'Tornillo autorroscante 1/2" x 8 (100un)', precioUnitario: 3990, unidadMedida: 'UN', stockDisponible: 13, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000004', descripcion: 'Tornillo autorroscante 1" x 8 (100un)', precioUnitario: 4490, unidadMedida: 'UN', stockDisponible: 14, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000005', descripcion: 'Martillo carpintero 25oz mango fibra', precioUnitario: 18990, unidadMedida: 'UN', stockDisponible: 15, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000006', descripcion: 'Destornillador plano 6" profesional', precioUnitario: 5990, unidadMedida: 'UN', stockDisponible: 16, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000007', descripcion: 'Destornillador estrella PH2 6"', precioUnitario: 5990, unidadMedida: 'UN', stockDisponible: 17, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000008', descripcion: 'Llave ajustable 12" acero', precioUnitario: 14990, unidadMedida: 'UN', stockDisponible: 18, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000009', descripcion: 'Cinta metrica 5m acero inoxidable', precioUnitario: 8990, unidadMedida: 'UN', stockDisponible: 19, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000010', descripcion: 'Nivel de burbuja 60cm aluminio', precioUnitario: 12990, unidadMedida: 'UN', stockDisponible: 20, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000011', descripcion: 'Pintura latex blanca 1 galon', precioUnitario: 18500, unidadMedida: 'GL', stockDisponible: 21, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000012', descripcion: 'Pintura latex blanca 4 galones', precioUnitario: 69000, unidadMedida: 'GL', stockDisponible: 22, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000013', descripcion: 'Pintura esmalte cafe 1 galon', precioUnitario: 21500, unidadMedida: 'GL', stockDisponible: 23, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000014', descripcion: 'Rodillo pintura 9" con bandeja', precioUnitario: 5490, unidadMedida: 'UN', stockDisponible: 24, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000015', descripcion: 'Brocha cerdas naturales 3"', precioUnitario: 3990, unidadMedida: 'UN', stockDisponible: 25, centro: 'D190', almacen: 'B000' },
  // Insumos agrícolas
  { codigoMaterial: 'MAT000021', descripcion: 'Fertilizante NPK 15-15-15 saco 50kg', precioUnitario: 32000, unidadMedida: 'SA', stockDisponible: 31, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000022', descripcion: 'Fertilizante Urea 46% saco 50kg', precioUnitario: 28500, unidadMedida: 'SA', stockDisponible: 32, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000023', descripcion: 'Superfosfato triple saco 50kg', precioUnitario: 35000, unidadMedida: 'SA', stockDisponible: 33, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000024', descripcion: 'Nitrato de potasio saco 25kg', precioUnitario: 45000, unidadMedida: 'SA', stockDisponible: 34, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000025', descripcion: 'Sulfato de amonio saco 50kg', precioUnitario: 22000, unidadMedida: 'SA', stockDisponible: 35, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000026', descripcion: 'Herbicida glifosato 48% litro', precioUnitario: 8990, unidadMedida: 'L', stockDisponible: 36, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000027', descripcion: 'Herbicida glifosato 48% 20 litros', precioUnitario: 159000, unidadMedida: 'L', stockDisponible: 37, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000028', descripcion: 'Insecticida clorpirifos 48% litro', precioUnitario: 12500, unidadMedida: 'L', stockDisponible: 38, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000029', descripcion: 'Fungicida mancozeb 80% kg', precioUnitario: 18000, unidadMedida: 'KG', stockDisponible: 39, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000030', descripcion: 'Semilla trigo harinero certificada 50kg', precioUnitario: 89000, unidadMedida: 'SA', stockDisponible: 40, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000044', descripcion: 'Mochila aspersora 20 litros manual', precioUnitario: 35000, unidadMedida: 'UN', stockDisponible: 44, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000045', descripcion: 'Mochila aspersora 16 litros bateria', precioUnitario: 89000, unidadMedida: 'UN', stockDisponible: 45, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000046', descripcion: 'Pala recta mango madera 1.20m', precioUnitario: 14990, unidadMedida: 'UN', stockDisponible: 46, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000049', descripcion: 'Azadon mango fibra 1.2m 2.5lb', precioUnitario: 18990, unidadMedida: 'UN', stockDisponible: 49, centro: 'D190', almacen: 'B000' },
  { codigoMaterial: 'MAT000050', descripcion: 'Carretilla metalica 80 litros 1 rueda', precioUnitario: 49990, unidadMedida: 'UN', stockDisponible: 60, centro: 'D190', almacen: 'B000' },
]

// ----------------------------------------------------------------
// PARTIDAS ABIERTAS
// ----------------------------------------------------------------

function calcSemaforo(diasMora: number, fechaVenc: string): 'verde' | 'amarillo' | 'rojo' {
  if (diasMora > 0) return 'rojo'
  const venc = new Date(fechaVenc)
  const hoy = new Date()
  const diff = Math.floor((venc.getTime() - hoy.getTime()) / 86400000)
  if (diff <= 7) return 'amarillo'
  return 'verde'
}

let docCounter = 1900000100

export function crearFacturaPendienteMock(overrides: Partial<IPartidaAbierta> = {}): IPartidaAbierta {
  docCounter++
  const fechaVenc = new Date(Date.now() + 30 * 86400000).toISOString()
  const partida: IPartidaAbierta = {
    belnr: String(docCounter),
    kunnr: '0001000001',
    claseDoc: 'FV',
    fechaDoc: new Date(Date.now() - 30 * 86400000).toISOString(),
    fechaVenc,
    importe: 500000,
    estado: 'ABIERTO',
    diasMora: 0,
    semaforo: 'verde',
    ...overrides,
  }
  // Recalcular semáforo si no fue explícitamente sobreescrito
  if (!overrides.semaforo) {
    partida.semaforo = calcSemaforo(partida.diasMora, partida.fechaVenc)
  }
  return partida
}

export function crearFacturaVencidaMock(diasMora = 15): IPartidaAbierta {
  const fechaVenc = new Date(Date.now() - diasMora * 86400000).toISOString()
  return crearFacturaPendienteMock({
    fechaVenc,
    diasMora,
    estado: 'VENCIDO',
    semaforo: 'rojo',
  })
}

// 15 partidas alineadas con el seed (kunnrs de clientes existentes)
export const PARTIDAS_MOCK: IPartidaAbierta[] = [
  // Cliente 0001000001 — al día
  crearFacturaPendienteMock({ belnr: '1900000001', kunnr: '0001000001', importe: 850000, fechaVenc: new Date(Date.now() + 15 * 86400000).toISOString() }),
  crearFacturaPendienteMock({ belnr: '1900000002', kunnr: '0001000001', importe: 320000, fechaVenc: new Date(Date.now() + 30 * 86400000).toISOString() }),
  // Cliente 0001000002 — próximas a vencer (<7 días)
  crearFacturaPendienteMock({ belnr: '1900000003', kunnr: '0001000002', importe: 1250000, fechaVenc: new Date(Date.now() + 5 * 86400000).toISOString(), semaforo: 'amarillo' }),
  crearFacturaPendienteMock({ belnr: '1900000004', kunnr: '0001000002', claseDoc: 'NC', importe: 180000, fechaVenc: new Date(Date.now() + 3 * 86400000).toISOString(), semaforo: 'amarillo' }),
  // Cliente 0001000003 — vencidas 1-30 días
  crearFacturaVencidaMock(10),
  crearFacturaVencidaMock(5),
  // Cliente 0001000004 — vencida 15 días
  crearFacturaVencidaMock(15),
  // Cliente 0001000005 — vencidas > 30 días
  crearFacturaVencidaMock(45),
  crearFacturaVencidaMock(60),
  // Cliente 0001000007 — mezcla
  crearFacturaVencidaMock(35),
  crearFacturaPendienteMock({ belnr: '1900000011', kunnr: '0001000007', importe: 670000, fechaVenc: new Date(Date.now() + 45 * 86400000).toISOString() }),
  // Cliente 0001000008
  crearFacturaPendienteMock({ belnr: '1900000012', kunnr: '0001000008', importe: 430000, fechaVenc: new Date(Date.now() + 10 * 86400000).toISOString() }),
  crearFacturaPendienteMock({ belnr: '1900000013', kunnr: '0001000008', claseDoc: 'NC', importe: 95000, fechaVenc: new Date(Date.now() + 20 * 86400000).toISOString() }),
  // Cliente 0001000009
  crearFacturaVencidaMock(20),
  crearFacturaVencidaMock(1),
  // Cliente Boleta 999999 — pedidos de mesón pendientes de cobro
  crearFacturaPendienteMock({ belnr: '1900000020', kunnr: '999999', claseDoc: 'FV', importe: 45000, fechaVenc: new Date(Date.now() + 20 * 86400000).toISOString() }),
  crearFacturaPendienteMock({ belnr: '1900000021', kunnr: '999999', claseDoc: 'FV', importe: 18500, fechaVenc: new Date(Date.now() + 25 * 86400000).toISOString() }),
  crearFacturaVencidaMock(3),  // docCounter auto — se asigna kunnr por defecto, sobreescribimos abajo
]
// Parche: la última partida vencida es para cliente boleta
PARTIDAS_MOCK[PARTIDAS_MOCK.length - 1] = {
  ...PARTIDAS_MOCK[PARTIDAS_MOCK.length - 1],
  belnr: '1900000022',
  kunnr: '999999',
  importe: 12000,
}

// ----------------------------------------------------------------
// PAGARÉS (solo lectura — compromisos de pago de clientes)
// ----------------------------------------------------------------

export const PAGARES_MOCK: IPagare[] = [
  { id: 'PAG-001', kunnr: '0001000001', nombre: 'Agricola Los Boldos Ltda.', rut: fmtRUT(76543210), referencia: 'PAG-2026-0001', cuota: 1, valorPagare: 850000, fechaVencimiento: '15/04/2026' },
  { id: 'PAG-002', kunnr: '0001000001', nombre: 'Agricola Los Boldos Ltda.', rut: fmtRUT(76543210), referencia: 'PAG-2026-0001', cuota: 2, valorPagare: 850000, fechaVencimiento: '15/05/2026' },
  { id: 'PAG-003', kunnr: '0001000002', nombre: 'Fundo El Roble SpA', rut: fmtRUT(77123456), referencia: 'PAG-2026-0015', cuota: 1, valorPagare: 1500000, fechaVencimiento: '01/03/2026' },
  { id: 'PAG-004', kunnr: '0001000004', nombre: 'Cooperativa Campesina San Jose', rut: fmtRUT(73456789), referencia: 'PAG-2026-0022', cuota: 1, valorPagare: 2000000, fechaVencimiento: '20/06/2026' },
  { id: 'PAG-005', kunnr: '0001000004', nombre: 'Cooperativa Campesina San Jose', rut: fmtRUT(73456789), referencia: 'PAG-2026-0022', cuota: 2, valorPagare: 2000000, fechaVencimiento: '20/07/2026' },
  { id: 'PAG-006', kunnr: '0001000007', nombre: 'Semillas y Fertilizantes del Sur Ltda.', rut: fmtRUT(77654321), referencia: 'PAG-2026-0030', cuota: 1, valorPagare: 350000, fechaVencimiento: '10/02/2026' },
  { id: 'PAG-007', kunnr: '0001000008', nombre: 'Insumos Agropecuarios Rucalhue SpA', rut: fmtRUT(78345678), referencia: 'PAG-2026-0041', cuota: 1, valorPagare: 75000, fechaVencimiento: '28/03/2026' },
  { id: 'PAG-008', kunnr: '0001000008', nombre: 'Insumos Agropecuarios Rucalhue SpA', rut: fmtRUT(78345678), referencia: 'PAG-2026-0041', cuota: 2, valorPagare: 75000, fechaVencimiento: '28/04/2026' },
]

// ----------------------------------------------------------------
// ANTICIPOS (pagos anticipados clase DZ — solicitud F-37 en SAP)
// ----------------------------------------------------------------

export function crearAnticipoMock(overrides: Partial<IAnticipo> = {}): IAnticipo {
  return {
    nroComprobante: '1400000015',
    kunnr: '0001000001',
    nombre: 'Agricola Los Boldos Ltda.',
    rut: fmtRUT(76543210),
    importe: 350000,
    fechaDoc: '07/03/2026',
    glosa: 'Anticipo para compra de fertilizantes',
    estado: 'PENDIENTE',
    ...overrides,
  }
}

export const ANTICIPOS_MOCK: IAnticipo[] = [
  crearAnticipoMock(),
  crearAnticipoMock({
    nroComprobante: '1400000020',
    kunnr: '0001000002',
    nombre: 'Fundo El Roble SpA',
    rut: fmtRUT(77123456),
    importe: 150000,
    fechaDoc: '05/03/2026',
    glosa: 'Anticipo herbicidas temporada',
    estado: 'PENDIENTE',
  }),
  // Segundo anticipo del mismo cliente — para probar tabla con múltiples filas
  crearAnticipoMock({
    nroComprobante: '1400000025',
    kunnr: '0001000001',
    importe: 180000,
    fechaDoc: '15/03/2026',
    glosa: 'Anticipo semillas temporada otoño',
    estado: 'PENDIENTE',
  }),
  // Anticipo ya procesado — debe ser filtrado por el endpoint
  crearAnticipoMock({
    nroComprobante: '1400000010',
    kunnr: '0001000001',
    importe: 95000,
    fechaDoc: '01/03/2026',
    glosa: 'Anticipo procesado (no debe aparecer)',
    estado: 'PROCESADO',
  }),
]

// ----------------------------------------------------------------
// ARQUEO DE CAJA
// ----------------------------------------------------------------

export function crearArqueoDetalleMock(overrides: Partial<IArqueoDetalle> = {}): IArqueoDetalle {
  return {
    tipoPagoCodigo: 'EF',
    tipoPagoDenominacion: 'EFECTIVO',
    monto: 450000,
    moneda: 'CLP',
    ...overrides,
  }
}

export function crearArqueoMock(overrides: Partial<IArqueoCaja> = {}): IArqueoCaja {
  const hoy = new Date()
  const fechaCaja = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
  return {
    id: 'ARQ-001',
    fechaCaja,
    sucursalId: 'D190',
    cajeroId: 'cajero',
    estado: 'GRABADO',
    montoTotal: 630000,
    detalles: [
      crearArqueoDetalleMock(),
      crearArqueoDetalleMock({ tipoPagoCodigo: 'TD', tipoPagoDenominacion: 'TARJETA DE DÉBITO', monto: 180000 }),
    ],
    fechaGrabado: new Date().toISOString(),
    ...overrides,
  }
}

export function crearCierreMock(overrides: Partial<ICierreCaja> = {}): ICierreCaja {
  const hoy = new Date()
  const fechaCaja = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
  return {
    id: 'CIE-001',
    arqueoId: 'ARQ-001',
    fechaCaja,
    sucursalId: 'D190',
    cajeroId: 'cajero',
    jefeAdminId: 'admin',
    estado: 'DEFINITIVO',
    detalles: [
      { tipoPagoCodigo: 'EF', denominacion: 'EFECTIVO', montoArqueo: 450000, montoRecaudado: 445000, diferencia: 5000, moneda: 'CLP' },
      { tipoPagoCodigo: 'TD', denominacion: 'TARJETA DE DÉBITO', montoArqueo: 180000, montoRecaudado: 180000, diferencia: 0, moneda: 'CLP' },
    ],
    fechaCierre: new Date().toISOString(),
    ...overrides,
  }
}

// ----------------------------------------------------------------
// ADMINISTRACIÓN — Usuarios, Roles, Sucursales
// ----------------------------------------------------------------

const ROLES_NOMBRES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Administrador',
  2: 'Ventas',
  3: 'Caja',
  4: 'Consultas',
}

const SUCURSALES_NOMBRES: Record<string, string> = {
  D190: 'Osorno',
  D052: 'Puerto Montt',
  D014: 'Temuco',
}

export function crearUsuarioAdminMock(overrides: Partial<IUsuarioAdmin> = {}): IUsuarioAdmin {
  const rolCod = overrides.rolCod ?? 1
  const sucursalId = overrides.sucursalId ?? 'D190'
  return {
    id: 'usr-001',
    username: 'vendedor',
    nombreCompleto: 'Juan Vendedor López',
    email: 'jvendedor@cooprinsem.cl',
    rolCod,
    rolNombre: ROLES_NOMBRES[rolCod],
    sucursalId,
    sucursalNombre: SUCURSALES_NOMBRES[sucursalId] ?? sucursalId,
    estado: 1,
    ...overrides,
    // Recalcular rolNombre y sucursalNombre si fueron sobreescritos via rolCod/sucursalId
    ...(overrides.rolCod && !overrides.rolNombre ? { rolNombre: ROLES_NOMBRES[overrides.rolCod] } : {}),
    ...(overrides.sucursalId && !overrides.sucursalNombre ? { sucursalNombre: SUCURSALES_NOMBRES[overrides.sucursalId] ?? overrides.sucursalId } : {}),
  }
}

// 6 usuarios de prueba (4 roles: Admin=1, Ventas=2, Caja=3, Consultas=4)
export const USUARIOS_ADMIN_MOCK: IUsuarioAdmin[] = [
  crearUsuarioAdminMock({ id: 'usr-001', username: 'admin', nombreCompleto: 'Admin Sistema', email: 'admin@cooprinsem.cl', rolCod: 1, sucursalId: 'D190', estado: 1 }),
  crearUsuarioAdminMock({ id: 'usr-002', username: 'vendedor', nombreCompleto: 'Juan Vendedor López', email: 'jvendedor@cooprinsem.cl', rolCod: 2, sucursalId: 'D190', estado: 1 }),
  crearUsuarioAdminMock({ id: 'usr-003', username: 'vendedor2', nombreCompleto: 'Ana Vendedor Ríos', email: 'avendedor@cooprinsem.cl', rolCod: 2, sucursalId: 'D052', estado: 1 }),
  crearUsuarioAdminMock({ id: 'usr-004', username: 'cajero', nombreCompleto: 'María Cajero Soto', email: 'mcajero@cooprinsem.cl', rolCod: 3, sucursalId: 'D190', estado: 1 }),
  crearUsuarioAdminMock({ id: 'usr-005', username: 'cajero2', nombreCompleto: 'Luis Cajero Vera', email: 'lcajero@cooprinsem.cl', rolCod: 3, sucursalId: 'D014', estado: 1 }),
  crearUsuarioAdminMock({ id: 'usr-006', username: 'consulta', nombreCompleto: 'Pedro Consultas Muñoz', email: 'pconsultas@cooprinsem.cl', rolCod: 4, sucursalId: 'D190', estado: 1 }),
]

export function crearRolMock(overrides: Partial<IRol> = {}): IRol {
  return {
    codigo: 2,
    nombre: 'Ventas',
    descripcion: 'Vendedor de mesón o terreno. Crea y gestiona pedidos.',
    accesoAdmin: false,
    accesoPedidos: true,
    accesoCaja: false,
    ...overrides,
  }
}

export const ROLES_MOCK: IRol[] = [
  { codigo: 1, nombre: 'Administrador', descripcion: 'Jefe de sucursal. Acceso total incluyendo mantenedores.', accesoAdmin: true, accesoPedidos: true, accesoCaja: true },
  { codigo: 2, nombre: 'Ventas', descripcion: 'Vendedor de mesón o terreno. Crea y gestiona pedidos.', accesoAdmin: false, accesoPedidos: true, accesoCaja: false },
  { codigo: 3, nombre: 'Caja', descripcion: 'Cajero. Cobros, pagos, arqueo.', accesoAdmin: false, accesoPedidos: false, accesoCaja: true },
  { codigo: 4, nombre: 'Consultas', descripcion: 'Reportes y consultas sin escritura.', accesoAdmin: false, accesoPedidos: false, accesoCaja: false },
]

export function crearSucursalMock(overrides: Partial<ISucursal> = {}): ISucursal {
  return {
    codigo: 'D190',
    nombre: 'Osorno',
    sociedad: 'COOP',
    oficinaVentas: 'D190',
    ...overrides,
  }
}

export const SUCURSALES_ADMIN_MOCK: ISucursal[] = [
  { codigo: 'D190', nombre: 'Osorno', sociedad: 'COOP', oficinaVentas: 'D190' },
  { codigo: 'D052', nombre: 'Puerto Montt', sociedad: 'COOP', oficinaVentas: 'D052' },
  { codigo: 'D014', nombre: 'Temuco', sociedad: 'COOP', oficinaVentas: 'D014' },
]

// ----------------------------------------------------------------
// PEDIDOS — listado para PedidoListPage
// ----------------------------------------------------------------

export const PEDIDOS_LIST_MOCK: IPedidoListItem[] = [
  { vbeln: '0080000001', fecha: '2026-03-01', kunnr: '0001000001', nombreCliente: 'Agricola Los Boldos Ltda.', tipoDoc: 'Venta Normal', canal: 'Venta Mesón', total: 185000, estado: 'Creado', nroDocumento: '' },
  { vbeln: '0080000002', fecha: '2026-03-03', kunnr: '999999', nombreCliente: 'Consumidor Final (Boleta)', tipoDoc: 'Venta Boleta', canal: 'Venta Mesón', total: 45000, estado: 'Procesado', nroDocumento: '1500000001' },
  { vbeln: '0080000003', fecha: '2026-03-05', kunnr: '0001000002', nombreCliente: 'Fundo El Roble SpA', tipoDoc: 'Venta Normal', canal: 'Venta Industrial', total: 2350000, estado: 'Creado', nroDocumento: '' },
  { vbeln: '0080000004', fecha: '2026-03-07', kunnr: '0001000004', nombreCliente: 'Cooperativa Campesina San Jose', tipoDoc: 'V. Puesto Fundo', canal: 'Venta Mesón', total: 890000, estado: 'Anulado', nroDocumento: '' },
  { vbeln: '0080000005', fecha: '2026-03-09', kunnr: '999999', nombreCliente: 'Consumidor Final (Boleta)', tipoDoc: 'Venta Boleta', canal: 'Venta Mesón', total: 18500, estado: 'Creado', nroDocumento: '' },
]

// Mapa de detalle para cada pedido del listado (enriquecido con líneas y datos de cliente)
const PEDIDO_DETALLE_LINEAS: Record<string, { lineas: IPedidoDetalle['lineas']; rut: string; condicionPago: string }> = {
  '0080000001': {
    rut: fmtRUT(76543210),
    condicionPago: 'CONT',
    lineas: [
      { posicion: '10', codigoMaterial: 'MAT000005', descripcion: 'Martillo carpintero 25oz mango fibra', cantidad: 2, unidadMedida: 'UN', precioUnitario: 18990, subtotal: 37980 },
      { posicion: '20', codigoMaterial: 'MAT000021', descripcion: 'Fertilizante NPK 15-15-15 saco 50kg', cantidad: 4, unidadMedida: 'SA', precioUnitario: 32000, subtotal: 128000 },
      { posicion: '30', codigoMaterial: 'MAT000001', descripcion: 'Clavo de acero 3" caja 1kg', cantidad: 5, unidadMedida: 'UN', precioUnitario: 2490, subtotal: 12450 },
    ],
  },
  '0080000002': {
    rut: '',
    condicionPago: 'CONT',
    lineas: [
      { posicion: '10', codigoMaterial: 'MAT000011', descripcion: 'Pintura latex blanca 1 galon', cantidad: 2, unidadMedida: 'GL', precioUnitario: 18500, subtotal: 37000 },
    ],
  },
  '0080000003': {
    rut: fmtRUT(77123456),
    condicionPago: '30D',
    lineas: [
      { posicion: '10', codigoMaterial: 'MAT000027', descripcion: 'Herbicida glifosato 48% 20 litros', cantidad: 10, unidadMedida: 'L', precioUnitario: 159000, subtotal: 1590000 },
      { posicion: '20', codigoMaterial: 'MAT000022', descripcion: 'Fertilizante Urea 46% saco 50kg', cantidad: 20, unidadMedida: 'SA', precioUnitario: 28500, subtotal: 570000 },
    ],
  },
  '0080000004': {
    rut: fmtRUT(73456789),
    condicionPago: '60D',
    lineas: [
      { posicion: '10', codigoMaterial: 'MAT000030', descripcion: 'Semilla trigo harinero certificada 50kg', cantidad: 10, unidadMedida: 'SA', precioUnitario: 89000, subtotal: 890000 },
    ],
  },
  '0080000005': {
    rut: '',
    condicionPago: 'CONT',
    lineas: [
      { posicion: '10', codigoMaterial: 'MAT000005', descripcion: 'Martillo carpintero 25oz mango fibra', cantidad: 1, unidadMedida: 'UN', precioUnitario: 18990, subtotal: 18990 },
    ],
  },
}

export function getPedidoDetalleMock(vbeln: string): IPedidoDetalle | null {
  const listItem = PEDIDOS_LIST_MOCK.find((p) => p.vbeln === vbeln)
  if (!listItem) return null

  const extra = PEDIDO_DETALLE_LINEAS[vbeln]
  if (!extra) return null

  const subtotal = extra.lineas.reduce((sum, l) => sum + l.subtotal, 0)
  const totalIVA = Math.round(subtotal * 0.19)

  return {
    vbeln: listItem.vbeln,
    fecha: listItem.fecha,
    kunnr: listItem.kunnr,
    nombreCliente: listItem.nombreCliente,
    rut: extra.rut,
    tipoDoc: listItem.tipoDoc,
    canal: listItem.canal,
    condicionPago: extra.condicionPago,
    vendedor: 'Juan Vendedor',
    estado: listItem.estado,
    observaciones: '',
    ubicacionPredio: '',
    lineas: extra.lineas,
    subtotal,
    totalIVA,
    total: subtotal + totalIVA,
  }
}
