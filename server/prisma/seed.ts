import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter } as never);

// Calcula el digito verificador de un RUT chileno
function calcDV(rut: number): string {
  let sum = 0;
  let factor = 2;
  let n = rut;
  while (n > 0) {
    sum += (n % 10) * factor;
    n = Math.floor(n / 10);
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

function formatRUT(body: number): string {
  const dv = calcDV(body);
  const bodyStr = body.toLocaleString('es-CL');
  return `${bodyStr}-${dv}`;
}

async function main() {
  console.log('Iniciando seed...');

  // Limpiar datos existentes en orden correcto (por FK)
  await prisma.cobro.deleteMany();
  await prisma.pedidoPosicion.deleteMany();
  await prisma.pedidoVenta.deleteMany();
  await prisma.partidaAbierta.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.material.deleteMany();
  await prisma.cliente.deleteMany();

  // --- CLIENTES ---
  const clientes = await prisma.cliente.createManyAndReturn({
    data: [
      {
        kunnr: '0001000001',
        nombre: 'Agricola Los Boldos Ltda.',
        rut: formatRUT(76543210),
        condicion_pago: 'CONT',
        estado_credito: 'AL_DIA',
        credito_asignado: 5000000,
        credito_utilizado: 1200000,
        sucursal: 'D190',
      },
      {
        kunnr: '0001000002',
        nombre: 'Fundo El Roble SpA',
        rut: formatRUT(77123456),
        condicion_pago: '30D',
        estado_credito: 'CON_DEUDA',
        credito_asignado: 3000000,
        credito_utilizado: 2800000,
        sucursal: 'D190',
      },
      {
        kunnr: '0001000003',
        nombre: 'Ferreteria Central Osorno',
        rut: formatRUT(78901234),
        condicion_pago: 'CONT',
        estado_credito: 'BLOQUEADO',
        credito_asignado: 2000000,
        credito_utilizado: 2100000,
        sucursal: 'D190',
      },
      {
        kunnr: '0001000004',
        nombre: 'Cooperativa Campesina San Jose',
        rut: formatRUT(73456789),
        condicion_pago: '60D',
        estado_credito: 'AL_DIA',
        credito_asignado: 10000000,
        credito_utilizado: 3500000,
        sucursal: 'D052',
      },
      {
        kunnr: '0001000005',
        nombre: 'Agricola y Ganadera Patagonia Ltda.',
        rut: formatRUT(79234567),
        condicion_pago: '30D',
        estado_credito: 'BLOQUEADO',
        credito_asignado: 1500000,
        credito_utilizado: 1600000,
        sucursal: 'D052',
      },
      {
        kunnr: '0001000006',
        nombre: 'Constructora Los Lagos S.A.',
        rut: formatRUT(76789012),
        condicion_pago: 'CONT',
        estado_credito: 'AL_DIA',
        credito_asignado: 0,
        credito_utilizado: 0,
        sucursal: 'D014',
      },
      {
        kunnr: '0001000007',
        nombre: 'Semillas y Fertilizantes del Sur Ltda.',
        rut: formatRUT(77654321),
        condicion_pago: '30D',
        estado_credito: 'CON_DEUDA',
        credito_asignado: 8000000,
        credito_utilizado: 5200000,
        sucursal: 'D190',
      },
      {
        kunnr: '0001000008',
        nombre: 'Insumos Agropecuarios Rucalhue SpA',
        rut: formatRUT(78345678),
        condicion_pago: '60D',
        estado_credito: 'AL_DIA',
        credito_asignado: 6000000,
        credito_utilizado: 900000,
        sucursal: 'D190',
      },
      {
        kunnr: '0001000009',
        nombre: 'Ganaderia y Lecheria Pilmaiquen Ltda.',
        rut: formatRUT(76012345),
        condicion_pago: 'CONT',
        estado_credito: 'BLOQUEADO',
        credito_asignado: 4000000,
        credito_utilizado: 4500000,
        sucursal: 'D052',
      },
      {
        kunnr: '999999',
        nombre: 'Consumidor Final (Boleta)',
        rut: '',
        condicion_pago: 'CONT',
        estado_credito: 'AL_DIA',
        credito_asignado: 0,
        credito_utilizado: 0,
        sucursal: 'D190',
      },
    ],
  });
  console.log(`Creados ${clientes.length} clientes.`);

  // --- MATERIALES ---
  const materialesData = [
    // Ferreteria
    { matnr: 'MAT000001', descripcion: 'Clavo de acero 3" caja 1kg', precio_unitario: 2490, unidad_medida: 'UN' },
    { matnr: 'MAT000002', descripcion: 'Clavo de acero 4" caja 1kg', precio_unitario: 2690, unidad_medida: 'UN' },
    { matnr: 'MAT000003', descripcion: 'Tornillo autorroscante 1/2" x 8 (100un)', precio_unitario: 3990, unidad_medida: 'UN' },
    { matnr: 'MAT000004', descripcion: 'Tornillo autorroscante 1" x 8 (100un)', precio_unitario: 4490, unidad_medida: 'UN' },
    { matnr: 'MAT000005', descripcion: 'Martillo carpintero 25oz mango fibra', precio_unitario: 18990, unidad_medida: 'UN' },
    { matnr: 'MAT000006', descripcion: 'Destornillador plano 6" profesional', precio_unitario: 5990, unidad_medida: 'UN' },
    { matnr: 'MAT000007', descripcion: 'Destornillador estrella PH2 6"', precio_unitario: 5990, unidad_medida: 'UN' },
    { matnr: 'MAT000008', descripcion: 'Llave ajustable 12" acero', precio_unitario: 14990, unidad_medida: 'UN' },
    { matnr: 'MAT000009', descripcion: 'Cinta metrica 5m acero inoxidable', precio_unitario: 8990, unidad_medida: 'UN' },
    { matnr: 'MAT000010', descripcion: 'Nivel de burbuja 60cm aluminio', precio_unitario: 12990, unidad_medida: 'UN' },
    { matnr: 'MAT000011', descripcion: 'Pintura latex blanca 1 galon', precio_unitario: 18500, unidad_medida: 'GL' },
    { matnr: 'MAT000012', descripcion: 'Pintura latex blanca 4 galones', precio_unitario: 69000, unidad_medida: 'GL' },
    { matnr: 'MAT000013', descripcion: 'Pintura esmalte cafe 1 galon', precio_unitario: 21500, unidad_medida: 'GL' },
    { matnr: 'MAT000014', descripcion: 'Rodillo pintura 9" con bandeja', precio_unitario: 5490, unidad_medida: 'UN' },
    { matnr: 'MAT000015', descripcion: 'Brocha cerdas naturales 3"', precio_unitario: 3990, unidad_medida: 'UN' },
    { matnr: 'MAT000016', descripcion: 'Alambre galvanizado calibre 14 rollo 50m', precio_unitario: 12990, unidad_medida: 'UN' },
    { matnr: 'MAT000017', descripcion: 'Alambre de puas rollo 500m galvanizado', precio_unitario: 89000, unidad_medida: 'UN' },
    { matnr: 'MAT000018', descripcion: 'Cadena galvanizada 6mm metro', precio_unitario: 2490, unidad_medida: 'MT' },
    { matnr: 'MAT000019', descripcion: 'Tubo PVC 4" x 3m alcantarillado', precio_unitario: 16990, unidad_medida: 'UN' },
    { matnr: 'MAT000020', descripcion: 'Manguera PVC 1/2" rollo 50m', precio_unitario: 24990, unidad_medida: 'UN' },
    // Insumos agricolas
    { matnr: 'MAT000021', descripcion: 'Fertilizante NPK 15-15-15 saco 50kg', precio_unitario: 32000, unidad_medida: 'SA' },
    { matnr: 'MAT000022', descripcion: 'Fertilizante Urea 46% saco 50kg', precio_unitario: 28500, unidad_medida: 'SA' },
    { matnr: 'MAT000023', descripcion: 'Superfosfato triple saco 50kg', precio_unitario: 35000, unidad_medida: 'SA' },
    { matnr: 'MAT000024', descripcion: 'Nitrato de potasio saco 25kg', precio_unitario: 45000, unidad_medida: 'SA' },
    { matnr: 'MAT000025', descripcion: 'Sulfato de amonio saco 50kg', precio_unitario: 22000, unidad_medida: 'SA' },
    { matnr: 'MAT000026', descripcion: 'Herbicida glifosato 48% litro', precio_unitario: 8990, unidad_medida: 'L' },
    { matnr: 'MAT000027', descripcion: 'Herbicida glifosato 48% 20 litros', precio_unitario: 159000, unidad_medida: 'L' },
    { matnr: 'MAT000028', descripcion: 'Insecticida clorpirifos 48% litro', precio_unitario: 12500, unidad_medida: 'L' },
    { matnr: 'MAT000029', descripcion: 'Fungicida mancozeb 80% kg', precio_unitario: 18000, unidad_medida: 'KG' },
    { matnr: 'MAT000030', descripcion: 'Semilla trigo harinero certificada 50kg', precio_unitario: 89000, unidad_medida: 'SA' },
    { matnr: 'MAT000031', descripcion: 'Semilla avena forrajera certificada 50kg', precio_unitario: 45000, unidad_medida: 'SA' },
    { matnr: 'MAT000032', descripcion: 'Semilla pastura festuca 25kg', precio_unitario: 78000, unidad_medida: 'SA' },
    { matnr: 'MAT000033', descripcion: 'Cal agricola saco 50kg', precio_unitario: 6500, unidad_medida: 'SA' },
    { matnr: 'MAT000034', descripcion: 'Sulfato de calcio (yeso) saco 50kg', precio_unitario: 9000, unidad_medida: 'SA' },
    { matnr: 'MAT000035', descripcion: 'Comedero bovino 40 litros plastico', precio_unitario: 28500, unidad_medida: 'UN' },
    { matnr: 'MAT000036', descripcion: 'Bebedero flotante galvanizado 150L', precio_unitario: 89000, unidad_medida: 'UN' },
    { matnr: 'MAT000037', descripcion: 'Manga bovino fierro 4 metros', precio_unitario: 189000, unidad_medida: 'UN' },
    { matnr: 'MAT000038', descripcion: 'Vitamina AD3E inyectable 500ml', precio_unitario: 22000, unidad_medida: 'UN' },
    { matnr: 'MAT000039', descripcion: 'Vacuna IBR+DVB+PI3 20 dosis', precio_unitario: 45000, unidad_medida: 'UN' },
    { matnr: 'MAT000040', descripcion: 'Antiparasitario ivermectina 1% 500ml', precio_unitario: 38000, unidad_medida: 'UN' },
    { matnr: 'MAT000041', descripcion: 'Bota goma caña alta T42 negra', precio_unitario: 19990, unidad_medida: 'UN' },
    { matnr: 'MAT000042', descripcion: 'Guante nitrilo calibre 13 par', precio_unitario: 4990, unidad_medida: 'UN' },
    { matnr: 'MAT000043', descripcion: 'Mascarilla respirador N95 (caja 10un)', precio_unitario: 12990, unidad_medida: 'UN' },
    { matnr: 'MAT000044', descripcion: 'Mochila aspersora 20 litros manual', precio_unitario: 35000, unidad_medida: 'UN' },
    { matnr: 'MAT000045', descripcion: 'Mochila aspersora 16 litros bateria', precio_unitario: 89000, unidad_medida: 'UN' },
    { matnr: 'MAT000046', descripcion: 'Pala recta mango madera 1.20m', precio_unitario: 14990, unidad_medida: 'UN' },
    { matnr: 'MAT000047', descripcion: 'Horquilla 4 dientes mango madera', precio_unitario: 16990, unidad_medida: 'UN' },
    { matnr: 'MAT000048', descripcion: 'Rastrillo metalico 14 dientes', precio_unitario: 9990, unidad_medida: 'UN' },
    { matnr: 'MAT000049', descripcion: 'Azadon mango fibra 1.2m 2.5lb', precio_unitario: 18990, unidad_medida: 'UN' },
    { matnr: 'MAT000050', descripcion: 'Carretilla metalica 80 litros 1 rueda', precio_unitario: 49990, unidad_medida: 'UN' },
  ];

  await prisma.material.createMany({ data: materialesData });
  console.log(`Creados ${materialesData.length} materiales.`);

  // --- STOCK por centro/almacen ---
  const centros = ['D190', 'D052'];
  const almacenes = ['B000', 'B001', 'B002', 'G000'];
  const stockData: { matnr: string; centro: string; almacen: string; cantidad: number }[] = [];

  for (const mat of materialesData) {
    for (const centro of centros) {
      for (const almacen of almacenes) {
        // Variaciones aleatoristas pero deterministas por material
        const seed = mat.matnr.slice(-3);
        const n = parseInt(seed, 10) % 100;
        let cantidad = 0;
        if (almacen === 'B000') cantidad = n + 10;
        else if (almacen === 'B001') cantidad = n > 50 ? n - 30 : 0;
        else if (almacen === 'B002') cantidad = n > 70 ? n - 50 : 0;
        else if (almacen === 'G000') cantidad = n > 80 ? n - 60 : 0;
        stockData.push({ matnr: mat.matnr, centro, almacen, cantidad });
      }
    }
  }
  await prisma.stock.createMany({ data: stockData });
  console.log(`Creados ${stockData.length} registros de stock.`);

  // --- PARTIDAS ABIERTAS ---
  const hoy = new Date();
  const dias = (d: number) => new Date(hoy.getTime() + d * 86400000);

  const partidas = [
    // Al dia
    { belnr: '1900000001', kunnr: '0001000001', clase_doc: 'FV', fecha_doc: dias(-30), fecha_venc: dias(15), importe: 850000, estado: 'ABIERTO' as const, dias_mora: 0 },
    { belnr: '1900000002', kunnr: '0001000001', clase_doc: 'FV', fecha_doc: dias(-60), fecha_venc: dias(30), importe: 320000, estado: 'ABIERTO' as const, dias_mora: 0 },
    // Proximas a vencer (en 7 dias o menos)
    { belnr: '1900000003', kunnr: '0001000002', clase_doc: 'FV', fecha_doc: dias(-25), fecha_venc: dias(5), importe: 1250000, estado: 'ABIERTO' as const, dias_mora: 0 },
    { belnr: '1900000004', kunnr: '0001000002', clase_doc: 'NC', fecha_doc: dias(-20), fecha_venc: dias(3), importe: 180000, estado: 'ABIERTO' as const, dias_mora: 0 },
    // Vencidas 1-30 dias
    { belnr: '1900000005', kunnr: '0001000003', clase_doc: 'FV', fecha_doc: dias(-50), fecha_venc: dias(-10), importe: 2100000, estado: 'VENCIDO' as const, dias_mora: 10 },
    { belnr: '1900000006', kunnr: '0001000003', clase_doc: 'FV', fecha_doc: dias(-45), fecha_venc: dias(-5), importe: 780000, estado: 'VENCIDO' as const, dias_mora: 5 },
    { belnr: '1900000007', kunnr: '0001000004', clase_doc: 'FV', fecha_doc: dias(-40), fecha_venc: dias(-15), importe: 490000, estado: 'VENCIDO' as const, dias_mora: 15 },
    // Vencidas mas de 30 dias
    { belnr: '1900000008', kunnr: '0001000005', clase_doc: 'FV', fecha_doc: dias(-90), fecha_venc: dias(-45), importe: 3500000, estado: 'VENCIDO' as const, dias_mora: 45 },
    { belnr: '1900000009', kunnr: '0001000005', clase_doc: 'FV', fecha_doc: dias(-80), fecha_venc: dias(-60), importe: 1200000, estado: 'VENCIDO' as const, dias_mora: 60 },
    { belnr: '1900000010', kunnr: '0001000007', clase_doc: 'FV', fecha_doc: dias(-120), fecha_venc: dias(-35), importe: 5000000, estado: 'VENCIDO' as const, dias_mora: 35 },
    // Mezcla
    { belnr: '1900000011', kunnr: '0001000007', clase_doc: 'FV', fecha_doc: dias(-15), fecha_venc: dias(45), importe: 670000, estado: 'ABIERTO' as const, dias_mora: 0 },
    { belnr: '1900000012', kunnr: '0001000008', clase_doc: 'FV', fecha_doc: dias(-20), fecha_venc: dias(10), importe: 430000, estado: 'ABIERTO' as const, dias_mora: 0 },
    { belnr: '1900000013', kunnr: '0001000008', clase_doc: 'NC', fecha_doc: dias(-10), fecha_venc: dias(20), importe: 95000, estado: 'ABIERTO' as const, dias_mora: 0 },
    { belnr: '1900000014', kunnr: '0001000009', clase_doc: 'FV', fecha_doc: dias(-60), fecha_venc: dias(-20), importe: 1800000, estado: 'VENCIDO' as const, dias_mora: 20 },
    { belnr: '1900000015', kunnr: '0001000009', clase_doc: 'FV', fecha_doc: dias(-30), fecha_venc: dias(-1), importe: 450000, estado: 'VENCIDO' as const, dias_mora: 1 },
  ];

  await prisma.partidaAbierta.createMany({ data: partidas });
  console.log(`Creadas ${partidas.length} partidas abiertas.`);

  console.log('Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
