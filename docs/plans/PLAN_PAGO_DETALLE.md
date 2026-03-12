# Plan: Pantalla Detalle de Pago (PagoDetallePage)

## Diagrama de Proceso

```
╔══════════════════════════════════════════════════════════════════╗
║              PROCESO: DETALLE DE PAGO — COOPRINSEM POS          ║
╚══════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────┐
│ 1. INICIO — Cajero en pantalla Pago Cta. Cte.          │
│    Ve grilla con TODAS las partidas abiertas            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ 2. DOBLE CLIC en    │
              │    una fila de la   │
              │    grilla           │
              └──────────┬──────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. CARGA AUTOMÁTICA                                     │
│    • Datos completos del cliente (RUT, nombre, crédito) │
│    • Todas las partidas abiertas del MISMO cliente      │
│    • El documento clicado viene PRE-MARCADO (checkbox)  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. PANTALLA DETALLE DE PAGO — 3 COLUMNAS                                   │
│                                                                             │
│ ┌──────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐ │
│ │  COL. IZQUIERDA  │ │    COL. CENTRAL        │ │   COL. DERECHA         │ │
│ │                  │ │                        │ │                        │ │
│ │ Moneda: CLP      │ │ [Ejecutar Pago]        │ │ Saldo a Favor (gris)   │ │
│ │                  │ │ [Cancelar Operación]   │ │                        │ │
│ │ USUARIO:         │ │                        │ │ VÍAS DE PAGO:          │ │
│ │ • Nombre         │ │ DOCS A CANCELAR:       │ │ ✅ EFECTIVO            │ │
│ │ • Centro         │ │ ┌──┬────┬──────┬─────┐ │ │ ⬛ TARJETA DÉBITO      │ │
│ │ • Org. Ventas    │ │ │✓ │Ref │Monto │Fecha│ │ │ ⬛ TARJETA CRÉDITO     │ │
│ │ • Canal Distrib. │ │ │✓ │039 │17.999│23.01│ │ │ ⬛ CHEQUE AL DÍA       │ │
│ │                  │ │ │  │... │...   │...  │ │ │ ⬛ VALE VISTA           │ │
│ │ CLIENTE:         │ │ └──┴────┴──────┴─────┘ │ │                        │ │
│ │ • RUT            │ │                        │ │ TOTALES:               │ │
│ │ • Nombre         │ │ (puede marcar/desmarcar│ │ TOTAL A PAGAR    $X    │ │
│ │ • Dirección      │ │  más docs del cliente) │ │ TOTAL PAGADO     $X    │ │
│ │                  │ │                        │ │ TOTAL A DEVOLVER $X    │ │
│ │ INFO CLIENTE:    │ │                        │ │ TOTAL A CTA.CTE. $0   │ │
│ │ • Sociedad: COOP │ │                        │ │                        │ │
│ │ • Cód. Cliente   │ │                        │ │ MEDIOS SELECCIONADOS:  │ │
│ │ • Cond. Pago     │ │                        │ │ ┌──────┬─────┬───────┐ │ │
│ │ • Crédito Asign. │ │                        │ │ │Tipo  │Fecha│ Monto │ │ │
│ │ • Crédito Utiliz.│ │                        │ │ │EFECT.│23.01│17.999 │ │ │
│ │                  │ │                        │ │ │VUELTO│23.01│232.001│ │ │
│ │ DATOS ADICIONALES│ │                        │ │ └──────┴─────┴───────┘ │ │
│ │ (vacío por ahora)│ │                        │ │                        │ │
│ │                  │ │                        │ │ MENSAJES:              │ │
│ │                  │ │                        │ │ (feedback del sistema)  │ │
│ └──────────────────┘ └────────────────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. SELECCIÓN DE DOCUMENTOS                              │
│    • El doc del doble clic ya está marcado               │
│    • Cajero puede marcar MÁS documentos del cliente     │
│    • Cajero puede desmarcar si no quiere pagar alguno   │
│    → TOTAL A PAGAR se recalcula automáticamente         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. SELECCIÓN MEDIO DE PAGO                              │
│    • Cajero hace clic en "EFECTIVO" (único activo)      │
│    • Los demás medios están visibles pero DESHABILITADOS │
│      (se habilitarán en fases futuras)                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 7. INGRESO DE MONTO                                     │
│    • Cajero ingresa el monto recibido del cliente       │
│    • Se agrega fila "EFECTIVO" en Medios Seleccionados  │
│    • Si hay vuelto → se agrega fila "VUELTO EFECTIVO"   │
│    • TOTALES se actualizan en TIEMPO REAL               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ 8. CAJERO DECIDE    │
              └──────┬─────────┬────┘
                     │         │
          ┌──────────┘         └──────────┐
          ▼                               ▼
┌───────────────────┐         ┌───────────────────────┐
│ "Ejecutar Pago"   │         │ "Cancelar Operación"  │
│                   │         │                       │
│ ¿Pagado >= Total? │         │ Vuelve a la grilla    │
│                   │         │ de partidas SIN       │
│ SÍ → Envía cobro  │         │ registrar nada        │
│      a SAP/Backend│         └───────────┬───────────┘
│                   │                     │
│ NO → Botón gris,  │                     ▼
│      "Falta $X"   │              ┌──────────────┐
└─────────┬─────────┘              │     FIN      │
          │                        └──────────────┘
          ▼
┌─────────────────────────────────────────────────────────┐
│ 9. RESULTADO                                            │
│                                                         │
│ ✅ ÉXITO:                                               │
│    • Comprobante con N° documento SAP (clase W)         │
│    • Cliente, RUT, fecha                                │
│    • Lista de documentos cancelados                     │
│    • Monto cobrado + vuelto entregado                   │
│    • Botones: [Imprimir] [Volver a Caja]                │
│                                                         │
│ ❌ ERROR:                                               │
│    • Mensaje en panel "Mensajes"                        │
│    • Cajero puede corregir y reintentar                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │       FIN        │
              │ Cajero vuelve a  │
              │ Caja para el     │
              │ siguiente cobro  │
              └──────────────────┘
```

