# PROGRESS.md — Registro de Estado del Desarrollo

> Registro vivo del estado del desarrollo. Leer al inicio de una nueva conversación para retomar contexto.
> Ver también `docs/TASKS.md` (plan completo de sprints) y `docs/DECISIONS.md` (ADRs).

## Rama activa
`DevLocal`

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

### CA-14 — Estado de Cuenta, módulo Caja (solicitud del cliente)
Rama `DevLocal`.

- Habilitado el botón **"E° de Cuenta"** en el menú de Caja (`src/features/caja/CajaPage.tsx`) — antes estaba deshabilitado (`habilitado: false`).
- Nuevo panel **`src/features/caja/EstadoCuentaPanel.tsx`**, siguiendo el mismo patrón que `ConsultaPagoPanel.tsx`: botones Volver/Limpiar arriba, Card de búsqueda a la izquierda (Cliente, Nombre readonly, Nº Tributario, Tipo, botón Buscar), tabla "Listado de documentos" a la derecha (columnas Cliente, Referencia, Nº documento, Clase, Fecha documento, Clave ref.1) y un área de previsualización de PDF debajo.
- **Solo frontend** — las APIs SAP para consultar el estado de cuenta y generar el PDF están a la espera del equipo ABAP (Priscila). El botón "Buscar" solo dispara un `Toast` "Funcionalidad pendiente de API" (mismo patrón que `AnticipoCajaDialog.tsx`, CA-12). La tabla se muestra con 3 filas de ejemplo hardcodeadas para validar el layout; el área de PDF muestra un placeholder "Vista previa no disponible — pendiente de API".
- **Caso de prueba de visualización de PDF (temporal, no commiteado):** se probó cargar un PDF real de estado de cuenta de un cliente de Cooprinsem en un `<iframe>` dentro del panel, para validar que el layout funciona con un documento real. El archivo se guardó en `public/mock/` (cubierto por la regla `*.pdf` de `.gitignore`, nunca apareció en `git status`) y el código de soporte (`PDF_EJEMPLO_URL`, verificación de disponibilidad, `<iframe>` condicional) se agregó y luego se revirtió por completo a pedido del usuario una vez validada la visualización. El archivo PDF de muestra fue eliminado del disco. El panel final solo tiene el placeholder estático.
- No se tocó backend, tipos SAP ni otros paneles de Caja.

Validado por el usuario en navegador antes del commit.

### Flujo de trabajo Git + PROGRESS.md
Sección "Flujo de trabajo obligatorio" en `CLAUDE.md` (commit `640fdba`, ya en `main`) formalizando: aprobación previa a cualquier comando git, propuesta de rama/cambios antes de ejecutar, y mantenimiento de este archivo tras cada tarea completada.

También se creó `CLAUDE.local.md` (gitignored vía `.git/info/exclude`, NO vía `.gitignore` — a pedido del usuario, para que la regla sea 100% local y no aparezca en el `.gitignore` versionado) con las preferencias personales de flujo de trabajo del usuario (cómo le llegan las tareas, orden de confirmación antes de tocar código).

---

## En progreso
- Ninguna tarea abierta en este momento.

## Pendiente
- Decidir push + merge a main de `DevLocal` (incluye CA-14; pendiente de confirmación del usuario).
- Cuando Priscila entregue las APIs SAP para Estado de Cuenta (CA-14): conectar el botón "Buscar" en `EstadoCuentaPanel.tsx` al endpoint real (listado de documentos + generación/descarga del PDF), siguiendo ADR-015 (tipo + servicio + MSW handler + ruta backend o llamada OData directa según la fase). Definir con ABAP si el PDF viene como stream binario (media entity OData) o como URL descargable — cambia la implementación del visor.
- Cuando Priscila entregue las APIs SAP para Anticipo Cliente (CA-12): conectar "Verif." (validación de documento) y "Aceptar" (ejecución real del anticipo, clase DZ) en `AnticipoCajaDialog.tsx` a los endpoints reales, siguiendo ADR-015 (implementar en las dos capas: MSW + backend Express, o llamada directa a SAP OData según corresponda a la fase del proyecto en ese momento).
- Definir con José Antonio si el nuevo popup "Anticipo" y el panel existente "Ant. Cliente" (`AntClientePanel.tsx`) conviven como dos entradas separadas en el menú de Caja a largo plazo, o si en algún momento se unifican.
- Si en el futuro se requiere que el filtro "Tipo Documento" (PE18) filtre contra el backend en vez de client-side, extender `IFiltroPedidos`, `getPedidos()`, el handler MSW y la ruta `GET /api/pedidos` en `server/src/routes/pedidos.ts` (ver ADR-015).
- Evaluar con José Antonio si Busqueda Doc, Cotización, Nota Creditos o Reporte DIIO se reactivan en el menú de Pedidos más adelante.
