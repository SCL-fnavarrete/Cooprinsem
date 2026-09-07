# PROGRESS.md — Registro de Estado del Desarrollo

> Registro vivo del estado del desarrollo. Leer al inicio de una nueva conversación para retomar contexto.
> Ver también `docs/TASKS.md` (plan completo de sprints) y `docs/DECISIONS.md` (ADRs).

## Rama activa
`fix/hotfixes` — rama única para agrupar hotfixes/mejoras puntuales (renombrada desde `fix/sap-region-auto-init` a pedido del usuario; ver nota en la entrada de auto-init de `Sap_region` abajo)

## Última actualización
2026-09-04

---

## Completado

### Mostrar detalle real del error de SAP en Consulta de Stock
Commit: `98738e3` en rama `fix/hotfixes` (aún no pusheada — ver Pendiente).

- Mismo patrón aplicado hoy a Crear Cliente, esta vez en el módulo Stock (Pedidos > Stock).
- **Backend** (`server/src/routes/sapStock.ts`, ruta `GET /api/sap-stock`): antes solo logueaba `error.message` (texto genérico de axios) y nunca el `error.response?.data` completo — si SAP rechazaba la consulta, no quedaba registro del motivo real ni siquiera en la consola del servidor. Ahora loguea el detalle completo y extrae `error.response?.data?.error?.message?.value` (formato OData) como `detail` en la respuesta.
- **Frontend** (`src/services/api/sapStock.ts`, `getSapStock()`): antes ni siquiera leía el body de la respuesta de error — solo lanzaba `Error: Error al consultar stock SAP: {status}`, descartando `message`/`detail` por completo. Ahora arma `${mensaje}\ndetalle del error: ${detalle}`, igual que `crearSapCliente()`.
- **`src/features/stock/StockPage.tsx`**: el `MessageStrip` de error ahora envuelve el texto en `<span style={{ whiteSpace: 'pre-line' }}>` para que el salto de línea se vea.
- **Nota de alcance:** no se tocó `/api/sap-stock/buscar` ni `buscarMaterialesSap()` (mismo archivo, mismo patrón de bug) — es un consumidor distinto (buscador de artículos en Pedidos, no el botón Stock), fuera del alcance de lo pedido. Queda pendiente si se quiere unificar.
- Verificado: `npx tsc -b --noEmit` no reporta errores nuevos en los 3 archivos tocados (sí hay errores preexistentes no relacionados en otros archivos — ver nota de "build de producción roto" en Pendiente).

### Mostrar detalle real del error de SAP al crear cliente
Commit: `080a22f` en rama `fix/hotfixes` (aún no pusheada — ver Pendiente).

- **Origen:** al revisar el manejo de errores de Crear Cliente, se detectó que el backend (`server/src/routes/sapClientes.ts`) ya devolvía un campo `detail` en la respuesta de error, pero (a) el frontend nunca lo leía — solo mostraba el `message` genérico "Error al crear cliente en SAP" — y (b) `detail` en sí era `error.message` de axios (ej. "Request failed with status code 400"), no el motivo real que rechazó SAP.
- **Fix backend:** `server/src/routes/sapClientes.ts` — `detail` ahora prioriza `error.response?.data?.error?.message?.value` (formato de error OData de SAP, ver `.claude/rules/odata.md`), con fallback a `error.message` si SAP no devolvió ese formato.
- **Fix frontend:** `src/services/api/sapClientes.ts` (`crearSapCliente`) — ahora lee `detail` del JSON de error y arma `Error(`${mensaje}\ndetalle del error: ${detalle}`)`. `src/features/pedidos/ClientesPanel.tsx` — el `MessageStrip` que muestra `crearError` envuelve el texto en un `<span style={{ whiteSpace: 'pre-line' }}>` para que el `\n` se vea como salto de línea real (UI5 no lo hace por defecto).
- **Verificado antes de aplicar:** `crearSapCliente()` solo se usa en `ClientesPanel.tsx` (nadie más lo importa), el catch tocado en `sapClientes.ts` es local a `POST /api/sap-clientes` (no es middleware compartido), y el campo `detail` no lo lee ningún otro consumidor en `src/`. `crearError` solo se usa en el tab "Crear" — los 2 mensajes de validación existentes (campos obligatorios, RUT inválido) son de una línea y no cambian visualmente con `pre-line`.
- Verificado con `npx tsc --noEmit` sin errores en frontend y backend. No hay tests automatizados que cubran `crearClienteSap()`.

