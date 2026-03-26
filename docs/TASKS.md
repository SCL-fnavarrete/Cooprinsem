# TASKS.md — Plan de Construcción POC

## Alcance del POC
- **Venta Mesón:** Crear pedido con grilla de artículos, grabar en SAP vía OData
- **Caja Pago Efectivo:** Buscar cliente → ver partidas abiertas → seleccionar → cobrar en efectivo → registrar clase W en SAP

**NO incluido en POC:** Modo offline, Transbank, SII, otros métodos de pago (cheques, pagaré, tarjetas), apertura/cierre caja, egresos, anticipos, arqueo, intereses por mora, multi-caja.

---

## Convención de Estado de Tareas
- `[ ]` = Pendiente
- `[x]` = Completado
- `[~]` = En progreso

---

## Sprint 0-B — Backend POC (Node.js + PostgreSQL)
Prerrequisito: tener PostgreSQL instalado localmente (puerto 5432, usuario postgres)

### T-B01: Scaffold backend
- [x] Crear carpeta server/ en la raíz del proyecto
- [x] npm init dentro de server/
- [x] Instalar: express, prisma, @prisma/client, cors, dotenv, typescript, ts-node
- [x] Instalar dev: @types/express, @types/node, nodemon
- [x] Crear server/tsconfig.json con strict: true
- [x] Crear server/.env con DATABASE_URL y PORT=3001

### T-B02: Schema Prisma (modelos que simulan SAP)
- [x] server/prisma/schema.prisma con modelos:
  - Cliente (KUNNR, NAME1, STCD1/rut, condicion_pago, estado_credito, credito_asignado, credito_utilizado)
  - Material (MATNR, MAKTX, precio_unitario, unidad_medida, bloqueado)
  - Stock (material_id, centro, almacen, cantidad)
  - PartidaAbierta (BELNR, KUNNR, fecha_doc, fecha_venc, importe, estado)
  - PedidoVenta (VBELN, KUNNR, fecha, tipo_doc, canal, estado, total)
  - PedidoPosicion (pedido_id, MATNR, cantidad, precio_unitario, subtotal)
  - Cobro (BELNR, KUNNR, fecha, monto, medio_pago, clase_doc)

### T-B03: Seed con datos sintéticos
- [x] server/prisma/seed.ts con datos realistas:
  - 10 clientes (nombres chilenos, RUTs válidos, estados crédito variados)
  - 50 artículos de ferretería/insumos agrícolas con precios en CLP
  - Stock por centro (B000, B001, B002, G000) para cada artículo
  - 15 partidas abiertas con diferentes estados y fechas de vencimiento

### T-B04: Endpoints Express (imitan estructura OData SAP)
- [x] GET /api/clientes?search= → buscar clientes (case-insensitive, priorizar sucursal)
- [x] GET /api/clientes/:kunnr → cliente por código + estado crédito
- [x] GET /api/materiales?search=&centro= → buscar materiales (excluir bloqueados, ordenar por stock)
- [x] GET /api/stock/:matnr → stock por centro/almacén
- [x] GET /api/partidas/:kunnr → partidas abiertas del cliente
- [x] POST /api/pedidos → crear pedido → retorna { vbeln }
- [x] POST /api/cobros → registrar cobro efectivo → retorna { belnr }

