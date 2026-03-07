# CLAUDE.md — Cooprinsem POS

## Proyecto
Sistema POS para Cooprinsem Ltda. (cooperativa agrícola chilena, 18 sucursales).
Reemplaza frontend SAP WebDynpro por React SPA que consume OData de SAP S/4HANA.
WebDynpro actual: `sapqas.cooprinsem:44320/sap/bc/webdynpro/sap/zpos_wd_fun_001`

## Stack

### Frontend (este repositorio — src/)
- Lenguaje: TypeScript strict mode
- Framework: React 18 + Vite
- UI Components: @ui5/webcomponents-react (estilo SAP Fiori)
- State: React Context (POC) → Zustand (Fase 1 completa)
- Testing: Vitest + RTL + MSW v2

### Backend POC (carpeta server/ — en este mismo repositorio)
- Runtime: Node.js + Express
- Base de datos: PostgreSQL local (simula SAP en el POC)
- ORM: Prisma
- Estructura de endpoints: imita SAP OData para que la migración a SAP real sea mínima
- Datos: seed con datos sintéticos realistas de Cooprinsem

### Conexión futura a SAP (Fase 1 real — post POC)
- El backend POC se reemplaza por llamadas directas a SAP S/4HANA OData vía VPN
- El frontend NO cambia — solo cambia la URL base en .env
- Sin middleware propio en Fase 1

### Fase 2 — futuro offline (próximo año)
- BD local SQLite o PostgreSQL por sucursal
- Sincronización nocturna batch con SAP central
- Electron (.exe Windows) + Capacitor (.apk Android)

## POC — Solo esto por ahora
1. **Venta Mesón** → crear pedido → POST `SalesOrderSet` → retorna `VBELN`
2. **Caja: Pago Efectivo** → partidas abiertas → cobrar → POST `PaymentSet` → retorna `BELNR` clase W

**NO implementar en POC:** Transbank, SII, offline, otros medios de pago, anticipos, egresos, arqueo, intereses.

## Comandos
```bash
npm run dev           # Vite dev server + MSW activo
npm run build         # Build producción
npm run test          # Vitest
npm run test:watch    # Vitest en watch mode
npm run test:coverage # Cobertura
npm run lint          # ESLint
npm run type-check    # tsc --noEmit
```

## Parámetros SAP confirmados
| Parámetro | Valor |
|-----------|-------|
| Sociedad | `COOP` |
| Clase Doc. Venta | `ZPOS` |
| Moneda | `CLP` (enteros, sin decimales) |
| IVA | 19% |
| Cliente Boleta | `999999` |
| Almacenes | B000, B001, B002, G000 |
| Doc. cobro | clase `W` (Recaudación de Caja) |
| Doc. anticipo | clase `DZ` (F-37) |

⚠️ Pendiente con ABAP: Org. Ventas, Canal Distribución (código), SAP Client.

## Reglas críticas — NUNCA violar
- CLP sin decimales. Nunca `toFixed()` para moneda.
- RUT formato `12.345.678-9`. Validar con módulo 11 antes de enviar a SAP.
- Tarjetas: NO permiten sobrepago. Cheques: SÍ permiten sobrepago.
- Toda lógica de precios/impuestos/descuentos: delegar a SAP, NO calcular en frontend.
- SAP on-premise requiere CSRF token para POST/PATCH. Ver `.claude/rules/odata.md`.
- Autenticación: Basic Auth (mismos usuarios SAP del WebDynpro).
- Comentarios de lógica de negocio en **español**. Código técnico en **inglés**.

## Variables de entorno
Ver .env.example para lista completa.

POC local: VITE_USE_MOCK=false, VITE_API_BASE_URL=http://localhost:3001
Desarrollo futuro SAP: VITE_SAP_ODATA_BASE_URL=https://sapqas.cooprinsem:44320/...

## Estructura src/
```
src/
├── components/common/    # UI genérico reutilizable
├── components/pos/       # Componentes específicos POS
├── features/pedidos/     # Módulo Venta Mesón
├── features/caja/        # Módulo Caja
├── services/odata/       # Config SAP Cloud SDK
├── services/api/         # Funciones de llamada OData
├── services/mock/        # MSW handlers
├── hooks/                # Custom hooks
├── stores/               # Estado global
├── types/                # Interfaces TypeScript
├── utils/                # formatCLP, formatRUT, validarRUT
├── config/               # Constantes SAP
└── routes/               # React Router
```

## Documentación completa del proyecto
@docs/PRD.md
@docs/ARCHITECTURE.md
@docs/TASKS.md
@docs/TESTING.md
@docs/DECISIONS.md