### Fix: BusinessPartnerGrouping correcto al crear cliente en SAP
Commit: `831aed4` en rama `fix/hotfixes` (aún no pusheada — ver Pendiente).

- El usuario pidió revisar el JSON que se envía a SAP al crear un cliente (se generó `crear-cliente-payloads.json` en el scratchpad de la sesión como referencia, reconstruido desde el código, no una captura real de tráfico).
- A partir de esa revisión, el usuario indicó que `BusinessPartnerGrouping` debía ser `'ZD01'` (grupo de deudor Cooprinsem), no el valor hardcodeado `'0001'` que traía el código.
- **Fix:** `server/src/routes/sapClientesService.ts:260`, único cambio: `BusinessPartnerGrouping: 'ZD01'`. Sigue hardcodeado (no viene de ningún select ni config), solo se corrigió el valor.
- Verificado con `npx tsc --noEmit` en `server/` sin errores. No hay tests automatizados que cubran `crearClienteSap()`.

### Fix: cruce Nombre 1/Nombre 2 al crear cliente Persona en SAP
Commit: `9724504` en rama `fix/hotfixes` (aún no pusheada — ver Pendiente).

- **Origen:** el usuario detectó revisando el maestro de clientes directamente en SAP que, para clientes creados como tipo Persona, "Nombre 1" del formulario terminaba guardado en Apellido y "Nombre 2" en Nombre — invertido.
- **Causa:** en `crearClienteSap()` (`server/src/routes/sapClientesService.ts:262-268`), la rama `tipoSocio === '1'` (Persona) mapeaba `LastName: params.nombre` y `FirstName: params.nombre2 ?? ''`. Los propios comentarios del código ya documentaban el cruce. La rama Organización (`OrganizationBPName1`/`OrganizationBPName2`) no tenía este problema.
- **Fix:** se invirtió a `FirstName: params.nombre` / `LastName: params.nombre2 ?? ''`.
- **Efecto colateral corregido:** la pestaña Ficha (`ClientesPanel.tsx:286`) leía `nombre2` con fallback `sap.FirstName`, asumiendo el mapeo cruzado anterior. Se cambió a `sap.LastName` para quedar consistente con el nuevo mapeo de escritura.
- **Verificado:** `npx tsc --noEmit` sin errores en frontend y backend. No hay tests automatizados que cubran `crearClienteSap()` (llama a SAP real vía axios, sin mocks) — validación pendiente en vivo por el usuario.
- Nota: solo corrige clientes tipo **Persona** creados desde ahora en adelante. Clientes Persona ya creados en SAP con el mapeo cruzado no se corrigen retroactivamente por este cambio.

### Reactivación del botón "Busqueda Doc" en el menú de Pedidos
Commit: `ee2e9ab` en rama `fix/hotfixes` (aún no pusheada — ver Pendiente).

