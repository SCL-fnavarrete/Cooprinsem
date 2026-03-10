# ARCHITECTURE.md — Cooprinsem POS

## Arquitectura POC (local)

Para el POC se usa una arquitectura de 3 capas completamente local en un PC Windows:

```
Browser/App
    ↓ HTTP (localhost)
Backend Node.js + Express (puerto 3001)
    ↓ Prisma ORM
PostgreSQL local (puerto 5432)
```

### Por qué esta arquitectura para el POC
- No requiere acceso a SAP durante el desarrollo
- PostgreSQL con datos sintéticos simula fielmente los datos SAP
- Los endpoints del backend imitan la estructura OData de SAP → migración futura mínima
- Es la base de la arquitectura offline de Fase 2 (BD por sucursal + sync con SAP central)

### Migración POC → Fase 1 (online SAP)
El frontend no cambia. Solo se actualiza VITE_API_BASE_URL en .env para
apuntar directamente a los servicios OData de SAP vía VPN.
El backend Node.js/Prisma/PostgreSQL se elimina en Fase 1.

### Migración Fase 1 → Fase 2 (offline)
Fase 2 retoma la arquitectura del POC pero con:
- PostgreSQL por sucursal (no en servidor central)
- Sincronización nocturna batch con SAP central
- App empaquetada como Electron (.exe) en Windows y Capacitor (.apk) en Android

---

## 1. Visión General

```
┌────────────────────────────────────────────────────────────┐
│                      USUARIO                               │
│        PC Windows (≥1024px) / Tablet Android (≥768px)     │
└──────────────────────┬─────────────────────────────────────┘
                       │ HTTPS (Chrome)
                       │ VPN Corporativa Cooprinsem
┌──────────────────────▼─────────────────────────────────────┐
│                  FRONTEND (React SPA)                       │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │
│  │  Pedidos │ │   Caja   │ │ Consultas │ │   Admin     │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬──────┘  │
│       └─────────────┼─────────────┼──────────────┘         │
│              ┌──────▼──────┐                                │
│              │ OData Layer │  (SAP Cloud SDK)               │
│              └──────┬──────┘                                │
└─────────────────────┼──────────────────────────────────────┘
                      │ OData HTTP/JSON
                      │ VPN → sapqas.cooprinsem:44320
┌─────────────────────▼──────────────────────────────────────┐
│                  SAP S/4HANA  (Sociedad: COOP)             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ SD (ZPOS)│ │ FI (Caja)│ │ MM (Stock)│ │ Basis (Auth)│  │
│  └──────────┘ └──────────┘ └───────────┘ └─────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Regla fundamental Fase 1:** No hay backend propio. El frontend React se comunica **directamente** con SAP vía OData. No se construye middleware, BFF ni APIs propias.

---

## 2. Decisiones de Arquitectura (ADR)

### ADR-01: React + Vite como framework frontend
**Decisión:** React 18+ con Vite como bundler.

**Alternativas descartadas:**
| Tecnología | Razón descarte |
|-----------|----------------|
| Next.js | SSR/filesystem routing innecesarios para POS interno. Overhead sin valor. |
| Vue.js | Menor integración con ecosistema UI5 SAP |
| .NET/WPF | Solo Windows, no cubre tablets Android, requiere C# desde cero |
| Flutter | Requiere Dart. Sin componentes UI empresariales tipo SAP Fiori |
| PWA | Insuficiente para offline real con SQLite en Fase 2 |
| Tauri | Soporte móvil Android aún inmaduro para proyecto enterprise |

**Justificación:** React tiene el ecosistema más grande, mejor integración con SAP UI5 Web Components, y Vite ofrece HMR instantáneo y build rápido sin configuración compleja.

---

### ADR-02: SAP UI5 Web Components for React
**Decisión:** Usar `@ui5/webcomponents-react` como librería de componentes UI.

**Justificación:**
- Componentes diseñados para apps empresariales SAP (Tables, Dialogs, DatePicker, Input con Suggestions)
- Look & feel Fiori — familiaridad para usuarios acostumbrados al WebDynpro
- Accesibilidad incorporada (WCAG 2.1)
- Reducción de resistencia al cambio: usuarios perciben transición, no reemplazo abrupto
- Componentes complejos listos (no construir desde cero)

---

### ADR-03: SAP Cloud SDK para consumo OData
**Decisión:** Usar `@sap-cloud-sdk/odata-v2` o `odata-v4` según versión que exponga el equipo ABAP.

**Alternativas descartadas:**
| Alternativa | Razón descarte |
|-------------|----------------|
| Fetch/Axios directo | Requiere parsear OData manualmente, propenso a errores |
| OData client genérico | Sin type-safety con metadata SAP |
| React Query + fetch | No maneja CSRF tokens SAP automáticamente |

**Justificación:**
- Type-safe: genera tipos TypeScript desde metadata OData de SAP
- Manejo automático de CSRF tokens (requerido para POST/PATCH SAP on-premise)
- Soporte nativo para `$expand`, `$filter`, batch requests
- Librería oficial de SAP — compatibilidad garantizada con S/4HANA

> ⚠️ **Confirmar con equipo ABAP** si exponen OData v2 o v4 para usar el paquete correcto.

---

### ADR-04: Sin backend propio (sin BFF)
**Decisión:** El frontend consume OData de SAP directamente, sin middleware propio.

**Justificación:**
- SAP ya expone toda la lógica de negocio vía OData
- Reduce complejidad de infraestructura (no hay servidor adicional que mantener)
- La VPN garantiza seguridad del canal — Basic Auth funciona directo desde el browser
- Menor latencia (un hop menos)
- Para el POC y Fase 1, un BFF sería over-engineering

**Riesgo aceptado:** Si en Fase 2 se requieren transformaciones complejas o agregaciones multi-source, se evaluará un BFF ligero. La abstracción de servicios en `src/services/api/` facilita ese cambio sin tocar la UI.

---

### ADR-05: TypeScript strict mode
**Decisión:** TypeScript con `strict: true` en tsconfig.

**Justificación:**
- Los datos OData SAP tienen estructuras complejas (campos opcionales, tipos mixtos, nombres en alemán)
- Strict mode previene errores en runtime con datos inesperados del servicio
- Mejor DX con autocompletado de campos SAP mapeados

---

### ADR-06: React Context para POC → Zustand para Fase 1 completa
**Decisión:** POC usa React Context. Se migra a Zustand cuando crezca la complejidad.

**Justificación:**
- POC tiene solo 2 módulos: Context es suficiente
- Zustand se justifica cuando haya estado de caja + pedido + usuario + sync (Fase 2)
- La migración es simple: los hooks de Context se reemplazan por stores Zustand sin cambiar la UI

**Estado global mínimo para POC:**
```typescript
// Contexto de usuario autenticado
interface IUserContext {
  usuario: IUsuario | null;
  sucursal: string;          // Código centro (ej: D190)
  login: (cred: ICredenciales) => Promise<void>;
  logout: () => void;
}

