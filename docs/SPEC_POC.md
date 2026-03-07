# SPEC_POC.md — Script de Primera Sesión Claude Code

## Cómo usar este archivo
Este archivo contiene el prompt exacto para iniciar cada módulo del POC con Claude Code.
Copia el bloque que necesitas y pégalo en Claude Code.

---

## PROMPT 0 — Scaffold inicial del proyecto (ejecutar una sola vez)

```
Lee los archivos @CLAUDE.md, @docs/DECISIONS.md y @docs/TASKS.md antes de comenzar.

Necesito que hagas el scaffold completo del proyecto React + Vite + TypeScript para el POS de Cooprinsem.

Ejecuta en orden:
1. npm create vite@latest . -- --template react-ts (en la carpeta actual)
2. Instala las dependencias:
   - @ui5/webcomponents-react @ui5/webcomponents @ui5/webcomponents-fiori
   - @sap-cloud-sdk/odata-v2
   - react-router-dom
   - zustand
   - msw
   - @testing-library/react @testing-library/user-event @testing-library/jest-dom
   - vitest @vitest/coverage-v8 jsdom
3. Configura vite.config.ts con:
   - plugin de React
   - alias @ → src/
   - proxy para SAP OData en /sap/opu/odata → VITE_SAP_ODATA_BASE_URL
4. Configura tsconfig.json con strict: true y el alias @/*
5. Configura vitest con jsdom, setup file, y cobertura
6. Crea la estructura de carpetas src/ exactamente como está en CLAUDE.md
7. Crea src/config/sap.ts con las constantes SAP (SOCIEDAD, almacenes, roles, tipos documento)
8. Crea .env.development con los valores del .env.example (VITE_USE_MOCK=true)
9. Crea .gitignore apropiado (incluir .env*, no incluir .env.example)
10. Inicializa git, haz un commit inicial: "chore: scaffold inicial Cooprinsem POS"

NO implementes ningún componente todavía. Solo la estructura base funcional.
Al terminar, ejecuta npm run type-check y npm run test para verificar que todo compila.
```

---

## PROMPT 1 — Tipos TypeScript + Mock Data (Sprint 1)

```
Lee @CLAUDE.md y @docs/TASKS.md (Sprint 1: T-005 a T-009).

Implementa en este orden:

1. src/types/cliente.ts — ICliente, IClienteBusqueda, IEstadoCredito
2. src/types/articulo.ts — IArticulo, IArticuloBusqueda
3. src/types/pedido.ts — IPedido, IPedidoPosicion, ICrearPedidoRequest, ICrearPedidoResponse
4. src/types/caja.ts — IPartidaAbierta, IPagoEfectivo, IResultadoCobro
5. src/types/credito.ts — IEstadoCredito con estado: 'BLOQUEADO' | 'AL_DIA' | 'CON_DEUDA'
6. src/types/common.ts — IUsuario (Rol_Cod 1-4), IApiResponse<T>, ISapODataError

7. src/test/factories.ts — con las factories de mock data:
   - crearClienteMock(), CLIENTE_BOLETA_MOCK, crearClienteBloqueadoMock()
   - crearArticuloMock(), 30 artículos variados de ferretería/insumos
   - crearFacturaPendienteMock(), crearFacturaVencidaMock(diasMora)
   - 10 clientes de prueba realistas (nombres, RUTs válidos, estados crédito variados)

8. src/test/helpers.tsx — renderWithProviders con BrowserRouter + UI5 ThemeProvider
9. src/services/mock/handlers.ts — MSW handlers para todos los endpoints del POC

Reglas:
- Campos SAP en inglés al mapear (MATNR → codigoMaterial, etc.) — ver .claude/rules/odata.md
- Todos los RUTs en factories deben ser válidos (módulo 11)
- Montos en CLP como enteros
- TypeScript strict — sin any
```

---

## PROMPT 2 — Módulo Pedidos Venta Mesón (Sprint 2)