- **Origen:** el usuario pidió volver a habilitar "Busqueda Doc", gráfica y funcionalmente, tras confirmar en una revisión previa que PE17 (commit `0bf11d0`) lo había quitado del menú lateral de `PedidosPage.tsx` junto con Cotización/Nota Creditos/Reporte DIIO.
- **Verificado antes de tocar código:** `BusquedaDocPanel.tsx`, sus servicios (`getPedidoById`, `getPedidos` en `src/services/api/pedidos.ts`; `getPartidaPorBelnr`, `getPartidasAbiertas` en `src/services/api/facturas.ts`) y el endpoint backend `GET /api/partidas/doc/:belnr` (`server/src/routes/partidas.ts`) seguían intactos — PE17 solo había quitado la referencia en el menú, tal como ya indicaba `PROGRESS.md` en la entrada de PE17.
- **Fix:** en `src/features/pedidos/PedidosPage.tsx` se restauró el import del ícono `search`, el import de `BusquedaDocPanel`, la entrada `{ id: 'busqueda-doc', label: 'Busqueda Doc', icon: 'search', habilitado: true }` en `MENU_PEDIDOS`, el render condicional y el ajuste del array de exclusión del mensaje "Módulo en desarrollo" — exactamente como estaba antes de PE17 (`0bf11d0^`), sin reactivar Cotización/Nota Creditos/Reporte DIIO (no pedidos por el usuario).
- **Hallazgo colateral:** `PedidosPage.test.tsx` había quedado desactualizado desde PE17 (esperaba 6 botones, con Cotización/Nota Creditos/Reporte DIIO incluidos, cuando el componente real solo tenía 3). Se actualizó para reflejar los 4 botones reales, todos habilitados.
- **Verificado:** `npx tsc --noEmit` sin errores. Tests de `PedidosPage.test.tsx` y `BusquedaDocPanel.test.tsx`: los 3 tests relevantes al cambio pasan (4 botones visibles, 4 habilitados, click en "Busqueda Doc" muestra el panel). Quedan **2 fallas preexistentes y no relacionadas** en `PedidosPage.test.tsx` (no tocadas en este commit): "muestra PedidoListPage como contenido al montar" (el tab por defecto real es `clientes`, no `pedidos`) y "muestra ClientesPanel al hacer clic en Clientes" (ambigüedad de texto "Buscar" duplicado en componentes UI5, dentro de `ClientesPanel.tsx`).
- **Nota de proceso:** a pedido del usuario, se dejó de crear una rama nueva por tarea — se renombró `fix/sap-region-auto-init` a **`fix/hotfixes`** (local y remoto; la rama vieja se borró del remoto) para agrupar ahí todas las mejoras puntuales en curso.

### Auto-poblar maestro `Sap_region` al arrancar el backend
Commit: `936175d` en rama `fix/hotfixes` (renombrada desde `fix/sap-region-auto-init`; pusheada, aún no mergeada — ver Pendiente). Ver ADR-026 en `docs/DECISIONS.md`.

- **Origen:** el usuario reportó que en la VM del ambiente del cliente (misma rama `main`, mismo commit que local) el formulario "Crear Cliente" del panel Clientes cargaba el select de Región vacío, aunque en el ambiente local funcionaba bien.
- **Diagnóstico:** `GET /api/sap-maestro/regiones` (`server/src/routes/sapMaestro.ts`) lee la tabla `Sap_region` vía Prisma. Esa tabla solo se poblaba con un script manual, `server/createRegiones.js`, que no forma parte de `prisma/seed.ts` ni está documentado en el README — en la VM nadie lo había ejecutado, así que el endpoint respondía `200` con `results: []` sin ningún error visible.
- **Fix:** nueva función `inicializarRegiones()` en `server/src/database/pgSetup.ts` (mismo archivo del auto-init de `pos_parametro_general`) que hace `upsert` de las 16 regiones de Chile contra el modelo Prisma `SapRegion` cada vez que arranca el backend. Se invoca en `server/src/index.ts` junto a `inicializarTablasPostgres()`, antes de `syncService.sincronizar()`.
- `server/createRegiones.js` se mantiene intacto como script manual de respaldo (mismo criterio que `createTables.js` tras automatizar `pos_parametro_general`).
- Verificado con `npx tsc --noEmit` en `server/` sin errores. Pendiente que el usuario valide en la VM del cliente que el select de Región carga correctamente tras reiniciar el backend.
- **Nota derivada:** la investigación en curso de sincronización de clientes (`Sap_cliente`, ver Pendiente abajo) ya había detectado que esa misma VM tiene la tabla `clientes` (POC) en 0 filas — señal de que el setup de esa VM difiere del local en más de un maestro. Vale la pena revisar si `Sap_banco`, `Sap_centro` y `Sap_sociedad` dependen de scripts manuales equivalentes sin auto-init.

### PE17, PE18, PE19 — Cambios post-venta solicitados por José Antonio (correo "Cambios En Pedidos Post Venta")
Commits: `0bf11d0`, `640fdba` (incluye sección "Flujo de trabajo obligatorio" en `CLAUDE.md` + creación de este archivo). Mergeado a `main` (fast-forward `8bc3e0e..640fdba`) y pusheado. Rama `feature/pe17-pe18-pe19` eliminada (remoto y local).