// Contexto del pedido en progreso
interface IPedidoContext {
  pedido: IPedido;
  agregarLinea: (articulo: IArticulo) => void;
  actualizarCantidad: (posicion: number, cantidad: number) => void;
  eliminarLinea: (posicion: number) => void;
  limpiar: () => void;
  grabar: () => Promise<string>; // retorna VBELN
}
```

---

### ADR-07: MSW para mocks de OData en desarrollo
**Decisión:** Usar Mock Service Worker (MSW) para interceptar llamadas OData durante desarrollo.

**Justificación:**
- No depender de acceso a SAP para desarrollar UI (servicios ABAP pueden no estar listos)
- Tests determinísticos con datos controlados
- Fácil de desactivar: flag `VITE_USE_MOCK=false`
- Los handlers MSW documentan implícitamente el contrato OData esperado con el equipo ABAP

**Toggle:**
```typescript
// src/main.tsx
if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { worker } = await import('./services/mock/browser');
  await worker.start({ onUnhandledRequest: 'warn' });
}
```

---

### ADR-08: Vitest + React Testing Library
**Decisión:** Vitest como runner, RTL para tests de componentes.

**Justificación:**
- Vitest comparte la config de Vite → zero config adicional
- RTL fuerza tests centrados en comportamiento del usuario (no en implementación interna)
- MSW funciona igual en tests y en desarrollo (mismos handlers)

---

### ADR-09: Moneda CLP como entero
**Decisión:** Todos los montos se manejan como `number` entero (sin decimales).

**Justificación:**
- CLP no tiene centavos → no hay decimales en facturas ni cobros
- SAP envía montos CLP como enteros
- Evita errores de punto flotante (ej: `0.1 + 0.2 !== 0.3`)
- Simplifica formateo: `$1.234.567` (punto como separador de miles)

---

### ADR-10: Lógica de negocio delegada a SAP
**Decisión:** No replicar reglas complejas de negocio en el frontend.

**Qué calcula SAP (no el frontend):**
- Precios e impuestos (condiciones de precio, IVA, Impuesto Específico)
- Descuentos por cliente/material
- Intereses moratorios (mantenedor de tasas en SAP)
- Validación de stock al grabar
- Clase de documento correcta (W, DZ, etc.)
- Generación de números de documento (VBELN, BELNR)

**Qué sí valida el frontend (UX):**
- Campos obligatorios vacíos
- Formato RUT chileno (módulo 11)
- Cantidad > 0
- Monto recibido ≥ monto a cobrar (pago efectivo)
- Sobrepago en tarjetas (NO permitido)

---

## 3. Estructura de Carpetas

```
cooprinsem-pos/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppShell.tsx          # Layout principal (ShellBar, navegación)
│   │   │   ├── SearchInput.tsx       # Input con autocompletado SAP UI5
│   │   │   ├── MoneyDisplay.tsx      # Formateo CLP ($1.234.567)
│   │   │   ├── LoadingOverlay.tsx    # Spinner para llamadas OData
│   │   │   └── ErrorBoundary.tsx     # Manejo errores global
│   │   └── pos/
│   │       ├── ArticuloGrid.tsx      # Tabla de artículos del pedido
│   │       ├── ClienteSearch.tsx     # Búsqueda de cliente SAP
│   │       ├── PedidoHeader.tsx      # Cabecera del pedido (canal, tipo doc, cliente)
│   │       ├── PedidoTotals.tsx      # Panel de totales + stock por centro
│   │       ├── CajaFacturaList.tsx   # Grilla de partidas abiertas (FBL5N)
│   │       └── PagoEfectivo.tsx      # Modal cobro efectivo + vuelto
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx         # Login SAP (Basic Auth)
│   │   │   └── ProtectedRoute.tsx    # Guard de rutas por rol
│   │   ├── home/
│   │   │   └── HomePage.tsx          # Tiles Fiori por rol + auto-redirección
│   │   ├── pedidos/
│   │   │   ├── PedidoListPage.tsx    # Listado de pedidos con filtros
│   │   │   ├── PedidoPage.tsx        # Formulario Crear Venta
│   │   │   ├── PedidoDetallePage.tsx # Vista detalle de pedido existente
│   │   │   ├── usePedido.ts          # Hook: estado + lógica del pedido
│   │   │   └── pedidoValidation.ts   # Validaciones UX (no de negocio)
│   │   ├── caja/
│   │   │   ├── CajaPage.tsx          # Página principal Caja (8 botones)
│   │   │   ├── PagoCtaCte.tsx        # Sub-módulo: Cobro Facturas
│   │   │   ├── ListPagaresPanel.tsx  # Pagarés solo lectura
│   │   │   ├── AntClientePanel.tsx   # Anticipos de cliente
│   │   │   ├── ArqueoCajaPanel.tsx   # Arqueo dual-rol (cajero + admin)
│   │   │   ├── useCaja.ts            # Hook: estado + lógica de caja
│   │   │   └── cajaValidation.ts     # Validaciones UX de caja
│   │   └── admin/
│   │       └── AdminPage.tsx         # CRUD usuarios + roles/sucursales lectura (rol 1)
│   │
│   ├── services/
│   │   ├── odata/
│   │   │   ├── client.ts             # Configuración SAP Cloud SDK base URL
│   │   │   ├── auth.ts               # Basic Auth + CSRF token handler
│   │   │   └── errorHandler.ts       # Mapeo errores OData → mensajes en español
│   │   ├── api/
│   │   │   ├── materiales.ts         # buscarMateriales(), getMaterial()
│   │   │   ├── clientes.ts           # buscarClientes(), getCliente()
│   │   │   ├── pedidos.ts            # crearPedido(), getPedidos(), getPedido()
│   │   │   ├── facturas.ts           # getPartidasAbiertas() (FBL5N)
│   │   │   ├── cobros.ts             # registrarCobroEfectivo() (clase W)
│   │   │   ├── pagares.ts            # getPagares()
│   │   │   ├── anticipos.ts          # buscarAnticipo()
│   │   │   ├── arqueo.ts             # grabarArqueo(), getArqueoDelDia(), ejecutarCierre()
│   │   │   ├── admin.ts              # CRUD usuarios, getRoles(), getSucursales()
│   │   │   └── stock.ts              # getStockPorCentro() (B000-G000)
│   │   └── mock/
│   │       ├── browser.ts            # Setup MSW para navegador (dev)
│   │       ├── server.ts             # Setup MSW para Node.js (tests)
│   │       ├── handlers.ts           # Handlers OData (GET, POST)
│   │       └── data/
│   │           ├── materiales.json   # ~30 artículos de ferretería/agro
│   │           ├── clientes.json     # ~10 clientes con RUT chileno
│   │           └── facturas.json     # ~15 partidas abiertas (mix vencidas/vigentes)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                # Sesión SAP, logout, rol actual
│   │   └── useOData.ts               # Wrapper genérico para llamadas OData
│   │
│   ├── stores/                       # (vacío en POC, usar cuando se migre a Zustand)
│   │
│   ├── types/
│   │   ├── sap.ts                    # Tipos crudos SAP (MATNR, KUNNR, VBELN, etc.)
│   │   ├── articulo.ts               # IArticulo, IArticuloBusqueda
│   │   ├── cliente.ts                # ICliente, IClienteBusqueda
│   │   ├── pedido.ts                 # IPedido, ILineaPedido, IPedidoHeader
│   │   ├── factura.ts                # IFacturaPendiente, IPartidaAbierta
│   │   ├── caja.ts                   # ICobro, IPagoEfectivo
│   │   └── common.ts                 # IUsuario, IApiResponse<T>, IRol
│   │
│   ├── utils/
│   │   ├── format.ts                 # formatCLP(), formatRUT(), formatFecha()
│   │   ├── validations.ts            # validarRUT(), validarMonto()
│   │   └── sapMapper.ts              # Mapeo campos SAP ↔ español
│   │
│   ├── config/
│   │   └── sap.ts                    # Constantes SAP (SOCIEDAD, CLIENTE_BOLETA, etc.)
│   │
│   ├── test/
│   │   ├── setup.ts                  # Setup global Jest/Vitest
│   │   ├── helpers.tsx               # renderWithProviders()
│   │   └── factories/
│   │       ├── articulo.factory.ts
│   │       ├── cliente.factory.ts
│   │       └── factura.factory.ts
│   │
│   ├── layouts/
│   │   └── MainLayout.tsx            # Layout con ShellBar + SideNavigation
│   │
│   ├── routes/
│   │   └── index.tsx                 # React Router config
│   │
│   ├── App.tsx
│   └── main.tsx                      # Entry point + MSW toggle
│
├── public/
├── .env.development                  # VITE_USE_MOCK=true
├── .env.production                   # VITE_USE_MOCK=false
├── .env.example
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Mapeo de Campos SAP ↔ Frontend