---

## Contexto

En la pantalla de Caja → Pago Cta. Cte., al hacer **doble clic** en una fila de partida abierta, se debe navegar a una **página de detalle de pago** que replica el layout del WebDynpro SAP actual: 3 columnas con info del cliente a la izquierda, documentos a cancelar al centro, y medios de pago a la derecha.

Actualmente el flujo es: seleccionar partidas → botón "Cobrar en Efectivo" → modal simple. El nuevo flujo agrega una alternativa más completa vía doble clic.

---

## Layout: 3 columnas

### Izquierda — Info Cliente y Sesión
- **Moneda:** CLP
- **Usuario:** nombre, centro (sucursal), Org. Ventas (pendiente SAP), Canal Distribución
- **Cliente:** RUT, Nombre, condición de pago, estado crédito
- **Info Cliente:** Sociedad COOP, código cliente, crédito asignado, crédito utilizado, % agotamiento

### Centro — Documentos a Cancelar
- **Barra de acciones:** "Ejecutar Pago" + "Cancelar Operación"
- **Tabla documentos:** checkbox, Referencia (belnr), Doc. comercial, Monto, Fecha, Clase, Bloqueo de pago
- Pre-carga el documento del doble clic marcado
- Muestra TODAS las partidas abiertas del mismo cliente (puede marcar/desmarcar)

### Derecha — Medios de Pago
- **Saldo a Favor** (botón deshabilitado por ahora)
- **Lista Vías de Pago:** EFECTIVO activo, los demás visibles pero deshabilitados (gris)
  - TARJETA DE DEBITO, TARJETA DE CREDITO, CHEQUE AL DIA, VALE VISTA
- **Totales:**
  - TOTAL A PAGAR (suma docs seleccionados)
  - TOTAL PAGADO (suma medios de pago ingresados)
  - TOTAL A DEVOLVER (vuelto)
  - TOTAL A CTA.CTE. (0 por ahora)
- **Medios de Pago Seleccionados:** tabla con Tipo, Número, Fecha, Cuota, Monto
  - Al seleccionar EFECTIVO e ingresar monto → aparece fila "EFECTIVO"
  - Si hay vuelto → aparece fila "VUELTO EFECTIVO"
- **Mensajes** (sección inferior para feedback)

---

## Archivos a crear

### 1. `src/types/pago.ts` — Tipos nuevos
```typescript
export type MedioPagoCodigo = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'CHEQUE_DIA' | 'VALE_VISTA'

export interface IMedioPago {
  codigo: MedioPagoCodigo
  label: string
  habilitado: boolean
}

export interface IPagoEntry {
  id: string
  tipoPago: string       // "EFECTIVO", "VUELTO EFECTIVO"
  numero: string
  fecha: string
  cuota: string
  monto: number
}
```

### 2. `src/hooks/usePagoDetalle.ts` — Hook de estado y lógica
- Carga cliente via `getCliente(kunnr)` (de `src/services/api/clientes.ts`)
- Carga partidas via `getPartidasAbiertas()` filtradas por kunnr (de `src/services/api/facturas.ts`)
- Pre-selecciona el belnr del parámetro de ruta
- Maneja: selectedBelnrs[], pagoEntries[], totalAPagar, totalPagado, totalADevolver
- `agregarPagoEfectivo(montoRecibido)` → crea entrada + calcula vuelto
- `ejecutarPago()` → llama `registrarCobroEfectivo()` (de `src/services/api/cobros.ts`)

### 3. `src/features/caja/PagoDetallePage.tsx` — Componente principal
- Layout 3 columnas con CSS Grid
- Usa `useParams()` para `:belnr` y `useSearchParams()` para `kunnr`
- Usa `usePagoDetalle` hook
- Componentes UI5: Card, Table, Button, FlexBox, Label, Text, MessageStrip, Input
- "Ejecutar Pago" → llama API → muestra comprobante o navega a `/caja`
- "Cancelar Operación" → `navigate('/caja')`

### 4. `src/features/caja/PagoDetallePage.test.tsx` — Tests (~12-15 specs)

---

## Archivos a modificar