- **PE17** — `src/features/pedidos/PedidosPage.tsx`: menú lateral de Pedidos reducido a Clientes, Stock y Pedidos. Se quitaron del menú Cotización, Busqueda Doc, Nota Creditos y Reporte DIIO (y su render en el bloque de contenido principal). `BusquedaDocPanel.tsx` **no se eliminó** — sigue en el repo por si se reactiva más adelante, solo se quitó su referencia.
- **PE18** — `src/features/pedidos/PedidoListPage.tsx`: título cambiado de "Pedidos de Venta" a "Documentos". Se agregó filtro "Tipo Documento", implementado **client-side** (filtra `pedidos` ya cargados por `tipoDoc`, sin tocar backend/MSW).
- **PE19** — `src/components/pos/PedidoHeader.tsx`: reorden de campos de cabecera a Tipo Documento → Canal Distribución → O.C. → Cliente → Destinatario Mercancía → Quien Retira.

Validado por el usuario en navegador antes del commit.

### CA-12 — Anticipo Clientes, Post Venta (correo "Anticipo Clientes - Post Venta (CA-12)")
Commit: `8242e0c` en rama `feature/ca12-anticipo-caja` (aún no pusheada/mergeada — ver Pendiente).

- Nuevo sub-módulo **"Anticipo"** en el menú de Caja (`src/features/caja/CajaPage.tsx`), como botón que abre un popup — mismo patrón que Egreso de Caja / Apertura de Caja.
- Nuevo componente **`src/components/pos/AnticipoCajaDialog.tsx`**: campos Cliente (input), Sociedad (readonly "COOP"), Ejercicio (input, precargado con año actual, ancho 80px), Nº documento (input) + botón "Verif.", footer Cancelar/Aceptar.
- **Solo frontend por decisión explícita del cliente** — José Antonio indicó que las APIs para verificar/ejecutar el anticipo en SAP están a la espera del equipo ABAP (Priscila). Los botones "Verif." y "Aceptar" solo muestran un `Toast` con "Funcionalidad pendiente de API"; no hay integración real.
- El panel existente **"Ant. Cliente"** (`AntClientePanel.tsx`, Sprint 5 / T-025 — búsqueda de cliente + lista de anticipos pendientes) **no se tocó** — este nuevo popup es un sub-módulo separado, a pedido explícito del usuario, aunque cubre un flujo similar con una UI distinta (fiel al mockup del correo).
- Ajustes visuales validados por el usuario: Ejercicio con ancho fijo 80px, fila Nº documento + Verif. con `minWidth: 0` / `flexShrink: 0` para evitar overflow horizontal, Dialog ampliado a 480px con `maxWidth: 95vw`.

Validado por el usuario en navegador antes del commit.

### Auto-creación de `pos_parametro_general` en PostgreSQL al arrancar el backend
Commit: `181f5c7` en rama `feat/pos-parametro-general-auto-init` (aún no pusheada/mergeada — ver Pendiente).

- Nuevo archivo **`server/src/database/pgSetup.ts`**: función `inicializarTablasPostgres()` que ejecuta `CREATE TABLE IF NOT EXISTS pos_parametro_general (id, clave, valor, descripcion)` e inserta el registro `MANDANTE = 200` con `INSERT ... ON CONFLICT (clave) DO NOTHING` si no existe.
- Se invoca desde `server/src/index.ts` dentro del callback de `app.listen`, antes de la sincronización con la base central (`syncService.sincronizar()`).
- Contexto: `pos_parametro_general` se accede vía `pg.Pool` crudo en `server/src/routes/posMaestros.ts` (no está modelada en `schema.prisma`) y hasta ahora se creaba manualmente fuera del repo — mismo patrón de problema que `server/createTables.js` ya resolvía a mano para `usuario_centros`. Con este cambio, al actualizar la app en cualquier ambiente la tabla y el valor por defecto quedan disponibles sin correr scripts SQL manuales.
- Esquema confirmado por el usuario: `id SERIAL PRIMARY KEY`, `clave VARCHAR(50) UNIQUE NOT NULL`, `valor VARCHAR(100) NOT NULL`, `descripcion VARCHAR(200)`.
- Probado localmente: arranque del backend crea/verifica la tabla sin error y no sobrescribe la fila `MANDANTE` ya existente en la base del usuario.
- Mergeado a `main` (fast-forward `87e758e..2ac89d6`) y pusheado. Rama `feat/pos-parametro-general-auto-init` eliminada (remoto y local).

