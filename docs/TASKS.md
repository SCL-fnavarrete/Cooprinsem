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

## Sprint 0 — Setup del Proyecto (1-2 días)

### T-001: Inicializar proyecto React + Vite + TypeScript
- [ ] `npm create vite@latest cooprinsem-pos -- --template react-ts`
- [ ] Configurar `tsconfig.json` con `strict: true` y `paths` para aliases
- [ ] Configurar path aliases en `vite.config.ts` (`@/` → `./src/`)
- [ ] Instalar dependencias UI:
  ```bash
  npm install @ui5/webcomponents-react @ui5/webcomponents @ui5/webcomponents-fiori
  npm install react-router-dom
  ```
- [ ] Crear estructura de carpetas completa según ARCHITECTURE.md
- [ ] Configurar ESLint + Prettier
- [ ] Crear `src/config/sap.ts` con constantes:
  ```typescript
  export const SAP_SOCIEDAD = 'COOP';
  export const CLIENTE_BOLETA = '999999';
  export const ALMACENES = ['B000', 'B001', 'B002', 'G000'] as const;
  export const CLASE_DOC_VENTA = 'ZPOS';
  export const CANALES_DISTRIBUCION = ['Venta Mesón', 'Venta Industrial'] as const;
  export const TIPOS_DOCUMENTO_VENTA = ['Venta Normal', 'Venta Boleta', 'V. Puesto Fundo', 'V. Calzada', 'Venta Anticipada'] as const;
  ```