| Campo SAP (alemán) | Campo Frontend (español) | Tipo TS | Descripción |
|--------------------|--------------------------|---------|-------------|
| MATNR | codigoMaterial | string | Código del artículo |
| MAKTX | descripcion | string | Descripción del material |
| KUNNR | codigoCliente | string | Código del cliente/deudor |
| NAME1 | nombreCliente | string | Nombre del cliente |
| STCD1 | rut | string | RUT del cliente (Chile) |
| VBELN | numeroPedido | string | Número de documento de venta/cobro |
| POSNR | posicion | string | Posición en el pedido |
| KWMENG | cantidad | number | Cantidad |
| MEINS | unidadMedida | string | Unidad de medida |
| NETWR | valorNeto | number | Valor neto en CLP (entero) |
| MWSBP | montoIVA | number | Monto IVA en CLP (entero) |
| WAERK | moneda | string | Moneda (CLP) |
| WERKS | centro | string | Centro/sucursal (ej: D190) |
| LGORT | almacen | string | Almacén (B000, B001, B002, G000) |
| BELNR | numeroDocumento | string | Número documento contable |
| DMBTR | montoML | number | Monto en moneda local (CLP) |
| FAEDT | fechaVencimiento | string | Fecha de vencimiento (YYYYMMDD SAP) |
| BUDAT | fechaContable | string | Fecha de contabilización |
| BLART | claseDocumento | string | Clase de documento (W, DZ, etc.) |
| BUKRS | sociedad | string | Sociedad (COOP) |

