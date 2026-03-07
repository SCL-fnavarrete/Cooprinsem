# CLAUDE.md — Cooprinsem POS

## Proyecto
**Sistema Punto de Venta (POS) para Cooprinsem Ltda.**
Reemplazo del frontend SAP WebDynpro por una aplicación web moderna React que consume OData services de SAP S/4HANA directamente. El WebDynpro actual corre en `sapqas.cooprinsem:44320/sap/bc/webdynpro/sap/zpos_wd_fun_001`.

## Cliente
- **Razón Social:** Cooprinsem Ltda.
- **Giro:** Ferretería / Insumos Agrícolas (cooperativa agrícola chilena)
- **Sociedad SAP:** `COOP`
- **Sucursales:** 18 a nivel nacional (ej: D190=Osorno, D052, D014, D160, D170, D200)
- **Volumen:** ~70.000 transacciones/año (~11 transacciones/sucursal/día)
- **Dispositivos:** PCs Windows + Tablets Android (Chrome)
- **Conectividad:** VPN entre cada sucursal y SAP central

## Stack Tecnológico

### Frontend (este repositorio)
- **Lenguaje:** TypeScript strict mode
- **Framework:** React 18+ con Vite
- **UI Components:** SAP UI5 Web Components for React (`@ui5/webcomponents-react`)
- **OData Client:** SAP Cloud SDK (`@sap-cloud-sdk/odata-v2` o `v4` — confirmar versión OData con equipo ABAP)
- **State Management:** React Context para POC → Zustand a partir de Fase 1 completa
- **Testing:** Vitest + React Testing Library + MSW (mock OData)

### Backend (externo — NO en este repo)
- SAP S/4HANA on-premise
- Conexión directa HTTP/HTTPS vía VPN corporativa (sin middleware, sin BFF propio)
- Autenticación: Basic Auth (mismo usuario SAP del WebDynpro actual)
- CSRF token requerido para POST/PATCH/DELETE (header `x-csrf-token: fetch`)

### Fase 2 — futuro, NO implementar en POC
- Electron (.exe Windows) + Capacitor (.apk Android)
- SQLite (better-sqlite3 en Electron, @capacitor-community/sqlite en Android)
- Sync engine background con SAP central

## Alcance del POC
**Solo implementar:**
1. **Venta Mesón** — Crear pedido simple con grilla de artículos
2. **Caja: Pago con Efectivo** — Cobrar factura pendiente con efectivo, registrar en SAP

**NO implementar en POC:**
- Transbank (tarjetas débito/crédito)
- Facturación electrónica SII
- Modo offline / SQLite
- Otros métodos de pago (pagaré, cheque, vale vista)
- Anticipos, egresos, arqueo, apertura/cierre de caja
- Devoluciones / notas de crédito
- Intereses por mora

## Parámetros SAP de Cooprinsem
| Parámetro | Valor | Fuente |
|-----------|-------|--------|
| Sociedad | `COOP` | Confirmado |
| Clase Doc. Venta | `ZPOS` | Confirmado |
| Moneda | `CLP` | Confirmado |
| IVA | 19% (incluido en precio) | Confirmado |
| Cliente Boleta | `999999` | Confirmado |
| Canales distribución | Venta Mesón / Venta Industrial | Confirmado |
| Tipos de documento venta | Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada | Confirmado |
| Almacenes | B000, B001, B002, G000 | Confirmado |
| Org. Ventas | Pendiente confirmar con ABAP | ⚠️ Pendiente |
| Canal Distribución (código) | Pendiente confirmar con ABAP | ⚠️ Pendiente |
| SAP Client | Pendiente confirmar con ABAP | ⚠️ Pendiente |

## Convenciones de Código

### Estructura de Carpetas
```
src/
├── components/        # Componentes UI reutilizables
│   ├── common/        # Botones, inputs, modales genéricos
│   └── pos/           # Componentes específicos del POS
├── features/          # Módulos funcionales
│   ├── pedidos/       # Venta Mesón (crear pedido)
│   └── caja/          # Caja (cobro, pagos)
├── services/          # Clientes OData y lógica de API
│   ├── odata/         # Configuración SAP Cloud SDK
│   ├── api/           # Funciones de llamada a servicios
│   └── mock/          # MSW handlers para desarrollo
├── hooks/             # Custom React hooks
├── stores/            # Estado global (Context → Zustand)
├── types/             # Tipos TypeScript compartidos
├── utils/             # Utilidades y helpers
├── layouts/           # Layouts de página
├── routes/            # Configuración de rutas
└── config/            # Constantes y configuración SAP
```

### Nomenclatura
- **Archivos componentes:** PascalCase (`ArticuloGrid.tsx`)
- **Archivos utilidad:** camelCase (`formatCurrency.ts`)
- **Interfaces:** PascalCase con prefijo `I` (`IPedido`, `IArticulo`, `ICliente`)
- **Constantes globales:** UPPER_SNAKE_CASE (`SOCIEDAD_SAP = 'COOP'`)
- **Hooks:** prefijo `use` (`usePedido`, `useCaja`)
- **Stores:** sufijo `Store` (`pedidoStore`)

### Estilo de Código
- Siempre TypeScript strict — nunca `any` sin justificación documentada
- Preferir `const` sobre `let`, nunca `var`
- Funciones flecha para componentes: `const MyComponent: FC<Props> = () => {}`
- Destructuring de props siempre
- Imports organizados: React → Librerías externas → Componentes → Utils → Types → Estilos
- No usar `default export` excepto para páginas/rutas
- Comentarios de lógica de negocio en **español**, comentarios técnicos en **inglés**
- Los campos SAP (MATNR, KUNNR, VBELN, etc.) se mapean a nombres en español en la capa de tipos