### Flujo de trabajo Git + PROGRESS.md
Sección "Flujo de trabajo obligatorio" en `CLAUDE.md` (commit `640fdba`, ya en `main`) formalizando: aprobación previa a cualquier comando git, propuesta de rama/cambios antes de ejecutar, y mantenimiento de este archivo tras cada tarea completada.

También se creó `CLAUDE.local.md` (gitignored vía `.git/info/exclude`, NO vía `.gitignore` — a pedido del usuario, para que la regla sea 100% local y no aparezca en el `.gitignore` versionado) con las preferencias personales de flujo de trabajo del usuario (cómo le llegan las tareas, orden de confirmación antes de tocar código).

---

## En progreso
- **PAUSADA — Sincronización de clientes desde `Sap_cliente`**: ver detalle abajo en Pendiente. No hay rama creada ni cambios de código; solo investigación/análisis.

## Pendiente

### `npm run build` (producción) falla — no genera `dist/`
Detectado al investigar por qué el módulo Stock no aparecía en un ambiente del usuario (que resultó ser un clon desactualizado, ver nota abajo — pero en el camino se confirmó que el build de producción real está roto, sin relación con eso). **Preexistente**, verificado con `git blame` que no lo causó ninguno de los cambios de esta sesión (viene desde marzo, commit `3c13ded`, Sprint 9).

- `package.json`: `"build": "tsc -b && vite build"`. Si `tsc -b` falla, `vite build` nunca corre → no se genera `dist/` nuevo. El `npx tsc --noEmit -p tsconfig.json` que se usa habitualmente en esta sesión para verificar cambios **no detecta esto** — el `tsconfig.json` raíz solo tiene `references`, sin `include`, así que sin el flag `-b` no compila nada. El chequeo real equivalente al build es `npx tsc -b --noEmit`.
- Causas encontradas: (1) `tsconfig.app.json` incluye `src/**/*.test.tsx` pero nunca declaró `"types": ["vitest/globals"]` — varios tests que usan `describe`/`it`/`expect` sin importarlos explícitamente rompen la compilación (`PagoDetallePage.test.tsx`, `MainLayout.test.tsx`); (2) fixtures de test desactualizadas les faltan campos agregados después a `IPedidoHeader`/`ILineaPedido`/`IUsuarioAdmin` (`pedidoValidation.test.ts`, `services/api/pedidos.test.ts`, `test/factories.ts`); (3) `ClientesPanel.tsx:25` — imports `getCliente`/`crearCliente` sin usar (`noUnusedLocals`).
- No se ha corregido — el usuario no ha pedido el fix todavía. Opciones discutidas: excluir tests del `include` de `tsconfig.app.json` (más simple, no toca los tests), o arreglar cada error uno por uno.

### Clon de OneDrive del repo — quedó 60 commits atrás, ya sincronizado
El usuario tiene un segundo clon local en `C:\Users\EnzopieroAntonioVald\OneDrive - Scl Consultores Spa\Proyectos\Desarrollo\Cooprimsen\proyectos\Cooprinsem` (mismo remoto `SCL-fnavarrete/Cooprinsem`), donde corre `npm run dev` — **no** es la misma carpeta de trabajo de esta sesión (`C:\Users\EnzopieroAntonioVald\Documents\Proyectos\Dev\Cooprinsem`). Estaba clavado en `main` en el commit `218e6ae` (justo después del Sprint 9), 60 commits atrás de `origin/main` — por eso no le aparecía el módulo Stock ni nada de lo agregado después. Ya se hizo `git pull` (fast-forward limpio, sin cambios locales perdidos) y se cambió a `fix/hotfixes` ahí. **Pendiente para el usuario:** correr `npm install` (raíz y `server/`) + `npx prisma generate` + `npx prisma db push` en esa carpeta antes de reiniciar `npm run dev`, porque el pull trajo cambios grandes en `schema.prisma` y dependencias nuevas.
- **Nota:** al revisar el estado de esa rama tras el pull apareció un commit (`3d5f33c`, "fix: dejar de versionar la BD SQLite local del backend POC") que no se originó en esta sesión — probablemente hecho por el usuario directamente desde el IDE. Se pusheó junto con el resto sin objeción porque su contenido es correcto (corrige una entrada de `.gitignore` guardada en UTF-16 que nunca funcionaba). Mencionado aquí solo por trazabilidad.