---

## 5. Flujos de Datos

### 5.1 Crear Pedido (Fase 1)
```
Usuario         React App          SAP S/4HANA
  │                │                    │
  │ Busca cliente  │                    │
  │───────────────>│ GET CustomerSet    │
  │                │   ?$filter=...     │
  │                │───────────────────>│
  │                │<───────────────────│ [{KUNNR, NAME1, STCD1...}]
  │<───────────────│                    │
  │                │                    │
  │ Busca artículo │                    │
  │───────────────>│ GET MaterialSet    │
  │                │───────────────────>│
  │                │<───────────────────│ [{MATNR, MAKTX, MEINS...}]
  │<───────────────│                    │
  │                │                    │
  │ Edita líneas   │ (solo estado local)│
  │───────────────>│                    │
  │                │                    │
  │ Graba (F9)     │                    │
  │───────────────>│ GET (CSRF token)   │
  │                │───────────────────>│
  │                │<── x-csrf-token ───│
  │                │                    │
  │                │ POST SalesOrderSet │
  │                │   BLART=ZPOS       │
  │                │   BUKRS=COOP       │
  │                │───────────────────>│ Valida stock, precio
  │                │<───────────────────│ {VBELN: "0012345678"}
  │<───────────────│ "Pedido N° 12345678"│
```

