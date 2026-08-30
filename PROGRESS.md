# PROGRESS.md — Registro de Estado del Desarrollo

> Registro vivo del estado del desarrollo. Leer al inicio de una nueva conversación para retomar contexto.
> Ver también `docs/TASKS.md` (plan completo de sprints) y `docs/DECISIONS.md` (ADRs).

## Rama activa
`feature/pe17-pe18-pe19`

## Última actualización
2026-08-30

---

## Completado

### PE17, PE18, PE19 — Cambios post-venta solicitados por José Antonio (correo "Cambios En Pedidos Post Venta")
Commit: `0bf11d0`

- **PE17** — `src/features/pedidos/PedidosPage.tsx`: menú lateral de Pedidos reducido a Clientes, Stock y Pedidos. Se quitaron del menú Cotización, Busqueda Doc, Nota Creditos y Reporte DIIO (y su render en el bloque de contenido principal). `BusquedaDocPanel.tsx` **no se eliminó** — sigue en el repo por si se reactiva más adelante, solo se quitó su referencia.
- **PE18** — `src/features/pedidos/PedidoListPage.tsx`: título cambiado de "Pedidos de Venta" a "Documentos". Se agregó filtro "Tipo Documento", implementado **client-side** (filtra `pedidos` ya cargados por `tipoDoc`, sin tocar backend/MSW).
- **PE19** — `src/components/pos/PedidoHeader.tsx`: reorden de campos de cabecera a Tipo Documento → Canal Distribución → O.C. → Cliente → Destinatario Mercancía → Quien Retira.

Validado por el usuario en navegador antes del commit.

### Flujo de trabajo Git + PROGRESS.md
Se agregó sección "Flujo de trabajo obligatorio" a `CLAUDE.md` (pendiente de commit — ver abajo) formalizando: aprobación previa a cualquier comando git, propuesta de rama/cambios antes de ejecutar, y mantenimiento de este archivo tras cada tarea completada.

---

## En progreso
- Ninguna tarea abierta en este momento.

## Pendiente
- Commit del cambio de `CLAUDE.md` (sección "Flujo de trabajo obligatorio") — pendiente de aprobación del usuario, es un cambio de documentación separado de PE17/18/19.
- Decidir push + merge a main de `feature/pe17-pe18-pe19` (pendiente de confirmación del usuario).
- Si en el futuro se requiere que el filtro "Tipo Documento" (PE18) filtre contra el backend en vez de client-side, extender `IFiltroPedidos`, `getPedidos()`, el handler MSW y la ruta `GET /api/pedidos` en `server/src/routes/pedidos.ts` (ver ADR-015: todo endpoint nuevo requiere las dos capas de mock).
- Evaluar con José Antonio si Busqueda Doc, Cotización, Nota Creditos o Reporte DIIO se reactivan en el menú de Pedidos más adelante.