### Sincronización de clientes: cambiar fuente de `clientes` (POC) a `Sap_cliente`
Bloqueada esperando definición de José Antonio (revisa con ABAP/Priscila el 2026-09-02) sobre si se pueden agregar los campos `RUT`, `sucursal` y datos de crédito a la interfaz `Sap_cliente`/`Sap_clientes_direccion`. **No tocar `server/src/database/syncService.ts` hasta tener esa respuesta.**

Hallazgos de la investigación (verificados en vivo contra Postgres, ninguna de las 2 tablas está en `schema.prisma`):
- `Sap_cliente` (24 filas): `Customer`, `BusinessPartner`, `CustomerAccountGroup`, `CustomerFullName`, `CustomerName`, `PostingIsBlocked`, `DeliveryIsBlocked`, `BillingIsBlockedForCustomer`, `OrderIsBlockedForCustomer`, `DeletionIndicator`, `created_at`, `updated_at`.
- `Sap_clientes_direccion` (55 filas): `BusinessPartner`, `AddressID`, `StreetName`, `District`, `PostalCode`, `CityName`, `Region`, `Country`, timestamps.
- La tabla `clientes` (POC, Prisma) tiene **0 filas actualmente** — de ahí el interés del cliente en cambiar de fuente.
- **Ninguna tabla Sap_\* trae `rut`, `sucursal`, `condicion_pago` ni datos de crédito** (`credito_asignado`, `credito_utilizado`, `estado_credito`). El RUT solo existe hoy vía llamada SAP OData en vivo (`obtenerRutCliente()` en `server/src/routes/sapClientesService.ts`, entidad `A_Customer.TaxNumber1`), no en ninguna tabla sincronizada por lote.
- Impacto si se cambia la fuente sin resolver esto: la pestaña **"Clientes locales" en Maestros POS** (`GET /api/pos-maestros/clientes-local`, `server/src/routes/posMaestros.ts:412`) muestra explícitamente columnas `rut` y `sucursal` — quedarían vacías para los 24 clientes.
- Opciones planteadas al usuario: (1) traer RUT vía llamada SAP en vivo durante el sync, (2) dejar `rut`/`sucursal`/`condicion_pago` con default y esperar que ABAP amplíe la interfaz, (3) híbrido — cruzar `Sap_cliente` con la tabla `clientes` (POC) por `kunnr` para rescatar esos campos donde ya existan.

### Otras tareas pendientes
- Decidir push + merge a main de `feature/ca12-anticipo-caja` (pendiente de confirmación del usuario).
- Cuando Priscila entregue las APIs SAP para Anticipo Cliente (CA-12): conectar "Verif." (validación de documento) y "Aceptar" (ejecución real del anticipo, clase DZ) en `AnticipoCajaDialog.tsx` a los endpoints reales, siguiendo ADR-015 (implementar en las dos capas: MSW + backend Express, o llamada directa a SAP OData según corresponda a la fase del proyecto en ese momento).
- Definir con José Antonio si el nuevo popup "Anticipo" y el panel existente "Ant. Cliente" (`AntClientePanel.tsx`) conviven como dos entradas separadas en el menú de Caja a largo plazo, o si en algún momento se unifican.
- Si en el futuro se requiere que el filtro "Tipo Documento" (PE18) filtre contra el backend en vez de client-side, extender `IFiltroPedidos`, `getPedidos()`, el handler MSW y la ruta `GET /api/pedidos` en `server/src/routes/pedidos.ts` (ver ADR-015).
- Evaluar con José Antonio si Busqueda Doc, Cotización, Nota Creditos o Reporte DIIO se reactivan en el menú de Pedidos más adelante.
