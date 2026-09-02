# PROGRESS.md — Registro de Estado del Desarrollo

> Registro vivo del estado del desarrollo. Leer al inicio de una nueva conversación para retomar contexto.
> Ver también `docs/TASKS.md` (plan completo de sprints) y `docs/DECISIONS.md` (ADRs).

## Rama activa
`main`

## Última actualización
2026-09-01

---

## Completado

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