### T-B05: Actualizar frontend para usar backend POC
- [x] Actualizar src/services/api/* para apuntar a localhost:3001 en vez de SAP OData
- [x] Actualizar .env.example con VITE_API_BASE_URL=http://localhost:3001
- [x] MSW se mantiene para tests unitarios, pero el dev server usa el backend real

---

## Sprint 0 — Setup del Proyecto (1-2 días)

### T-001: Inicializar proyecto React + Vite + TypeScript
- [x] `npm create vite@latest cooprinsem-pos -- --template react-ts`
- [x] Configurar `tsconfig.json` con `strict: true` y `paths` para aliases
- [x] Configurar path aliases en `vite.config.ts` (`@/` → `./src/`)
- [x] Instalar dependencias UI:
  ```bash
  npm install @ui5/webcomponents-react @ui5/webcomponents @ui5/webcomponents-fiori
  npm install react-router-dom
  ```
- [x] Crear estructura de carpetas completa según ARCHITECTURE.md
- [x] Configurar ESLint + Prettier
- [x] Crear `src/config/sap.ts` con constantes:
  ```typescript
  export const SAP_SOCIEDAD = 'COOP';
  export const CLIENTE_BOLETA = '999999';
  export const ALMACENES = ['B000', 'B001', 'B002', 'G000'] as const;
  export const CLASE_DOC_VENTA = 'ZPOS';
  export const CANALES_DISTRIBUCION = ['Venta Mesón', 'Venta Industrial'] as const;
  export const TIPOS_DOCUMENTO_VENTA = ['Venta Normal', 'Venta Boleta', 'V. Puesto Fundo', 'V. Calzada', 'Venta Anticipada'] as const;
  ```

### T-002: Configurar Testing
- [x] Instalar:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
  ```
- [x] Crear `vitest.config.ts` con environment jsdom y aliases
- [x] Crear `src/test/setup.ts` con MSW lifecycle hooks
- [x] Crear primer test smoke: `src/App.test.tsx` que verifica que el componente App renderiza
- [x] Verificar que `npm run test` pasa ✅

### T-003: Configurar SAP Cloud SDK + OData Client
- [x] Instalar:
  ```bash
  npm install @sap-cloud-sdk/odata-v2
  # o v4 según lo que confirme el equipo ABAP
  ```
- [x] Crear `src/services/odata/client.ts`:
  - Configurar `baseUrl` desde `VITE_SAP_ODATA_BASE_URL`
  - Header `sap-client` con `VITE_SAP_CLIENT`
  - Header `$format=json` por defecto
- [x] Crear `src/services/odata/auth.ts`:
  - Helper de Basic Auth (base64 de usuario:contraseña)
  - Handler de CSRF token (fetch + almacenamiento en memoria de sesión)
- [x] Crear `src/services/odata/errorHandler.ts`:
  - Mapear códigos de error SAP a mensajes en español
  - Error 401 → "Sesión expirada, ingrese nuevamente"
  - Error 500 → "Error en SAP, contacte al administrador"
  - Timeout → "SAP no responde, verifique la conexión VPN"
- [x] Crear `.env.development`, `.env.production`, `.env.example`

### T-004: Layout Base y Routing
- [x] Crear `src/layouts/MainLayout.tsx` con:
  - `ShellBar` (UI5) con: logo, título "Cooprinsem POS", nombre de usuario, sucursal activa (ej: D190)
  - Navegación lateral con 2 ítems activos: Pedidos, Caja
- [x] Configurar React Router en `src/routes/index.tsx`:
  - `/login` → LoginPage
  - `/pedidos` → PedidoPage (protegida: Rol 1 y 2)
  - `/caja` → CajaPage (protegida: Rol 1 y 3)
  - `/` → redirect a `/pedidos` si autenticado, `/login` si no
- [x] Crear `src/features/auth/LoginPage.tsx`:
  - Campos: usuario SAP, contraseña
  - Llama a SAP para validar credenciales
  - Guarda usuario y rol en Context
  - Redirige según rol
- [x] Crear `src/features/auth/ProtectedRoute.tsx`:
  - Valida sesión activa
  - Valida que el rol tenga acceso a la ruta

---

## Sprint 1 — Tipos, Mock Data y Servicios (2-3 días)

### T-005: Definir Tipos TypeScript
- [x] `src/types/sap.ts` — tipos crudos SAP con comentarios explicativos:
  ```typescript
  export type MATNR = string;  // Número de material SAP (18 chars)
  export type KUNNR = string;  // Número de cliente SAP (10 chars)
  export type VBELN = string;  // Número de documento de venta SAP (10 chars)
  export type BELNR = string;  // Número de documento contable SAP (10 chars)
  export type WERKS = string;  // Centro SAP (ej: D190)
  export type LGORT = string;  // Almacén SAP (B000, B001, B002, G000)
  export type BLART = string;  // Clase de documento (W, DZ, ZPOS...)
  ```
- [x] `src/types/articulo.ts` — IArticulo, IArticuloBusqueda (con campos de la grilla del pedido)
- [x] `src/types/cliente.ts` — ICliente, IClienteBusqueda (con RUT, condición pago)
- [x] `src/types/pedido.ts` — IPedidoHeader, ILineaPedido, IPedido, ITotalesPedido
- [x] `src/types/factura.ts` — IPartidaAbierta (con semáforo, días mora, clase doc)
- [x] `src/types/caja.ts` — IPagoEfectivo, IResultadoCobro (BELNR clase W)
- [x] `src/types/credito.ts` — IEstadoCredito (creditoAsignado, creditoUtilizado, porcentajeAgotamiento, estado: 'BLOQUEADO' | 'AL_DIA' | 'CON_DEUDA')
- [x] `src/types/common.ts` — IUsuario (con Rol_Cod 1-4), IApiResponse<T>

### T-006: Crear Datos Mock Realistas
- [x] `src/services/mock/data/materiales.json` — 30 artículos:
  - Productos típicos de ferretería chilena (clavos, tornillos, pinturas, herramientas)
  - Productos agro (fertilizantes, semillas, herbicidas)
  - Precios en CLP sin decimales (ej: 5990, 12500, 189000)
  - Stocks variados por almacén (B000, B001, B002, G000)
  - Unidades de medida: UN, KG, MT, L, GL, SA
- [x] `src/services/mock/data/clientes.json` — 10 clientes:
  - RUTs chilenos válidos (con dígito verificador correcto)
  - Mix: clientes contado, crédito, con/sin límite de crédito
  - Incluir Cliente Boleta (código `999999`, sin RUT)
  - Sucursales D190, D052, D014
- [x] `src/services/mock/data/facturas.json` — 15 partidas abiertas:
  - Mix de: vigentes, próximas a vencer, vencidas 1-30 días, vencidas +30 días
  - Clases de documento: FV (factura venta), NC (nota crédito), etc.
  - Montos variados en CLP (desde $50.000 hasta $5.000.000)

### T-007: Crear MSW Handlers OData
- [x] `src/services/mock/browser.ts` — setup para navegador
- [x] `src/services/mock/server.ts` — setup para Node.js (tests)
- [x] `src/services/mock/handlers.ts`:
  ```
  GET  /CustomerSet?$filter=...         → búsqueda clientes (case-insensitive en mock)
  GET  /CustomerSet('KUNNR')            → cliente por código
  GET  /CreditStatusSet?$filter=KUNNR  → estado crediticio del cliente (nuevo — confirmar con ABAP)
  GET  /MaterialSet?$filter=...         → búsqueda materiales (excluir LVORM bloqueados)
  GET  /MaterialSet('MATNR')            → material por código
  GET  /OpenItemSet?$filter=KUNNR eq .. → partidas abiertas por cliente (FBL5N)
  GET  /StockSet?$filter=MATNR,WERKS... → stock por centro/almacén
  POST /SalesOrderSet                   → crear pedido → retorna VBELN
  POST /PaymentSet                      → registrar cobro efectivo → retorna BELNR clase W
  GET  /                                → CSRF token (x-csrf-token: fetch)
  ```
- [x] Activar/desactivar con flag `VITE_USE_MOCK`

### T-008: Capa de Servicios API
- [x] `src/services/api/clientes.ts`:
  - `buscarClientes(query: string): Promise<IClienteBusqueda[]>`
  - `getCliente(kunnr: string): Promise<ICliente>`
  - `getEstadoCredito(kunnr: string): Promise<IEstadoCredito>` — crédito asignado, utilizado, % agotamiento, estado (⚠️ confirmar con ABAP si existe servicio)
- [x] `src/services/api/materiales.ts`:
  - `buscarMateriales(query: string, centro: string): Promise<IArticuloBusqueda[]>` — excluir bloqueados, ordenar por stock desc
  - `getMaterial(matnr: string): Promise<IArticulo>`
- [x] `src/services/api/pedidos.ts`:
  - `crearPedido(pedido: IPedido): Promise<{ vbeln: string }>`
- [x] `src/services/api/facturas.ts`:
  - `getPartidasAbiertas(kunnr: string): Promise<IPartidaAbierta[]>`
- [x] `src/services/api/cobros.ts`:
  - `registrarCobroEfectivo(cobro: IPagoEfectivo): Promise<{ belnr: string }>`
- [x] `src/services/api/stock.ts`:
  - `getStockPorCentro(matnr: string): Promise<Record<string, number>>`
- [x] Tests unitarios para cada servicio (con MSW)

### T-009: Fábricas de Datos para Tests
- [x] `src/test/factories/articulo.factory.ts`
- [x] `src/test/factories/cliente.factory.ts` (incluir `CLIENTE_BOLETA_MOCK`)
- [x] `src/test/factories/factura.factory.ts` (incluir `crearFacturaVencidaMock()`)
- [x] `src/test/helpers.tsx` con `renderWithProviders()` (BrowserRouter + UI5 ThemeProvider + UserContext)

---

## Sprint 2 — Módulo Pedidos (Venta Mesón) (3-4 días)

### T-010: Componente Búsqueda de Cliente
- [x] `src/components/pos/ClienteSearch.tsx`:
  - UI5 Input con sugerencias (SuggestionItem)
  - Búsqueda por RUT (acepta formato con/sin puntos y guión), nombre, o código SAP
  - **Case-insensitive:** La búsqueda debe ignorar mayúsculas/minúsculas
  - **Prioridad por sucursal:** Resultados de la sucursal actual primero, resto después con separador visual
  - Validación de RUT chileno (módulo 11) con mensaje de error
  - Acceso rápido: botón/opción "Cliente Boleta" (carga código `999999` directamente)
  - Mostrar en selección: código, nombre, RUT, condición de pago
  - **Panel de crédito al seleccionar cliente:**
    - Estado: badge `BLOQUEADO` (rojo) / `AL DÍA` (verde) / `CON DEUDA` (amarillo)
    - Crédito Asignado: monto en CLP
    - Crédito Utilizado: monto en CLP
    - % Agotamiento: barra de progreso visual
    - Si `BLOQUEADO`: mostrar advertencia prominente (⚠️ no bloquear el flujo, solo advertir)
  - Limpiar selección con botón X
- [x] Tests: búsqueda por nombre, búsqueda por RUT, RUT inválido, Cliente Boleta, cliente bloqueado muestra advertencia

### T-011: Componente Búsqueda de Artículos
- [x] `src/components/pos/ArticuloSearch.tsx`:
  - UI5 Input con sugerencias
  - Búsqueda por código material, descripción, o código de barras
  - **Sin asteriscos:** Búsqueda parcial automática (no requerir `*` al inicio ni al final)
  - **Case-insensitive:** Ignorar mayúsculas/minúsculas
  - **Resultados ordenados por stock descendente** (primero los que tienen más stock en la sucursal actual)
  - **Ocultar materiales bloqueados o marcados "NO USAR"** en SAP (flag MARA-LVORM o equivalente — confirmar con ABAP)
  - Mostrar en sugerencias: código, descripción, precio, stock, UM
  - Al seleccionar → dispara callback `onArticuloSeleccionado(articulo)`
  - Limpia el input tras selección (listo para buscar el siguiente)
- [x] Tests: búsqueda, selección, artículo no encontrado, limpiar tras selección, orden por stock

### T-012: Grilla de Artículos del Pedido
- [x] `src/components/pos/ArticuloGrid.tsx`:
  - UI5 Table con columnas: Pos, Material, Descripción, Cantidad, UM, Precio, Subtotal, Acciones
  - Editar cantidad inline (Input numérico, min=1)
  - Eliminar línea con confirmación
  - Posiciones auto-numeradas (10, 20, 30...)
  - Row destacada si la cantidad supera el stock disponible (warning visual)
  - Mensajes vacíos: "Busque y agregue artículos al pedido"
- [x] Tests: agregar línea, editar cantidad, eliminar, numeración posiciones, estado vacío

### T-013: Cabecera del Pedido
- [x] `src/components/pos/PedidoHeader.tsx`:
  - UI5 Form con campos de cabecera
  - Canal Distribución: Select (Venta Mesón / Venta Industrial) — default Venta Mesón
  - Tipo Documento: Select (Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada)
  - **Al cambiar Tipo Documento: NO borrar la grilla de artículos ya cargada.** Solo actualizar cabecera.
  - Referencia (O.C. Cliente): Input texto libre
  - Campos display (solo lectura): Org. Ventas, Canal, Sector, Centro, Almacén
  - `ClienteSearch` embebido para selección del cliente (incluye panel de crédito)
- [x] Tests: cambio de canal, **cambio de tipo documento no borra artículos**, selección tipo documento, campos requeridos

### T-014: Panel de Totales y Stock
- [x] `src/components/pos/PedidoTotals.tsx`:
  - Sección Stock: tabla con almacenes B000, B001, B002, G000 y disponibilidad del artículo seleccionado
  - Sección Totales: Subtotal, IVA (19%), Total — formateados en CLP (`$1.234.567`)
  - Observaciones de Factura: Input texto libre
  - Botones: Grabar (F9), Limpiar (con confirm dialog)
  - Botón Grabar: disabled si no hay cliente o no hay artículos
  - Loading state durante el POST a SAP
  - Mensaje éxito: "Pedido N° XXXXXXXXXX creado correctamente"
- [x] Tests: formateo CLP, botón grabar deshabilitado sin datos, mensaje de éxito

### T-015: Hook usePedido + Página completa
- [x] `src/features/pedidos/usePedido.ts`:
  ```typescript
  interface UsePedidoReturn {
    pedido: IPedido;
    agregarArticulo: (articulo: IArticulo) => void;
    actualizarCantidad: (posicion: string, cantidad: number) => void;
    eliminarLinea: (posicion: string) => void;
    limpiar: () => void;
    grabar: () => Promise<string>;  // retorna VBELN
    isGrabando: boolean;
    error: string | null;
    subtotal: number;
    totalIVA: number;
    total: number;
  }
  ```
- [x] `src/features/pedidos/PedidoPage.tsx`:
  - Composición: PedidoHeader + ArticuloSearch + ArticuloGrid + PedidoTotals
  - Layout responsive: 2 columnas en desktop, 1 columna en tablet
- [x] Validaciones en `pedidoValidation.ts`:
  - ¿Hay cliente seleccionado?
  - ¿Hay al menos 1 artículo?
  - ¿Todas las cantidades son > 0?
- [x] **Test integración:** Flujo completo crear pedido (con MSW mock)
- [x] Tests del hook: calcular totales, agregar/eliminar líneas, reset

---

## Sprint 3 — Módulo Caja (Pago Efectivo) (3-4 días)

### T-016: Grilla de Partidas Abiertas
- [x] `src/components/pos/CajaFacturaList.tsx`:
  - UI5 Table con selección múltiple (checkbox)
  - Columnas: Semáforo, Nº Doc, Clase, Fecha, Vencimiento, Días Mora, Importe
  - Semáforo de estado:
    - 🟢 Verde: vigente (días mora = 0)
    - 🟡 Amarillo: vence en próximos 7 días
    - 🔴 Rojo: vencida (días mora > 0)
  - Highlight visual en filas vencidas (+30 días → rojo oscuro)
  - Total seleccionado se actualiza dinámicamente al checkear/descheckear
  - Estado vacío: "El cliente no tiene documentos pendientes"
- [x] Tests: cargar partidas, selección, cálculo total seleccionado, semáforo, estado vacío

### T-017: Modal Pago con Efectivo
- [x] `src/components/pos/PagoEfectivo.tsx`:
  - UI5 Dialog
  - Sección resumen: cliente, documentos seleccionados, total a cobrar
  - Input "Monto Recibido" con autofoco al abrir
  - Cálculo automático en tiempo real: Vuelto = Recibido - A Cobrar
  - Vuelto en verde si ≥ 0, en rojo si < 0 (no debe poder confirmar con vuelto negativo)
  - Validación: recibido debe ser ≥ total a cobrar
  - Botón "Confirmar Cobro" → POST PaymentSet a SAP
  - Botón "Cancelar" → cierra dialog sin registrar
  - Loading state durante POST
  - En éxito: mostrar BELNR del documento clase W generado
- [x] Tests: cálculo vuelto, validación monto insuficiente, loading, éxito, cancelar

### T-018: Hook useCaja + Página completa Caja
- [x] `src/features/caja/useCaja.ts`:
  ```typescript
  interface UseCajaReturn {
    clienteSeleccionado: ICliente | null;
    seleccionarCliente: (cliente: ICliente) => void;
    partidas: IPartidaAbierta[];
    isLoadingPartidas: boolean;
    errorPartidas: string | null;
    partidasSeleccionadas: string[];  // BELNRs
    togglePartida: (belnr: string) => void;
    totalSeleccionado: number;
    confirmarCobroEfectivo: (montoRecibido: number) => Promise<string>;  // retorna BELNR
    isCobrando: boolean;
    errorCobro: string | null;
  }
  ```
- [x] `src/features/caja/CajaPage.tsx`:
  - Menú lateral con los 8 botones del módulo de Caja
  - Solo "Pago Cta. Cte." activo en POC — resto con badge "Próximamente" y disabled
  - Botón "Salir de la Caja" activo (hace logout)
- [x] `src/features/caja/PagoCtaCte.tsx`:
  - ClienteSearch → al seleccionar carga partidas abiertas automáticamente
  - CajaFacturaList → selección de facturas
  - Botón "Cobrar en Efectivo" → abre PagoEfectivo Dialog
  - Tras cobro exitoso: mostrar comprobante y limpiar estado
- [x] **Test integración:** Flujo completo cobro efectivo (con MSW mock)

---

## Sprint 4 — Pulido y Entrega POC (2-3 días)

### T-019: Utilidades Core
- [x] `src/utils/format.ts`:
  - `formatCLP(monto: number): string` → `"$1.234.567"` (punto como miles, sin decimales)
  - `formatRUT(rut: string): string` → `"12.345.678-9"` o `"12.345.678-K"`
  - `formatFecha(fechaSAP: string): string` → `"25/03/2025"` (de YYYYMMDD a DD/MM/YYYY)
  - `formatFechaSAP(fecha: Date): string` → de Date a YYYYMMDD para enviar a SAP
- [x] `src/utils/validations.ts`:
  - `validarRUT(rut: string): boolean` — módulo 11
  - `limpiarRUT(rut: string): string` — eliminar puntos y guión
- [x] Tests exhaustivos para todas las funciones de formato y validación

### T-020: Atajos de Teclado
- [x] `F2` — Foco en búsqueda de artículo (módulo Pedidos)
- [x] `F4` — Foco en búsqueda de cliente (ambos módulos)
- [x] `F9` — Grabar pedido / Confirmar cobro
- [x] `Escape` — Cerrar modal / Cancelar acción
- [x] `Tab` — Navegación entre campos de la grilla de artículos

### T-021: Manejo de Errores y UX
- [x] `src/components/common/ErrorBoundary.tsx` — captura errores React no manejados
- [x] Banner "Sin conexión a SAP" cuando el VPN cae (detección por error de red)
- [x] Reintentos automáticos en llamadas OData (máximo 3 reintentos con backoff)
- [x] Error 401 → limpiar sesión y redirigir a `/login` con mensaje
- [x] Errores SAP → mostrar mensaje amigable en español (no exponer mensaje técnico crudo)
- [x] Loading states en todos los componentes que hacen llamadas OData

### T-022: Comprobante de Cobro
- [x] Pantalla de resumen post-cobro exitoso:
  - N° documento SAP (BELNR clase W)
  - Cliente, RUT, fecha
  - Documentos cancelados (con sus números)
  - Monto cobrado, vuelto entregado
  - Botón "Imprimir" (`window.print()` con estilos de impresión)
  - Botón "Nuevo Cobro" (reset para siguiente cliente)

### T-023: README y Documentación Técnica POC
- [x] `README.md`:
  - Prerrequisitos (Node 20+, npm)
  - Setup en 3 comandos: `git clone`, `npm install`, `npm run dev`
  - Explicación de variables de entorno
  - Cómo activar/desactivar mocks MSW
  - Cómo conectar a SAP real
  - Estructura del proyecto (referencia a ARCHITECTURE.md)
- [x] `.env.example` con todas las variables documentadas
- [x] Credenciales de demo para probar la app (usuario mock en MSW)
- [x] Documentar en README.md cómo instalar PostgreSQL, crear la BD y ejecutar el seed

---

## Sprint 5 — Módulos Caja Adicionales (Post-POC inicial)

### T-024: List. Pagarés (solo lectura)
- [x] `src/types/pagare.ts` — IPagare
- [x] `src/services/api/pagares.ts` — getPagares()
- [x] `src/features/caja/ListPagaresPanel.tsx` — tabla 7 columnas, auto-fetch, reload, print, empty state
- [x] `src/features/caja/ListPagaresPanel.test.tsx` — 7 specs
- [x] `server/src/routes/pagares.ts` — GET /api/pagares (mock 8 pagarés)
- [x] Handler MSW en `src/services/mock/handlers.ts`
- [x] Ruta registrada en `server/src/index.ts`

### T-025: Ant. Cliente (Anticipos)
- [x] `src/types/anticipo.ts` — IAnticipo, IBuscarAnticipoRequest
- [x] `src/services/api/anticipos.ts` — buscarAnticipo() POST
- [x] `src/features/caja/AntClientePanel.tsx` — flujo 3 estados (búsqueda → confirmación → comprobante)
- [x] `src/features/caja/AntClientePanel.test.tsx` — 7 specs
- [x] `server/src/routes/anticipos.ts` — POST /api/anticipos/buscar (mock 2 anticipos)
- [x] Handler MSW en `src/services/mock/handlers.ts`
- [x] Ruta registrada en `server/src/index.ts`

### T-026: Arqueo Caja (dual-rol: Cajero + Jefe Admin)
- [x] `src/types/arqueo.ts` — IArqueoCaja, IArqueoDetalle, ICierreCaja, ICierreDetalle, TipoPagoCodigo, TIPOS_PAGO
- [x] `src/services/api/arqueo.ts` — grabarArqueo(), getArqueoDelDia(), ejecutarCierre()
- [x] `src/features/caja/ArqueoCajaPanel.tsx` — UI cajero (agregar pagos → grabar) + UI admin (consultar → comparativa → cierre)
- [x] `src/features/caja/ArqueoCajaPanel.test.tsx` — 16 specs
- [x] `server/src/routes/arqueo.ts` — POST /grabar, GET /dia, POST /cierre
- [x] Handlers MSW en `src/services/mock/handlers.ts`
- [x] Ruta registrada en `server/src/index.ts`

### T-027: Actualizar CajaPage — habilitar botones nuevos
- [x] CajaPage.tsx actualizado: 5 botones habilitados (Pago Cta. Cte., List. Pagarés, Ant. Cliente, Arqueo Caja, Salir)
- [x] 3 botones aún deshabilitados (Egr. de Caja, E° de Cuenta, Consulta Pago)
- [x] Tests actualizados en CajaPage.test.tsx

### T-028: Mock data en factories.ts
- [x] PAGARES_MOCK — 8 pagarés (4 clientes, cuotas variadas)
- [x] ANTICIPOS_MOCK — 2 anticipos (clase DZ, estado PENDIENTE)
- [x] crearArqueoMock(), crearArqueoDetalleMock(), crearCierreMock() — factories de arqueo/cierre

### T-029: Fix logo ShellBar
- [x] Clic en logo Cooprinsem navega a /pedidos (antes no tenía acción)

### T-030: Panel Administración (protegido rol 1)
- [x] `src/types/admin.ts` — IUsuarioAdmin, IRol, ISucursal
- [x] `src/services/api/admin.ts` — getUsuarios(), crearUsuario(), editarUsuario(), eliminarUsuario(), getRoles(), getSucursales()
- [x] `src/features/admin/AdminPage.tsx` — 3 tabs (Usuarios CRUD, Roles lectura, Sucursales lectura)
- [x] `src/features/admin/AdminPage.test.tsx` — tests del panel
- [x] `server/src/routes/admin.ts` — endpoints CRUD usuarios + GET roles + GET sucursales
- [x] Handlers MSW en `src/services/mock/handlers.ts`
- [x] Ruta registrada en `server/src/index.ts`

### T-031: Ítem Administración en menú principal
- [x] MainLayout.tsx — ítem "Administración" visible solo para rol 1
- [x] routes/index.tsx — ruta /admin protegida para rol 1
- [x] MainLayout.test.tsx — tests de visibilidad condicional

---

## Sprint 6 — HomePage + PedidoListPage + PedidoDetallePage + Mejoras Caja

### T-032: HomePage con tiles Fiori por rol
- [x] `src/features/home/HomePage.tsx` — tiles Pedidos, Caja según rol
- [x] Auto-redirección genérica: si 1 sola tile → navega directo (Rol 1→/pedidos, Rol 2→/caja, Rol 3→/pedidos)
- [x] Todos los roles tienen 1 tile → auto-redirigen siempre
- [x] `src/features/home/HomePage.test.tsx` — 6 tests (tiles por rol, auto-redirección, sucursal)
- [x] Ruta `/home` protegida para todos los roles
- [x] Logo ShellBar navega a `/home` (antes era `/pedidos`)
- [x] RootRedirect `/` → `/home`

### T-033: PedidoListPage — listado de pedidos con filtros
- [x] `src/types/pedido.ts` — IFiltroPedidos, IPedidoListItem
- [x] `src/services/api/pedidos.ts` — getPedidos(filtros)
- [x] `src/features/pedidos/PedidoListPage.tsx` — tabla con filtros (desde, hasta, estado), botón Nuevo Pedido condicional
- [x] `src/features/pedidos/PedidoListPage.test.tsx` — 7 tests (carga, CLP, nuevo pedido por rol, estado vacío)
- [x] Handler MSW GET `/api/pedidos`
- [x] Ruta Express GET `/api/pedidos` en server/
- [x] Mock data: PEDIDOS_LIST_MOCK (5 pedidos)
- [x] `/pedidos` → PedidoListPage, `/pedidos/nuevo` → PedidoPage (formulario existente)
- [x] Rol 4 (Consultas) ve listado sin botón "Nuevo Pedido"

### T-034: Cliente Boleta en Caja + panel info usuario
- [x] 3 partidas mock para kunnr `999999` en PARTIDAS_MOCK (2 vigentes + 1 vencida)
- [x] Panel info sesión en CajaPage (Usuario, Sucursal, Sociedad COOP)
- [x] "Salir de la Caja" navega a `/home` (antes `/pedidos`)
- [x] Tests panel info sesión en CajaPage.test.tsx (3 tests)
- [x] `renderWithProviders` acepta `user` opcional para tests con roles específicos
- [x] MainLayout.test.tsx actualizado (logo → /home)

---

## Sprint 7 — Mejoras Caja + Pedidos (feedback cliente)

### T-035: Ordenar partidas por fecha documento DESC
- [x] `server/src/routes/partidas.ts` — cambiar `orderBy: { fecha_venc: 'asc' }` → `{ fecha_doc: 'desc' }`
- [x] Ambos handlers (GET `/` y GET `/:kunnr`) actualizados

### T-036: Estado como texto en tabla de Caja
- [x] `src/components/pos/CajaFacturaList.tsx` — `SemaforoIcon` → `SemaforoLabel` con icono + texto (Vigente/Por vencer/Vencida/Pagada)
- [x] `src/features/caja/PagoDetallePage.tsx` — mismo cambio
- [x] Leyenda actualizada con 4 estados

### T-037: Filtros de estado en Caja
- [x] `src/hooks/useCaja.ts` — `filtroEstado` (Semaforo | '') + filtro en useMemo
- [x] `src/features/caja/CajaPage.tsx` — Select con opciones: Todos, Vigente, Por vencer, Vencida, Pagada
- [x] Recarga automática de partidas al cambiar filtro a/desde "Pagada" (requiere `?incluirPagadas=true`)

### T-038: Nombre del cliente en listado de pedidos
- [x] `server/src/routes/pedidos.ts` (GET `/`) — batch JOIN con tabla `clientes` para popular `nombreCliente`
- [x] Antes retornaba `nombreCliente: ''` (vacío)

### T-039: Campo "Ubicación Predio" en formulario de pedido
- [x] `server/prisma/schema.prisma` — +`observaciones` (VarChar 500) + `ubicacion_predio` (VarChar 1000) en PedidoVenta
- [x] `src/types/pedido.ts` — +`ubicacionPredio` en IPedidoHeader e IPedidoDetalle
- [x] `src/components/pos/PedidoTotals.tsx` — Input "Ubicación Predio" debajo de Observaciones
- [x] `src/services/api/pedidos.ts` — enviar `observaciones` y `ubicacion_predio` en POST
- [x] `src/hooks/usePedido.ts` — `ubicacionPredio: ''` en HEADER_INICIAL
- [x] `server/src/routes/pedidos.ts` — aceptar y almacenar ambos campos en POST, retornar en GET detalle

### T-040: Navegar a listado tras grabar pedido
- [x] `src/features/pedidos/PedidoPage.tsx` — tras cerrar MessageBox de éxito, `navigate('/pedidos')`
- [x] Antes se quedaba en el formulario y llamaba `limpiar()`

### T-041: Crear partida abierta al crear pedido
- [x] `server/src/routes/pedidos.ts` (POST `/`) — al crear pedido, también crea PartidaAbierta en transacción atómica
- [x] Importe = total + IVA 19%, fecha_venc según condición de pago del cliente (CONT=hoy, 30D=+30, 60D=+60)
- [x] `server/prisma/schema.prisma` — +`vbeln` (VarChar 10, nullable) en PartidaAbierta para vincular con pedido origen

### T-042: Pedido cambia a "Procesado" al cobrar
- [x] `server/src/routes/cobros.ts` — al marcar partidas como PAGADO, busca vbeln vinculado y actualiza pedido a "Procesado"
- [x] Antes el pedido quedaba como "Creado" para siempre

### T-043: Ver partidas pagadas en Caja
- [x] `server/src/routes/partidas.ts` — query param `?incluirPagadas=true` para incluir partidas con estado PAGADO
- [x] `src/services/api/facturas.ts` — parámetro `incluirPagadas` + semáforo `'pagada'` en calcSemaforo
- [x] `src/types/caja.ts` — tipo Semaforo ampliado: `'verde' | 'amarillo' | 'rojo' | 'pagada'`

### T-044: Unificar estados de pedido
- [x] `server/prisma/schema.prisma` — default de `estado` cambiado de `"ACTIVO"` a `"Creado"`
- [x] Catálogo definitivo: Creado, Procesado, Anulado
- [x] Migración SQL: `UPDATE pedidos_venta SET estado = 'Creado' WHERE estado = 'ACTIVO'`

### T-045: Documentación README — Prisma generate
- [x] `README.md` — agregar `npx prisma generate` como paso obligatorio antes de levantar backend
- [x] Sección "Cuando Re-ejecutar Comandos Prisma" con tabla de situaciones
- [x] Error TS2339 documentado en tabla de solución de problemas

---

## Backlog — Post-POC (Fase 1 Completa)

### Prioridad Crítica
- [ ] Otros 6 métodos de pago (pagaré, tarjeta débito, tarjeta crédito, cheque al día, cheque a fecha, vale vista) — con formulario modal de cheque
- [ ] Sobrepago en cheques + registro saldo a favor en cta. cte. cliente
- [ ] Saldo a Favor: panel y aplicación a facturas seleccionadas
- [ ] Apertura y Cierre de Caja
- [x] Arqueo de Caja — implementado en Sprint 5 (T-026)
- [ ] Egresos de Caja (devoluciones por nota de crédito)
- [x] Anticipos de Cliente (F-37, clase DZ) — implementado en Sprint 5 (T-025)
- [ ] Intereses por mora (detectar en partidas vencidas, gatillar doc. SD en SAP)

### Prioridad Alta
- [ ] Impresión de comprobantes (térmica + A4)
- [x] Lista de Pagarés (solo lectura) — implementado en Sprint 5 (T-024)
- [ ] Estado de Cuenta (definir si reemplaza plataforma actual)
- [ ] Consulta Pago (pendiente documentar con Mariela)
- [ ] Datos logísticos completos en pedido (patente, zona transporte, flete)
- [ ] Stock por centro/almacén (B000, B001, B002, G000) en panel pedido

### Prioridad Media
- [ ] Integración Transbank (tarjeta débito/crédito)
- [ ] Modificar/anular pedidos existentes
- [ ] Consultas y reportes
- [x] Panel de administración (mantenedores) — implementado en Sprint 5 (T-030). Nota: ADR-018 intentó eliminar el rol Administrador pero fue revertido.

### Prioridad Baja — Fase 2
- [ ] Modo Offline (Electron + SQLite + sync)
- [ ] App Android (Capacitor)
- [ ] Integración SII (facturación electrónica)
- [ ] Lector de código de barras (USB HID / cámara)
- [ ] Auto-update de la aplicación (18 sucursales)

---

## Estimación de Esfuerzo

| Sprint | Tareas | Duración estimada |
|--------|--------|-------------------|
| Sprint 0 | T-001 a T-004 | 1-2 días |
| Sprint 1 | T-005 a T-009 | 2-3 días |
| Sprint 2 | T-010 a T-015 | 3-4 días |
| Sprint 3 | T-016 a T-018 | 3-4 días |
| Sprint 4 | T-019 a T-023 | 2-3 días |
| Sprint 5 | T-024 a T-031 | 1-2 días |
| Sprint 6 | T-032 a T-034 | 1 día |
| Sprint 7 | T-035 a T-045 | 1 día |
| **Total** | **45 tareas** | **~14-20 días** |

---

## Dependencias Críticas (Bloqueos Potenciales)

| Dependencia | Responsable | Estado |
|-------------|-------------|--------|
| Lista exacta de servicios OData en SAP | Equipo ABAP Cooprinsem | ⚠️ Pendiente |
| Credenciales de desarrollo SAP | Mariela / Basis SAP | ⚠️ Pendiente |
| Confirmación versión OData (v2 vs v4) | Equipo ABAP | ⚠️ Pendiente |
| Parámetros org. ventas/canal/sector/client | Equipo ABAP | ⚠️ Pendiente |
| Nombres exactos de entidades OData | Equipo ABAP | ⚠️ Pendiente |
