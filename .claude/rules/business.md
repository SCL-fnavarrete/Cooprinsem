# Reglas de Negocio Chile — Cooprinsem POS

## Moneda CLP
- **Sin decimales.** SAP envía CLP como enteros. Nunca usar `toFixed()` para moneda CLP.
- Formateo correcto: `$ 1.234.567` (punto como separador de miles, sin coma decimal)

```typescript
// CORRECTO
export const formatCLP = (monto: number): string => {
  return `$ ${Math.round(monto).toLocaleString('es-CL')}`;
};
// formatCLP(1234567) → "$ 1.234.567"

// INCORRECTO — nunca hacer esto con CLP
const mal = (1234567.5).toFixed(2); // "1234567.50" — NUNCA para CLP
```

## RUT Chileno
- Formato de display: `12.345.678-9` (puntos de miles + guión + dígito verificador)
- Aceptar entrada con o sin puntos, con o sin guión
- Dígito verificador puede ser número del 0-9 o letra `K`

```typescript
// Formatear RUT para display
export const formatRUT = (rut: string): string => {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${parseInt(body).toLocaleString('es-CL')}-${dv}`;
};

// Validar RUT (módulo 11)
export const validarRUT = (rut: string): boolean => {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let suma = 0;
  let multiplo = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    suma += parseInt(body[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const dvEsperado = 11 - (suma % 11);
  if (dvEsperado === 11) return dv === '0';
  if (dvEsperado === 10) return dv === 'K';
  return dv === String(dvEsperado);
};
```

## IVA 19%
- El IVA ya está incluido en el precio que muestra SAP al usuario final.
- Para documentos: el frontend muestra el desglose (Neto + IVA = Total).
- **NO recalcular IVA en frontend** — SAP calcula el desglose real.
- Referencia: `MWSBP` en el documento OData es el monto de IVA calculado por SAP.

## Reglas de Sobrepago (módulo Caja)
| Medio de Pago | Sobrepago permitido | Destino del exceso |
|---------------|---------------------|--------------------|
| Tarjeta Débito | ❌ NO | Monto debe ser exacto |
| Tarjeta Crédito | ❌ NO | Monto debe ser exacto |
| Efectivo | ✅ SÍ | Vuelto al cliente |
| Cheque al Día | ✅ SÍ | Saldo a favor cta. cte. |
| Cheque a Fecha | ✅ SÍ | Saldo a favor cta. cte. |
| Pagaré | ✅ SÍ | Saldo a favor cta. cte. |
| Vale Vista | ✅ SÍ | Saldo a favor cta. cte. |

## Cliente Boleta (Consumidor Final)
- Código SAP: `999999`
- Sin RUT requerido
- Solo contado (sin crédito)
- Tipo documento: Venta Boleta

## Estado Crediticio del Cliente
Mostrar al seleccionar un cliente (panel visual, no bloquea el flujo):
- `BLOQUEADO` → badge rojo, advertencia prominente
- `CON DEUDA` → badge amarillo
- `AL DÍA` → badge verde

SAP igualmente rechazará el pedido si está bloqueado. La advertencia temprana evita trabajo perdido.

## Fechas y Zona Horaria
- Chile usa UTC-3 (invierno) / UTC-4 (verano) con DST.
- Para fechas de documentos SAP, usar la fecha que retorna SAP (no recalcular timezone en frontend).
- Las fechas en OData SAP vienen como `/Date(timestamp)/` — parsear con `new Date(parseInt(timestamp))`.

## Sucursales
| Código | Nombre |
|--------|--------|
| D190 | Osorno |
| D052 | (confirmar con Mariela) |
| D014 | (confirmar con Mariela) |
| D160 | (confirmar con Mariela) |
| D170 | (confirmar con Mariela) |
| D200 | (confirmar con Mariela) |

## Tipos de Documento de Venta
- Venta Normal
- Venta Boleta
- V. Puesto Fundo
- V. Calzada
- Venta Anticipada

## Almacenes por Centro
- B000, B001, B002, G000 (confirmar cuáles aplican por sucursal con ABAP)
