import type { ICliente, IClienteBusqueda } from '@/types/cliente'
import type { IArticulo, IArticuloBusqueda } from '@/types/articulo'
import type { IPartidaAbierta } from '@/types/caja'
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
]
