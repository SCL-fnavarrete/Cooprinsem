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

**Implementado en Sprint 5 (post-POC):** List. Pagarés, Ant. Cliente, Arqueo Caja, Salir de la Caja, Panel Administración (CRUD usuarios, roles/sucursales lectura).
**Implementado en Sprint 6:** HomePage (tiles Fiori por rol), PedidoListPage (listado con filtros), PedidoDetallePage, partidas visibles sin buscador, cliente auto-detectado desde selección de partidas.
**Implementado en Sprint 7:** Pedidos — campos observaciones + ubicación predio, crear partida abierta al crear pedido, pedido cambia a "Procesado" al cobrar, ver partidas pagadas en Caja, estados unificados (Creado/Procesado/Anulado).
**Implementado en Sprint 8:** HomePage sin auto-redirección (todos los roles ven tiles), ArticuloSearch se limpia tras seleccionar, Pedidos — filtros Nº Pedido y Cliente + columna Nº Documento, Caja — título "Listado documentos", 4 filtros (Cliente/Nombre/Nº Doc/Nº Pedido), sin botón Cliente Boleta, columna "Valor" (antes "Importe").
**Implementado en Sprint 9:** Menú lateral Pedidos (6 opciones, 3 habilitadas), Búsqueda de Documentos (Pedido/Cotización + Factura/Nota Crédito), Panel Clientes (Buscar con sugerencias automáticas, Crear con 19 campos, Ficha con línea de crédito + tablas), modelo Cliente ampliado (21 campos nuevos), Login con versión y fecha.
**NO implementar aún:** Transbank, SII, offline, otros medios de pago, egresos, intereses, E° de Cuenta, Consulta Pago, Cotización, Nota Créditos, Reporte DIIO.

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
├── features/home/        # HomePage con tiles Fiori por rol
├── features/pedidos/     # Módulo Venta Mesón (listado, formulario, detalle)
├── features/caja/        # Módulo Caja (8 sub-módulos, 5 habilitados)
├── features/admin/       # Panel Administración (rol 1)
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

## Reglas Críticas de Implementación

### Cambios de Roles y Permisos
Antes de eliminar o reasignar cualquier código de rol:
1. PREGUNTAR siempre: ¿el rol desaparece del sistema o solo del catálogo visible al usuario?
2. NUNCA reasignar códigos numéricos de roles existentes — solo agregar o desactivar
3. Verificar impacto en: server/src/routes/auth.ts (usuarios hardcodeados),
   ProtectedRoute, src/config/sap.ts y todos los [1,2,3,4].includes(rolCod) del frontend
4. Ante cualquier duda sobre el alcance → pedir confirmación ANTES de ejecutar
5. Referencia: ADR-018 (revertido) — lección aprendida en Sprint 6

## Documentación completa del proyecto
@docs/PRD.md
@docs/ARCHITECTURE.md
@docs/TASKS.md
@docs/TESTING.md
@docs/DECISIONS.md