### 5. `src/config/sap.ts` — Agregar constante MEDIOS_PAGO
```typescript
export const MEDIOS_PAGO: IMedioPago[] = [
  { codigo: 'EFECTIVO', label: 'EFECTIVO', habilitado: true },
  { codigo: 'TARJETA_DEBITO', label: 'TARJETA DE DEBITO', habilitado: false },
  { codigo: 'TARJETA_CREDITO', label: 'TARJETA DE CREDITO', habilitado: false },
  { codigo: 'CHEQUE_DIA', label: 'CHEQUE AL DIA', habilitado: false },
  { codigo: 'VALE_VISTA', label: 'VALE VISTA', habilitado: false },
]
```

### 6. `src/components/pos/CajaFacturaList.tsx` — Agregar prop `onDoubleClickPartida`
- Nueva prop opcional: `onDoubleClickPartida?: (partida: IPartidaAbierta) => void`
- En cada fila: `onDoubleClick={() => onDoubleClickPartida?.(p)}`
- Cambio mínimo, backward-compatible

### 7. `src/features/caja/CajaPage.tsx` — Conectar doble clic
- Agregar handler: `handleDoubleClickPartida(partida)` → `navigate(/caja/pago/${belnr}?kunnr=${kunnr})`
- Pasar `onDoubleClickPartida={handleDoubleClickPartida}` a CajaFacturaList

### 8. `src/routes/index.tsx` — Agregar ruta `/caja/pago/:belnr`
- ProtectedRoute con roles [ADMINISTRADOR, CAJA]
- Elemento: `<PagoDetallePage />`

---

## Flujo de datos

```
CajaPage (tabla partidas)
  → doble clic en fila
  → navigate("/caja/pago/1900000008?kunnr=0001000005")

PagoDetallePage
  → usePagoDetalle hook
    → getCliente("0001000005") → panel izquierdo
    → getPartidasAbiertas() filtrar kunnr → tabla centro
    → pre-seleccionar belnr "1900000008"

  → Usuario marca/desmarca docs → totalAPagar se recalcula
  → Usuario clic "EFECTIVO" → ingresa monto → pagoEntry se agrega
  → Totales se recalculan en tiempo real

  → "Ejecutar Pago" → registrarCobroEfectivo(IPagoEfectivo) → comprobante
  → "Cancelar Operación" → navigate("/caja")
```

---

## Secuencia de implementación

1. `src/types/pago.ts` (tipos nuevos)
2. `src/config/sap.ts` (agregar MEDIOS_PAGO)
3. `src/hooks/usePagoDetalle.ts` (hook — usa APIs existentes)
4. `src/features/caja/PagoDetallePage.tsx` (componente 3 columnas)
5. `src/components/pos/CajaFacturaList.tsx` (agregar onDoubleClickPartida)
6. `src/features/caja/CajaPage.tsx` (conectar doble clic → navigate)
7. `src/routes/index.tsx` (agregar ruta)
8. `src/features/caja/PagoDetallePage.test.tsx` (tests)

---

## Reutilización de código existente

| Qué reutilizar | Archivo |
|----------------|---------|
| `getCliente(kunnr)` | `src/services/api/clientes.ts` |
| `getPartidasAbiertas()` | `src/services/api/facturas.ts` |
| `registrarCobroEfectivo()` | `src/services/api/cobros.ts` |
| `formatCLP()`, `formatRUT()`, `formatFecha()` | `src/utils/format.ts` |
| `useUser()` | `src/stores/userContext.ts` |
| `ICliente`, `IPartidaAbierta`, `IPagoEfectivo`, `IResultadoCobro` | `src/types/` |
| ROLES, SUCURSALES, SAP_SOCIEDAD | `src/config/sap.ts` |
| MSW handlers + backend routes para partidas/cobros | Ya existen |

---

## Decisiones clave

1. **Ruta nueva** (`/caja/pago/:belnr`) en vez de panel dentro de CajaPage — el layout 3 columnas necesita pantalla completa
2. **Mantener el modal PagoEfectivoModal** existente como alternativa rápida (no eliminar)
3. **Solo EFECTIVO habilitado** — los demás medios de pago se muestran deshabilitados (texto gris/negro) para que el usuario vea que existen pero no puede usarlos aún
4. **ICliente actual no tiene dirección/población/distrito** — mostrar "—" por ahora en esos campos, se agregan cuando SAP los exponga

---

## Verificación

1. `npm run type-check` — sin errores
2. `npm run test` — todos los tests pasan (existentes + nuevos)
3. Verificación manual en navegador:
   - Login como admin (admin/1234) → Caja → Pago Cta. Cte.
   - Doble clic en cualquier fila → navega a PagoDetallePage
   - Panel izquierdo muestra datos del cliente correctos
   - Panel centro muestra partidas del cliente con la fila pre-seleccionada
   - Panel derecho muestra EFECTIVO activo, resto deshabilitado
   - Seleccionar EFECTIVO → ingresar monto → aparece en tabla de medios seleccionados
   - Totales se actualizan en tiempo real
   - "Ejecutar Pago" registra el cobro y muestra comprobante
   - "Cancelar Operación" vuelve a /caja
4. `npm run build` — build producción sin errores