### 5.2 Cobro Efectivo (Fase 1)
```
Cajero          React App          SAP S/4HANA
  │                │                    │
  │ Busca cliente  │                    │
  │───────────────>│ GET CustomerSet    │
  │                │───────────────────>│
  │<───────────────│                    │
  │                │                    │
  │ Ver partidas   │                    │
  │───────────────>│ GET OpenItemSet    │
  │                │   $filter=KUNNR    │
  │                │───────────────────>│ (equiv. FBL5N)
  │                │<───────────────────│ [{BELNR, DMBTR, FAEDT, días mora...}]
  │<───────────────│ Lista documentos   │
  │                │                    │
  │ Selecciona +   │                    │
  │ Ingresa monto  │ Calcula vuelto     │
  │   recibido     │ (local: recibido   │
  │                │  - a cobrar)       │
  │                │                    │
  │ Confirma cobro │                    │
  │───────────────>│ GET (CSRF token)   │
  │                │───────────────────>│
  │                │<── x-csrf-token ───│
  │                │                    │
  │                │ POST PaymentSet    │
  │                │   BLART=W (Rec.)   │
  │                │   medio=Efectivo   │
  │                │───────────────────>│ Genera doc. clase W
  │                │<───────────────────│ {BELNR: "1500012345"}
  │<───────────────│ "Cobro registrado" │
```

---

## 6. Seguridad

### 6.1 Autenticación
```
Browser → HTTPS → VPN Cooprinsem → SAP Gateway → SAP S/4HANA
          Authorization: Basic <base64(user:pass)>
          x-csrf-token: <token>  (en operaciones de escritura)
```
- Credenciales del usuario SAP (mismas que WebDynpro actual)
- No almacenar en `localStorage` — usar `sessionStorage` o estado React en memoria
- CSRF token: obtener en cada sesión con GET + header `x-csrf-token: fetch`

### 6.2 Autorización
- Roles definidos en SAP Authorization Objects
- Frontend consulta rol del usuario al login → habilita/deshabilita módulos
- **Regla:** El frontend no es la última línea de seguridad — SAP rechaza operaciones no autorizadas en cada request

### 6.3 Timeout de Sesión
- Sugerido: 30 minutos de inactividad
- Frontend detecta error 401 → redirige a `/login` con mensaje

---

## 7. Evolución a Fase 2 (Offline-First)

### 7.1 Arquitectura Futura
```
┌─────────────────────────────────────┐
│      Electron / Capacitor           │
│  ┌───────────────────────────────┐  │
│  │    React SPA (mismo código)   │  │
│  └───────────────┬───────────────┘  │
│  ┌───────────────▼───────────────┐  │
│  │    Service Layer Abstraction  │  │
│  │  ┌──────────┐ ┌─────────────┐ │  │
│  │  │  SQLite  │ │ Sync Engine │ │  │
│  │  │ (local)  │ │ (background)│ │  │
│  │  └──────────┘ └──────┬──────┘ │  │
│  └─────────────────────┼─────────┘  │
└────────────────────────┼────────────┘
                         │ cuando hay VPN
                         ▼
                   SAP S/4HANA
```

### 7.2 Preparaciones en Fase 1 para Facilitar Fase 2
- **Capa de servicios abstraída:** `src/services/api/*.ts` apuntan a SAP o a SQLite según entorno
- **Sin `window`/`document` directo en lógica:** Compatibilidad con Electron
- **Tipos compartidos:** Las interfaces `IArticulo`, `ICliente`, etc. se reusan
- **Zustand listo:** Fácil de persistir en SQLite cuando se migre desde Context
- **Offline detection hook:** Preparar `useConnectivity.ts` aunque no se use en Fase 1

### 7.3 Tecnologías Fase 2
| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Desktop Windows | Electron | .exe con acceso a SQLite y filesystem |
| Mobile Android | Capacitor | APK nativo para Chrome en tablets |
| BD Local | SQLite | BD embebida robusta para operación offline |
| SQLite en Electron | better-sqlite3 | Síncrono, sin overhead async |
| SQLite en Android | @capacitor-community/sqlite | Integración nativa Capacitor |
| Sync Engine | Custom | Batch sync background con SAP |