```
Lee @CLAUDE.md, @docs/PRD.md (sección 4 — Módulo Pedidos) y @docs/TASKS.md (Sprint 2: T-010 a T-015).

Implementa el módulo completo de Venta Mesón:

1. src/utils/format.ts — formatCLP, formatRUT, formatFecha
2. src/utils/validar.ts — validarRUT (módulo 11), validarCantidad, validarFecha
3. src/services/api/clientes.ts — buscarClientes, getCliente, getEstadoCredito
4. src/services/api/materiales.ts — buscarMateriales (ordenar por stock desc, excluir bloqueados), getMaterial
5. src/services/api/pedidos.ts — crearPedido, getStockPorCentro
6. src/components/pos/ClienteSearch.tsx:
   - Búsqueda case-insensitive, resultados priorizando la sucursal actual
   - Panel de crédito al seleccionar: badge estado + crédito asignado/utilizado/% agotamiento
   - Badge BLOQUEADO en rojo con advertencia prominente (no bloquea el flujo)
   - Botón rápido "Cliente Boleta" (carga 999999 directamente)
7. src/components/pos/ArticuloSearch.tsx:
   - Búsqueda sin asteriscos, case-insensitive, ordenado por stock desc
   - Ocultar materiales bloqueados (MARA-LVORM o equivalente)
8. src/components/pos/ArticuloGrid.tsx — grilla editable con columnas del PRD
9. src/components/pos/PedidoHeader.tsx:
   - Cambiar tipo documento NO borra la grilla de artículos
   - Incluye ClienteSearch embebido
10. src/components/pos/PedidoTotals.tsx — subtotal, IVA, total
11. src/hooks/usePedido.ts — estado del pedido, agregar/quitar artículos, submit
12. src/features/pedidos/PedidoPage.tsx — página completa integrando todo

Tests para cada componente. Atajos de teclado: F2 (buscar cliente), F4 (agregar artículo), F9 (grabar), Esc (cancelar modal).
```

---

## PROMPT 3 — Módulo Caja Pago Efectivo (Sprint 3)

```
Lee @CLAUDE.md, @docs/PRD.md (sección 5 — Módulo Caja) y @docs/TASKS.md (Sprint 3: T-016 a T-018).

Implementa el módulo de Caja con solo Pago Efectivo:

1. src/services/api/facturas.ts — getPartidasAbiertas(kunnr)
2. src/services/api/cobros.ts — registrarCobroEfectivo(cobro)
3. src/components/pos/CajaFacturaList.tsx:
   - Grilla de partidas abiertas con semáforo de estado
   - Columnas: estado, referencia, asignación, Nº doc, clase, fecha, vencimiento, días mora, importe
   - Selección múltiple de documentos a cobrar
4. src/components/pos/PagoEfectivoModal.tsx:
   - Modal con monto a cobrar, campo efectivo recibido
   - Cálculo automático: Total a Pagar, Efectivo Recibido, Vuelto
   - Validación: efectivo >= total a pagar
5. src/hooks/useCaja.ts — búsqueda cliente, carga partidas, estado del cobro
6. src/features/caja/CajaPage.tsx:
   - Menú lateral con 8 botones (solo Pago Cta. Cte. habilitado, el resto deshabilitado con tooltip "Próximamente")
   - Flujo completo: buscar cliente → ver partidas → seleccionar → cobrar en efectivo → confirmar en SAP

Después de registrar el cobro, mostrar comprobante con: Nº doc SAP (BELNR), cliente, documentos cancelados, monto cobrado, vuelto, fecha y hora.
```

---

## PROMPT 4 — Auth + Routing + Finalización POC (Sprint 4)

```
Lee @CLAUDE.md y @docs/TASKS.md (Sprint 4: T-019 a T-023).

Implementa:

1. src/features/auth/LoginPage.tsx — formulario usuario/contraseña SAP, validación Basic Auth
2. src/routes/ — rutas protegidas por rol (Rol 2 → Pedidos, Rol 3 → Caja, Rol 1 → ambos)
3. src/layouts/AppShell.tsx — ShellBar UI5 con logo Cooprinsem, nombre usuario, botón logout
4. Manejo global de errores SAP (interceptor que parsea ISapODataError y muestra MessageBox UI5)
5. README.md completo con:
   - Requisitos previos
   - Pasos de instalación
   - Cómo configurar .env
   - Cómo ejecutar con mocks vs SAP real
   - Estructura del proyecto
   - Pendientes de ABAP

Al terminar: npm run build (sin errores), npm run test:coverage (≥70% líneas).
```

---

## Reglas para todas las sesiones
- Siempre usar Plan Mode (Shift+Tab dos veces) antes de implementar algo con más de 3 archivos.
- Aprobar el plan antes de ejecutar.
- Al terminar cada prompt: ejecutar `npm run type-check` y `npm run test`.
- Si hay errores de TypeScript o tests fallidos, NO avanzar al siguiente prompt.
- Usar Sonnet para trabajo rutinario. Cambiar a Opus con `/model` para decisiones arquitectónicas complejas.