### T-002: Configurar Testing
- [ ] Instalar:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
  ```
- [ ] Crear `vitest.config.ts` con environment jsdom y aliases
- [ ] Crear `src/test/setup.ts` con MSW lifecycle hooks
- [ ] Crear primer test smoke: `src/App.test.tsx` que verifica que el componente App renderiza
- [ ] Verificar que `npm run test` pasa ✅

### T-003: Configurar SAP Cloud SDK + OData Client
- [ ] Instalar:
  ```bash
  npm install @sap-cloud-sdk/odata-v2
  # o v4 según lo que confirme el equipo ABAP
  ```
- [ ] Crear `src/services/odata/client.ts`:
  - Configurar `baseUrl` desde `VITE_SAP_ODATA_BASE_URL`
  - Header `sap-client` con `VITE_SAP_CLIENT`
  - Header `$format=json` por defecto
- [ ] Crear `src/services/odata/auth.ts`:
  - Helper de Basic Auth (base64 de usuario:contraseña)
  - Handler de CSRF token (fetch + almacenamiento en memoria de sesión)
- [ ] Crear `src/services/odata/errorHandler.ts`:
  - Mapear códigos de error SAP a mensajes en español
  - Error 401 → "Sesión expirada, ingrese nuevamente"
  - Error 500 → "Error en SAP, contacte al administrador"
  - Timeout → "SAP no responde, verifique la conexión VPN"
- [ ] Crear `.env.development`, `.env.production`, `.env.example`

### T-004: Layout Base y Routing
- [ ] Crear `src/layouts/MainLayout.tsx` con:
  - `ShellBar` (UI5) con: logo, título "Cooprinsem POS", nombre de usuario, sucursal activa (ej: D190)
  - Navegación lateral con 2 ítems activos: Pedidos, Caja
- [ ] Configurar React Router en `src/routes/index.tsx`:
  - `/login` → LoginPage
  - `/pedidos` → PedidoPage (protegida: Rol 1 y 2)
  - `/caja` → CajaPage (protegida: Rol 1 y 3)
  - `/` → redirect a `/pedidos` si autenticado, `/login` si no
- [ ] Crear `src/features/auth/LoginPage.tsx`:
  - Campos: usuario SAP, contraseña
  - Llama a SAP para validar credenciales
  - Guarda usuario y rol en Context
  - Redirige según rol
- [ ] Crear `src/features/auth/ProtectedRoute.tsx`:
  - Valida sesión activa
  - Valida que el rol tenga acceso a la ruta

---

## Sprint 1 — Tipos, Mock Data y Servicios (2-3 días)

### T-005: Definir Tipos TypeScript
- [ ] `src/types/sap.ts` — tipos crudos SAP con comentarios explicativos:
  ```typescript
  export type MATNR = string;  // Número de material SAP (18 chars)
  export type KUNNR = string;  // Número de cliente SAP (10 chars)
  export type VBELN = string;  // Número de documento de venta SAP (10 chars)
  export type BELNR = string;  // Número de documento contable SAP (10 chars)
  export type WERKS = string;  // Centro SAP (ej: D190)
  export type LGORT = string;  // Almacén SAP (B000, B001, B002, G000)
  export type BLART = string;  // Clase de documento (W, DZ, ZPOS...)
  ```
- [ ] `src/types/articulo.ts` — IArticulo, IArticuloBusqueda (con campos de la grilla del pedido)
- [ ] `src/types/cliente.ts` — ICliente, IClienteBusqueda (con RUT, condición pago)
- [ ] `src/types/pedido.ts` — IPedidoHeader, ILineaPedido, IPedido, ITotalesPedido
- [ ] `src/types/factura.ts` — IPartidaAbierta (con semáforo, días mora, clase doc)
- [ ] `src/types/caja.ts` — IPagoEfectivo, IResultadoCobro (BELNR clase W)
- [ ] `src/types/credito.ts` — IEstadoCredito (creditoAsignado, creditoUtilizado, porcentajeAgotamiento, estado: 'BLOQUEADO' | 'AL_DIA' | 'CON_DEUDA')
- [ ] `src/types/common.ts` — IUsuario (con Rol_Cod 1-4), IApiResponse<T>

### T-006: Crear Datos Mock Realistas
- [ ] `src/services/mock/data/materiales.json` — 30 artículos:
  - Productos típicos de ferretería chilena (clavos, tornillos, pinturas, herramientas)
  - Productos agro (fertilizantes, semillas, herbicidas)
  - Precios en CLP sin decimales (ej: 5990, 12500, 189000)
  - Stocks variados por almacén (B000, B001, B002, G000)
  - Unidades de medida: UN, KG, MT, L, GL, SA
- [ ] `src/services/mock/data/clientes.json` — 10 clientes:
  - RUTs chilenos válidos (con dígito verificador correcto)
  - Mix: clientes contado, crédito, con/sin límite de crédito
  - Incluir Cliente Boleta (código `999999`, sin RUT)
  - Sucursales D190, D052, D014
- [ ] `src/services/mock/data/facturas.json` — 15 partidas abiertas:
  - Mix de: vigentes, próximas a vencer, vencidas 1-30 días, vencidas +30 días
  - Clases de documento: FV (factura venta), NC (nota crédito), etc.
  - Montos variados en CLP (desde $50.000 hasta $5.000.000)

### T-007: Crear MSW Handlers OData
- [ ] `src/services/mock/browser.ts` — setup para navegador
- [ ] `src/services/mock/server.ts` — setup para Node.js (tests)
- [ ] `src/services/mock/handlers.ts`:
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
- [ ] Activar/desactivar con flag `VITE_USE_MOCK`

### T-008: Capa de Servicios API
- [ ] `src/services/api/clientes.ts`:
  - `buscarClientes(query: string): Promise<IClienteBusqueda[]>`
  - `getCliente(kunnr: string): Promise<ICliente>`
  - `getEstadoCredito(kunnr: string): Promise<IEstadoCredito>` — crédito asignado, utilizado, % agotamiento, estado (⚠️ confirmar con ABAP si existe servicio)
- [ ] `src/services/api/materiales.ts`:
  - `buscarMateriales(query: string, centro: string): Promise<IArticuloBusqueda[]>` — excluir bloqueados, ordenar por stock desc
  - `getMaterial(matnr: string): Promise<IArticulo>`
- [ ] `src/services/api/pedidos.ts`:
  - `crearPedido(pedido: IPedido): Promise<{ vbeln: string }>`
- [ ] `src/services/api/facturas.ts`:
  - `getPartidasAbiertas(kunnr: string): Promise<IPartidaAbierta[]>`
- [ ] `src/services/api/cobros.ts`:
  - `registrarCobroEfectivo(cobro: IPagoEfectivo): Promise<{ belnr: string }>`
- [ ] `src/services/api/stock.ts`:
  - `getStockPorCentro(matnr: string): Promise<Record<string, number>>`
- [ ] Tests unitarios para cada servicio (con MSW)

### T-009: Fábricas de Datos para Tests
- [ ] `src/test/factories/articulo.factory.ts`
- [ ] `src/test/factories/cliente.factory.ts` (incluir `CLIENTE_BOLETA_MOCK`)
- [ ] `src/test/factories/factura.factory.ts` (incluir `crearFacturaVencidaMock()`)
- [ ] `src/test/helpers.tsx` con `renderWithProviders()` (BrowserRouter + UI5 ThemeProvider + UserContext)

---

## Sprint 2 — Módulo Pedidos (Venta Mesón) (3-4 días)

### T-010: Componente Búsqueda de Cliente
- [ ] `src/components/pos/ClienteSearch.tsx`:
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
- [ ] Tests: búsqueda por nombre, búsqueda por RUT, RUT inválido, Cliente Boleta, cliente bloqueado muestra advertencia

### T-011: Componente Búsqueda de Artículos
- [ ] `src/components/pos/ArticuloSearch.tsx`:
  - UI5 Input con sugerencias
  - Búsqueda por código material, descripción, o código de barras
  - **Sin asteriscos:** Búsqueda parcial automática (no requerir `*` al inicio ni al final)
  - **Case-insensitive:** Ignorar mayúsculas/minúsculas
  - **Resultados ordenados por stock descendente** (primero los que tienen más stock en la sucursal actual)
  - **Ocultar materiales bloqueados o marcados "NO USAR"** en SAP (flag MARA-LVORM o equivalente — confirmar con ABAP)
  - Mostrar en sugerencias: código, descripción, precio, stock, UM
  - Al seleccionar → dispara callback `onArticuloSeleccionado(articulo)`
  - Limpia el input tras selección (listo para buscar el siguiente)
- [ ] Tests: búsqueda, selección, artículo no encontrado, limpiar tras selección, orden por stock

### T-012: Grilla de Artículos del Pedido
- [ ] `src/components/pos/ArticuloGrid.tsx`:
  - UI5 Table con columnas: Pos, Material, Descripción, Cantidad, UM, Precio, Subtotal, Acciones
  - Editar cantidad inline (Input numérico, min=1)
  - Eliminar línea con confirmación
  - Posiciones auto-numeradas (10, 20, 30...)
  - Row destacada si la cantidad supera el stock disponible (warning visual)
  - Mensajes vacíos: "Busque y agregue artículos al pedido"
- [ ] Tests: agregar línea, editar cantidad, eliminar, numeración posiciones, estado vacío

### T-013: Cabecera del Pedido
- [ ] `src/components/pos/PedidoHeader.tsx`:
  - UI5 Form con campos de cabecera
  - Canal Distribución: Select (Venta Mesón / Venta Industrial) — default Venta Mesón
  - Tipo Documento: Select (Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada)
  - **Al cambiar Tipo Documento: NO borrar la grilla de artículos ya cargada.** Solo actualizar cabecera.
  - Referencia (O.C. Cliente): Input texto libre
  - Campos display (solo lectura): Org. Ventas, Canal, Sector, Centro, Almacén
  - `ClienteSearch` embebido para selección del cliente (incluye panel de crédito)
- [ ] Tests: cambio de canal, **cambio de tipo documento no borra artículos**, selección tipo documento, campos requeridos

### T-014: Panel de Totales y Stock
- [ ] `src/components/pos/PedidoTotals.tsx`:
  - Sección Stock: tabla con almacenes B000, B001, B002, G000 y disponibilidad del artículo seleccionado
  - Sección Totales: Subtotal, IVA (19%), Total — formateados en CLP (`$1.234.567`)
  - Observaciones de Factura: Input texto libre
  - Botones: Grabar (F9), Limpiar (con confirm dialog)
  - Botón Grabar: disabled si no hay cliente o no hay artículos
  - Loading state durante el POST a SAP
  - Mensaje éxito: "Pedido N° XXXXXXXXXX creado correctamente"
- [ ] Tests: formateo CLP, botón grabar deshabilitado sin datos, mensaje de éxito

### T-015: Hook usePedido + Página completa
- [ ] `src/features/pedidos/usePedido.ts`:
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
- [ ] `src/features/pedidos/PedidoPage.tsx`:
  - Composición: PedidoHeader + ArticuloSearch + ArticuloGrid + PedidoTotals
  - Layout responsive: 2 columnas en desktop, 1 columna en tablet
- [ ] Validaciones en `pedidoValidation.ts`:
  - ¿Hay cliente seleccionado?
  - ¿Hay al menos 1 artículo?
  - ¿Todas las cantidades son > 0?
- [ ] **Test integración:** Flujo completo crear pedido (con MSW mock)
- [ ] Tests del hook: calcular totales, agregar/eliminar líneas, reset

---

## Sprint 3 — Módulo Caja (Pago Efectivo) (3-4 días)

### T-016: Grilla de Partidas Abiertas
- [ ] `src/components/pos/CajaFacturaList.tsx`:
  - UI5 Table con selección múltiple (checkbox)
  - Columnas: Semáforo, Nº Doc, Clase, Fecha, Vencimiento, Días Mora, Importe
  - Semáforo de estado:
    - 🟢 Verde: vigente (días mora = 0)
    - 🟡 Amarillo: vence en próximos 7 días
    - 🔴 Rojo: vencida (días mora > 0)
  - Highlight visual en filas vencidas (+30 días → rojo oscuro)
  - Total seleccionado se actualiza dinámicamente al checkear/descheckear
  - Estado vacío: "El cliente no tiene documentos pendientes"
- [ ] Tests: cargar partidas, selección, cálculo total seleccionado, semáforo, estado vacío

### T-017: Modal Pago con Efectivo
- [ ] `src/components/pos/PagoEfectivo.tsx`:
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
- [ ] Tests: cálculo vuelto, validación monto insuficiente, loading, éxito, cancelar

### T-018: Hook useCaja + Página completa Caja
- [ ] `src/features/caja/useCaja.ts`:
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
- [ ] `src/features/caja/CajaPage.tsx`:
  - Menú lateral con los 8 botones del módulo de Caja
  - Solo "Pago Cta. Cte." activo en POC — resto con badge "Próximamente" y disabled
  - Botón "Salir de la Caja" activo (hace logout)
- [ ] `src/features/caja/PagoCtaCte.tsx`:
  - ClienteSearch → al seleccionar carga partidas abiertas automáticamente
  - CajaFacturaList → selección de facturas
  - Botón "Cobrar en Efectivo" → abre PagoEfectivo Dialog
  - Tras cobro exitoso: mostrar comprobante y limpiar estado
- [ ] **Test integración:** Flujo completo cobro efectivo (con MSW mock)

---

## Sprint 4 — Pulido y Entrega POC (2-3 días)

### T-019: Utilidades Core
- [ ] `src/utils/format.ts`:
  - `formatCLP(monto: number): string` → `"$1.234.567"` (punto como miles, sin decimales)
  - `formatRUT(rut: string): string` → `"12.345.678-9"` o `"12.345.678-K"`
  - `formatFecha(fechaSAP: string): string` → `"25/03/2025"` (de YYYYMMDD a DD/MM/YYYY)
  - `formatFechaSAP(fecha: Date): string` → de Date a YYYYMMDD para enviar a SAP
- [ ] `src/utils/validations.ts`:
  - `validarRUT(rut: string): boolean` — módulo 11
  - `limpiarRUT(rut: string): string` — eliminar puntos y guión
- [ ] Tests exhaustivos para todas las funciones de formato y validación

### T-020: Atajos de Teclado
- [ ] `F2` — Foco en búsqueda de artículo (módulo Pedidos)
- [ ] `F4` — Foco en búsqueda de cliente (ambos módulos)
- [ ] `F9` — Grabar pedido / Confirmar cobro
- [ ] `Escape` — Cerrar modal / Cancelar acción
- [ ] `Tab` — Navegación entre campos de la grilla de artículos

### T-021: Manejo de Errores y UX
- [ ] `src/components/common/ErrorBoundary.tsx` — captura errores React no manejados
- [ ] Banner "Sin conexión a SAP" cuando el VPN cae (detección por error de red)
- [ ] Reintentos automáticos en llamadas OData (máximo 3 reintentos con backoff)
- [ ] Error 401 → limpiar sesión y redirigir a `/login` con mensaje
- [ ] Errores SAP → mostrar mensaje amigable en español (no exponer mensaje técnico crudo)
- [ ] Loading states en todos los componentes que hacen llamadas OData

### T-022: Comprobante de Cobro
- [ ] Pantalla de resumen post-cobro exitoso:
  - N° documento SAP (BELNR clase W)
  - Cliente, RUT, fecha
  - Documentos cancelados (con sus números)
  - Monto cobrado, vuelto entregado
  - Botón "Imprimir" (`window.print()` con estilos de impresión)
  - Botón "Nuevo Cobro" (reset para siguiente cliente)

### T-023: README y Documentación Técnica POC
- [ ] `README.md`:
  - Prerrequisitos (Node 20+, npm)
  - Setup en 3 comandos: `git clone`, `npm install`, `npm run dev`
  - Explicación de variables de entorno
  - Cómo activar/desactivar mocks MSW
  - Cómo conectar a SAP real
  - Estructura del proyecto (referencia a ARCHITECTURE.md)
- [ ] `.env.example` con todas las variables documentadas
- [ ] Credenciales de demo para probar la app (usuario mock en MSW)

---

## Backlog — Post-POC (Fase 1 Completa)

### Prioridad Crítica
- [ ] Otros 6 métodos de pago (pagaré, tarjeta débito, tarjeta crédito, cheque al día, cheque a fecha, vale vista) — con formulario modal de cheque
- [ ] Sobrepago en cheques + registro saldo a favor en cta. cte. cliente
- [ ] Saldo a Favor: panel y aplicación a facturas seleccionadas
- [ ] Apertura y Cierre de Caja
- [ ] Arqueo de Caja
- [ ] Egresos de Caja (devoluciones por nota de crédito)
- [ ] Anticipos de Cliente (F-37, clase DZ)
- [ ] Intereses por mora (detectar en partidas vencidas, gatillar doc. SD en SAP)

### Prioridad Alta
- [ ] Impresión de comprobantes (térmica + A4)
- [ ] Lista de Pagarés (solo lectura)
- [ ] Estado de Cuenta (definir si reemplaza plataforma actual)
- [ ] Consulta Pago (pendiente documentar con Mariela)
- [ ] Datos logísticos completos en pedido (patente, zona transporte, flete)
- [ ] Stock por centro/almacén (B000, B001, B002, G000) en panel pedido

### Prioridad Media
- [ ] Integración Transbank (tarjeta débito/crédito)
- [ ] Modificar/anular pedidos existentes
- [ ] Consultas y reportes
- [ ] Panel de administración (mantenedores)

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
| **Total POC** | **23 tareas** | **~11-16 días** |

---

## Dependencias Críticas (Bloqueos Potenciales)

| Dependencia | Responsable | Estado |
|-------------|-------------|--------|
| Lista exacta de servicios OData en SAP | Equipo ABAP Cooprinsem | ⚠️ Pendiente |
| Credenciales de desarrollo SAP | Mariela / Basis SAP | ⚠️ Pendiente |
| Confirmación versión OData (v2 vs v4) | Equipo ABAP | ⚠️ Pendiente |
| Parámetros org. ventas/canal/sector/client | Equipo ABAP | ⚠️ Pendiente |
| Nombres exactos de entidades OData | Equipo ABAP | ⚠️ Pendiente |