### Reglas de Negocio Críticas — Memorizar
- **Moneda CLP:** Sin decimales. Usar enteros. SAP envía enteros para CLP.
- **IVA:** 19%. Siempre incluido en el precio al mostrar al usuario.
- **RUT:** Formato `12.345.678-9` (puntos de miles + guión + dígito verificador).
- **Sobrepago tarjetas:** NO permitido — el monto debe ser exacto.
- **Sobrepago cheques:** SÍ permitido — el exceso va a saldo a favor en cta. cte. del cliente.
- **Intereses:** Se calculan sobre deuda vencida (documentos con fecha vencimiento pasada), NO sobre saldos negativos en caja. Son cosas distintas.
- **Documento cobro:** El pago genera documento contable clase `W` (Recaudación de Caja) en SAP.
- **Anticipo:** Usa transacción F-37, crea clase de documento `DZ` en SAP.
- **Lógica de negocio compleja (precios, impuestos, descuentos, intereses):** Delegar a SAP. El frontend NO recalcula — SAP valida al grabar.

### Roles de Usuario
| Código | Rol | Acceso |
|--------|-----|--------|
| 1 | Administrador | Todos los módulos |
| 2 | Ventas | Solo Pedidos |
| 3 | Caja | Solo módulo Caja (8 funciones) |
| 4 | Consultas | Solo lectura |

### Funciones de Caja (8 sub-módulos)
| Botón | Función | POC |
|-------|---------|-----|
| Pago Cta. Cte. | Cobrar facturas pendientes del cliente | ✅ Solo efectivo |
| Egr. de Caja | Devoluciones / egresos autorizados | ❌ |
| List. Pagarés | Listado de pagarés (solo lectura) | ❌ |
| Ant. Cliente | Registrar anticipos de clientes | ❌ |
| E° de Cuenta | Estado de cuenta del cliente | ❌ |
| Consulta Pago | Consultar pagos realizados | ❌ |
| Arqueo Caja | Cuadrar caja del día | ❌ |
| Salir de la Caja | Cerrar sesión de caja | ❌ |

### Servicios OData Requeridos (confirmar con equipo ABAP)
| Servicio | Equivalente SAP | Operaciones |
|---------|-----------------|-------------|
| Consultar partidas abiertas | FBL5N | GET |
| Datos maestros de cliente | Maestro deudor | GET |
| Catálogo de bancos | Tabla bancos SAP | GET |
| Ejecutar recaudación (clase W) | Doc. contable | POST |
| Crear solicitud anticipo | F-37 (clase DZ) | POST |
| Generar egreso de caja | Doc. egreso FI | POST |
| Generar doc. SD intereses | Factura SD | POST |
| Consultar stock por centro/almacén | Stock MM | GET |
| CRUD pedidos de venta | Pedidos SD | GET/POST/PATCH |

> ⚠️ **Dependencia crítica:** Sin estos servicios OData, no se puede avanzar. Coordinar con equipo ABAP tempranamente.

## Comandos
```bash
npm run dev           # Servidor de desarrollo (Vite + MSW activo)
npm run build         # Build de producción
npm run preview       # Preview del build de producción
npm run test          # Ejecutar tests (Vitest)
npm run test:watch    # Tests en modo watch
npm run test:coverage # Cobertura de tests
npm run lint          # ESLint
npm run type-check    # TypeScript compiler check (sin emitir)
```

## Variables de Entorno
```env
# .env.development (mocks activados por defecto)
VITE_SAP_ODATA_BASE_URL=https://sapqas.cooprinsem:44320/sap/opu/odata/sap
VITE_SAP_SOCIEDAD=COOP
VITE_USE_MOCK=true

# .env.production (SAP real)
VITE_SAP_ODATA_BASE_URL=https://sap.cooprinsem/sap/opu/odata/sap
VITE_SAP_SOCIEDAD=COOP
VITE_USE_MOCK=false

# Pendiente confirmar con equipo ABAP:
# VITE_SAP_CLIENT=???
# VITE_ORG_VENTAS=???
# VITE_CANAL_DIST=???
# VITE_SECTOR=???
```

## Notas Importantes para Claude Code
1. **POC primero** — No sobre-diseñes para el sistema completo. El primer entregable es Venta Mesón + Pago Efectivo.
2. **MSW en desarrollo** — Usar mocks hasta tener acceso real a SAP. El flag `VITE_USE_MOCK=true` activa MSW.
3. **Campos SAP en alemán** — Los nombres de campo OData vienen en alemán (MATNR, KUNNR, VBELN). Mapear a español en `src/types/`.
4. **Sin backend propio en Fase 1** — No crear APIs intermedias. Todo va directo a SAP vía OData.
5. **Credenciales SAP** — Los mismos usuarios del WebDynpro actual. Basic Auth.
6. **CSRF token** — SAP on-premise requiere CSRF token para mutaciones. Obtener con `x-csrf-token: fetch` en GET inicial.
7. **Contacto técnico SAP:** Mariela — conoce el WebDynpro actual, flujos de caja y contabilizaciones.
8. **Responsabilidad ABAP:** El equipo SAP/ABAP de Cooprinsem expone los servicios OData. Nosotros solo consumimos.
