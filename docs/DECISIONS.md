# DECISIONS.md — Architecture Decision Records (ADR)
## Proyecto: Cooprinsem POS

---

## ADR-001: React + Vite en lugar de Next.js
**Estado:** Aprobado  
**Fecha:** Febrero 2026

**Decisión:** Usar React 18 + Vite como SPA.

**Por qué NO Next.js:**
- El POS no necesita SSR ni SSG. Es una aplicación interna con usuarios autenticados.
- El filesystem routing de Next.js agrega complejidad sin beneficio para este caso.
- La Fase 2 requiere empaquetar como Electron (.exe) y Capacitor (.apk). Next.js complica enormemente este proceso.
- Vite es más rápido en desarrollo y build que Next.js para proyectos de este tamaño.

**Consecuencia:** Sin optimización SEO (innecesario para POS interno), sin RSC.

---

## ADR-002: SAP UI5 Web Components for React como librería de componentes
**Estado:** Aprobado  
**Fecha:** Febrero 2026

**Decisión:** Usar `@ui5/webcomponents-react` para todos los componentes UI.

**Por qué:**
- El cliente solicitó explícitamente el estilo visual SAP Fiori.
- Los usuarios de Cooprinsem ya conocen SAP Fiori en su entorno SAP diario — reduce la curva de aprendizaje.
- Componentes enterprise listos: Table, Form, Input, Select, Dialog, MessageBox, ShellBar.
- Mantenido por SAP, compatible long-term con el ecosistema SAP S/4HANA.

**Por qué NO Tailwind + shadcn/ui:**
- Requeriría diseñar toda la UX desde cero con estética enterprise.
- La consistencia visual con SAP es un requerimiento funcional del cliente.

---

## ADR-003: Conexión OData directa (sin BFF/middleware propio)
**Estado:** Aprobado  
**Fase:** Solo Fase 1

**Decisión:** El frontend React llama directamente a los servicios OData de SAP vía VPN.

**Por qué:**
- Fase 1 replica el modelo del WebDynpro actual (también llama directo a SAP).
- Agregar un BFF (Backend for Frontend) introduce latencia, costo de infraestructura y superficie de fallo adicional.
- En Fase 2 sí se necesitará una capa de sincronización local (SQLite ↔ SAP).

**Riesgo asumido:** CORS requiere configuración en SAP (o proxy en desarrollo).

---

## ADR-004: Electron (Windows) + Capacitor (Android) para Fase 2
**Estado:** Decisión futura — NO implementar en POC ni Fase 1

**Por qué NO .NET/WPF:** Solo Windows. No cubre tablets Android. Requiere aprender C#.
**Por qué NO Flutter:** Requiere Dart desde cero. Sin componentes UI enterprise tipo SAP Fiori.
**Por qué NO Tauri:** Soporte móvil (Android) aún inmaduro para proyecto enterprise (a feb 2026).
**Por qué NO PWA:** Insuficiente para offline real con SQLite y sincronización compleja.

---

## ADR-005: MSW (Mock Service Worker) para desarrollo desacoplado de SAP
**Estado:** Aprobado

**Decisión:** Desarrollar con MSW activo (`VITE_USE_MOCK=true`) hasta tener acceso a SAP.

**Por qué:**
- El equipo ABAP puede estar construyendo los servicios OData en paralelo.
- Los handlers de MSW documentan el contrato OData esperado → sirven de especificación para el equipo ABAP.
- Permite development y testing sin depender de la disponibilidad del ambiente SAP QAS.

---

## ADR-006: TypeScript strict mode
**Estado:** Aprobado

**Decisión:** `strict: true` en tsconfig. Nunca usar `any` sin comentario justificando por qué.

**Por qué:**
- Proyecto enterprise con lógica contable y financiera. Los bugs de tipo pueden costar dinero real.
- Los campos SAP (MATNR, KUNNR, etc.) bien tipados evitan errores de mapeo silenciosos.

---

## ADR-007: Zustand para estado global (post-POC)
**Estado:** POC usa React Context, Fase 1 migra a Zustand

**Por qué no Redux:** Overhead excesivo para un POS de esta escala.
**Por qué Zustand sobre Jotai/Recoil:** API simple, sin boilerplate, buen soporte TypeScript, amplia adopción en 2025-2026.

---

## ADR-008: PostgreSQL local como sustituto de SAP en el POC
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
El POC se desarrolla sin acceso a SAP S/4HANA. El cliente confirma que la
migración a SAP 4HANA está en curso (a cargo de otra área) y que en el
corto plazo la arquitectura evolucionará a modo offline por sucursal.

**Decisión:**
El POC usa PostgreSQL local con un backend Node.js/Express que imita la
estructura de respuestas SAP OData. Los endpoints del backend se diseñan
con los mismos campos y estructura que tendrán los servicios OData de SAP,
de modo que al conectar SAP real solo cambia la URL base en .env.

**Por qué PostgreSQL y no SQLite para el POC:**
SQLite es la opción correcta para un dispositivo individual offline.
PostgreSQL es la opción correcta para el servidor de sucursal que en Fase 2
atenderá múltiples dispositivos simultáneos. Usar PostgreSQL en el POC
valida la arquitectura definitiva.

**Consecuencia:**
El desarrollador debe tener PostgreSQL instalado localmente.
Se agrega carpeta server/ al repositorio con el backend POC.
En Fase 1 (online SAP), el backend server/ se elimina y el frontend
llama directo a SAP OData. En Fase 2 (offline), server/ regresa como
servidor de sucursal con sincronización batch.

---

## ADR-009: Backend Node.js/Express + Prisma para el POC
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Decisión:** Node.js + Express + Prisma ORM sobre el backend del POC.

**Por qué NO C# + WPF (Modelo A del cliente):**
WPF solo corre en Windows. El cliente tiene tablets Android como requisito.

**Por qué NO Flutter (Modelo B del cliente):**
Requiere Dart desde cero. Sin componentes UI enterprise tipo SAP Fiori.

**Por qué Node.js:**
Mismo ecosistema que el frontend (TypeScript, npm). El equipo no necesita
aprender un segundo lenguaje. Prisma ORM tiene tipado TypeScript nativo.

---

## ADR-010: UI5 Web Components React v2 — Breaking Changes
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
Se detectaron breaking changes en `@ui5/webcomponents-react` v2.20.0 respecto a v1.
Cuatro funcionalidades del módulo Pedidos estaban rotas porque el código usaba la API
de eventos de v1. Los componentes se renderizaban correctamente pero no respondían a
las interacciones del usuario (selección de clientes, artículos, confirmación de diálogos).

**Decisión:** Usar siempre la API de v2. Los cambios clave son:

| Concepto | v1 (obsoleto) | v2 (correcto) |
|----------|---------------|---------------|
| Evento selección en `Input` con sugerencias | `onSuggestionItemSelect` | `onSelectionChange` |
| Acceso al texto del `SuggestionItem` | `e.detail.item.textContent` | `e.detail.item.getAttribute('text')` o `.text` |
| Firma `MessageBox.onClose` | `(event) => event.detail.action` | `(action: string, escPressed: boolean) => action` |
| `Badge` (componente) | Renombrado en v2 | Usar `Tag` en lugar de `Badge` |
| `FormItem label="texto"` | API v1 obsoleta | Usar `<FormItem><Label>texto</Label>...` |
| `HTMLInputElement` en event targets | Tipo incorrecto para UI5 | Usar `InputDomRef` (ver ADR-016) |

**Consecuencia:**
- Todo componente que use `Input` con `SuggestionItem` debe usar `onSelectionChange`.
- `textContent` retorna string vacío en v2 para `SuggestionItem`; usar `getAttribute('text')`.
- Los callbacks de `MessageBox` reciben `action` directamente, no un evento wrapper.
- Ante dudas, consultar la guía de migración oficial.

**Referencia:** https://sap.github.io/ui5-webcomponents-react/v2/?path=/docs/migration-guide--docs

**Patrón de detección:** Si un componente UI5 no renderiza o lanza error de tipo en runtime, verificar primero si fue renombrado en v2. Consultar: https://sap.github.io/ui5-webcomponents-react/v2/?path=/docs/migration-guide--docs

---

## ADR-011: UI5 Input — No deshabilitar durante búsqueda asíncrona
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
El `Input` de UI5 Web Components cierra su popover de sugerencias si el componente pasa a `disabled=true` durante una búsqueda asíncrona. Esto causaba que el usuario escribiera una búsqueda, el componente se deshabilitara brevemente mientras se consultaba el backend, y al recibir los resultados el popover de sugerencias no se mostraba porque el Input había perdido el foco.

**Decisión:** Nunca incluir `isLoading` en la prop `disabled` de un `Input` que maneja sugerencias. El loading es solo un indicador visual (ej: icono spinner), no debe bloquear la interacción del usuario.

**Regla:**
```tsx
// CORRECTO
disabled={disabled || !!seleccionado}

// INCORRECTO — nunca hacer esto
disabled={disabled || !!seleccionado || isLoading}
```

**Aplica a:** `ClienteSearch.tsx`, `ArticuloSearch.tsx` y cualquier futuro componente con sugerencias.

**Consecuencia:**
- El usuario puede seguir escribiendo mientras se ejecuta una búsqueda anterior.
- El indicador de carga es puramente visual (icon o MessageStrip), nunca bloquea el input.

---

## ADR-012: Persistencia de sesión con sessionStorage
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
El estado React se pierde en un hard refresh (Ctrl+F5), cerrando la sesión inesperadamente. Esto es problemático para cajeros que accidentalmente recargan la página y deben volver a autenticarse.

**Decisión:** Persistir el usuario autenticado en `sessionStorage` desde `UserContext`.
- **Login:** escribe datos del usuario en `sessionStorage`.
- **Logout:** borra `sessionStorage`.
- **Init (montaje del contexto):** intenta cargar desde `sessionStorage` primero.

**Por qué `sessionStorage` sobre `localStorage`:**
- `sessionStorage` se limpia automáticamente al cerrar la pestaña del navegador, lo que es más seguro para un POS.
- `localStorage` persiste indefinidamente, lo que podría dejar sesiones fantasma en equipos compartidos.

**Qué se guarda:** `id`, `nombre`, `rol`, `sucursal`.
**Qué NUNCA se guarda:** credenciales (usuario SAP, contraseña, tokens).

**Consecuencia:**
- Un refresh de página mantiene la sesión activa.
- Cerrar la pestaña o el navegador cierra la sesión automáticamente.
- No hay riesgo de filtración de credenciales en el storage del navegador.

---

## ADR-013: VarChar mínimo 50 para campos tipo catálogo/enum en Prisma
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
La columna `tipo_doc` en `PedidoVenta` estaba definida como `VarChar(10)`. Los valores reales que envía el frontend (definidos en `src/config/sap.ts`) excedían el límite:

| Valor | Largo |
|-------|-------|
| `Venta Normal` | 12 |
| `Venta Boleta` | 13 |
| `V. Puesto Fundo` | 16 |
| `V. Calzada` | 11 |
| `Venta Anticipada` | 17 |

PostgreSQL rechazaba el INSERT con error de truncamiento, Prisma lo propagaba como excepción, y el backend respondía con **500 Internal Server Error** al grabar un pedido con F9.

**Decisión:** Usar `VarChar(50)` mínimo para cualquier campo que almacene valores de catálogo, enum con descripciones, o tipos definidos en `src/config/sap.ts` o en los tipos TypeScript del frontend.

**Regla:** Antes de definir `VarChar(N)` en `schema.prisma`, verificar el largo máximo de **todos** los valores posibles del campo. En caso de duda, usar `VarChar(50)` o `Text`.

**Corrección aplicada:** `tipo_doc VarChar(10)` → `VarChar(50)` + `npx prisma db push` + `npx prisma generate`.

---

## ADR-014: Diagnóstico de entorno — verificar procesos antes de buscar bugs
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
El POC requiere 2 procesos corriendo simultáneamente. En sesión de desarrollo, el frontend mostró página en blanco. Se perdió tiempo buscando bugs en el código cuando el problema era simplemente que Vite no estaba levantado.

**Decisión:**
Ante cualquier síntoma de "la app no carga" o "no responde", verificar primero que ambos procesos estén activos ANTES de revisar código.

**Diagnóstico rápido:**
```bash
# Backend (debe responder 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/clientes

# Frontend (si responde 000 = proceso caído)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```

**Solución:**
```bash
# Terminal 1 — raíz del proyecto
npm run dev          # Vite → puerto 5173

# Terminal 2 — backend
cd server && npm run dev   # Express → puerto 3001
```

**Consecuencia:**
Regla fija de diagnóstico: código 000 en curl = puerto cerrado = proceso no está corriendo. No es un bug de código.

**Caso específico: "Ruta no encontrada" tras agregar endpoints nuevos**

El servidor Express registra rutas al momento de iniciar el proceso.
Si se crea un archivo nuevo en `server/src/routes/` y se agrega un
`app.use()` en `index.ts`, pero el servidor NO se reinicia, el proceso
viejo sigue corriendo sin las rutas nuevas → cualquier request cae
en el handler 404 genérico. No es un bug de código.

**Checklist diagnóstico:**
```bash
# 1. Probar el endpoint directamente
curl http://localhost:3001/api/clientes
# Si da 404 → servidor desactualizado, NO buscar bugs en el código

# 2. Reiniciar el servidor
# Ctrl+C en la terminal del servidor, luego:
cd server && npm run dev

# 3. Verificar que responde
curl http://localhost:3001/api/clientes
# Debe retornar 200 con JSON
```

**Cuándo reiniciar obligatoriamente:**
- Después de crear un archivo nuevo en `server/src/routes/`
- Después de agregar `app.use()` en `server/src/index.ts`
- Después de cambiar `schema.prisma` (requiere además: `npx prisma generate`)

**Nota:** nodemon recarga cambios en archivos existentes automáticamente, pero archivos nuevos a veces no se detectan y requieren reinicio manual.

---

## ADR-015: Todo endpoint nuevo requiere implementación en DOS capas de mock
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
Al implementar List. Pagarés, se creó el handler MSW y los tests pasaron correctamente. Sin embargo, la app en el navegador falló con 404 porque el endpoint no existía en el backend Express. Los tests usan MSW (que intercepta en memoria), pero el navegador con `VITE_USE_MOCK=false` llama al backend real en localhost:3001.

**Decisión:**
Cada vez que se agrega un nuevo endpoint al frontend, es OBLIGATORIO implementarlo en ambas capas:

| Capa | Cuándo actúa | Archivo |
|------|--------------|---------|
| MSW | Tests + dev con `VITE_USE_MOCK=true` | `src/services/mock/handlers/*.ts` |
| Backend Express | Dev con `VITE_USE_MOCK=false` | `server/src/routes/*.ts` |

**Checklist obligatorio por cada endpoint nuevo:**
- [ ] Tipo TypeScript en `src/types/`
- [ ] Servicio API en `src/services/api/`
- [ ] Handler MSW en `src/services/mock/handlers/`
- [ ] Ruta Express en `server/src/routes/`
- [ ] Ruta registrada en `server/src/index.ts`

**Consecuencia:**
Tests pasando NO garantizan que el backend tenga el endpoint. Solo garantizan que el contrato del frontend es correcto. Siempre verificar la app en el navegador (no solo los tests) antes de dar una feature por completada.

---

## ADR-016: Tipo correcto para refs de componentes UI5 — InputDomRef
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
Al usar useRef() con el componente Input de @ui5/webcomponents-react,
TypeScript lanza TS2322 si se tipea el ref como HTMLInputElement o
HTMLElement. UI5 v2 expone su propio tipo de ref.

**Decisión:**
Para refs de componentes UI5, usar siempre el tipo DomRef específico
del componente, importado desde @ui5/webcomponents-react:
```typescript
// ❌ Incorrecto — causa TS2322
const inputRef = useRef<HTMLInputElement>(null)

// ✅ Correcto
import { InputDomRef } from '@ui5/webcomponents-react'
const inputRef = useRef<InputDomRef>(null)
```

**Tipos DomRef disponibles en @ui5/webcomponents-react:**
- Input → InputDomRef
- Select → SelectDomRef
- Dialog → DialogDomRef
- Table → TableDomRef
(verificar exports del paquete para otros componentes)

**Sobre isLoading en búsquedas async:**
No agregar isLoading al prop disabled del Input (ADR-011).
Si se necesita preservar el estado para un futuro indicador visual
sin usarlo aún, nombrarlo _isLoading para señalar no-uso intencional
y evitar TS6133.

---

## ADR-017: HomePage muestra tiles para TODOS los roles (sin auto-redirección)
**Estado:** Revertido en Sprint 8
**Fecha:** Marzo 2026 (Sprint 6 → revertido Sprint 8)

**Contexto:**
En Sprint 6 se implementó auto-redirección genérica: roles con acceso a un solo módulo iban directamente a ese módulo sin ver las tiles. El cliente solicitó en Sprint 8 revertir esta decisión — todos los usuarios deben ver la pantalla principal.

**Decisión original (Sprint 6):** Auto-redirigir si `tiles.length === 1`.

**Decisión actual (Sprint 8):** Todos los roles ven la HomePage con sus tiles. No hay auto-redirección.

**Por qué se revirtió:**
- El cliente prefiere que todos los usuarios vean un punto de partida consistente
- Reduce confusión en usuarios que esperan ver un menú estándar
- Facilita navegación (desde cualquier módulo → HomePage → otro módulo)

**Resultado actual:**
| Rol | Tiles visibles | Comportamiento |
|-----|---------------|----------------|
| 1 (Admin) | 3 (Admin, Pedidos, Caja) | Ve las tiles, elige módulo |
| 2 (Ventas) | 1 (Pedidos) | Ve 1 tile, hace clic para entrar |
| 3 (Caja) | 1 (Caja) | Ve 1 tile, hace clic para entrar |
| 4 (Consultas) | 1 (Pedidos) | Ve 1 tile, hace clic para entrar |

---

## ADR-018: No eliminar ni reasignar códigos de rol existentes (REVERTIDO)
**Estado:** Revertido
**Fecha:** Marzo 2026

**Contexto:**
Durante Sprint 6 se intentó eliminar el rol Administrador (código 1) del sistema, reasignando sus funciones a otros roles. Esto causó regresiones en múltiples puntos del código que dependían del código numérico 1 para controlar acceso: `ProtectedRoute`, `src/config/sap.ts`, `server/src/routes/auth.ts` (usuarios hardcodeados), y todos los `[1,2,3,4].includes(rolCod)` del frontend.

**Decisión original:** Eliminar el rol Administrador y redistribuir permisos.

**Por qué se revirtió:**
- Los códigos de rol están hardcodeados en múltiples capas (frontend, backend, configuración SAP)
- Reasignar un código numérico existente rompe silenciosamente las guardas de ruta
- El impacto fue mayor al esperado y difícil de detectar completamente

**Lección aprendida — Regla permanente:**
1. **NUNCA** reasignar códigos numéricos de roles existentes — solo agregar nuevos o desactivar
2. **NUNCA** eliminar un rol sin verificar TODOS los puntos de impacto (auth.ts, ProtectedRoute, config/sap.ts, includes() en frontend)
3. **SIEMPRE** preguntar antes de modificar roles: "¿el rol desaparece del sistema o solo del catálogo visible?"
4. Ante cualquier duda sobre el alcance → pedir confirmación ANTES de ejecutar

**Consecuencia:**
Se agregó la sección "Reglas Críticas de Implementación > Cambios de Roles y Permisos" en CLAUDE.md como guardrail permanente para evitar que este error se repita.

---

## ADR-019: Vínculo Pedido ↔ Partida via campo vbeln
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
Al crear un pedido (Sprint 7, T-041), el backend genera automáticamente una `PartidaAbierta` para que aparezca en Caja. Sin embargo, al cobrar esa partida no había forma de actualizar el estado del pedido original porque no existía vínculo entre ambas tablas.

**Decisión:** Agregar campo nullable `vbeln` a la tabla `partidas_abiertas` para vincular la partida con el pedido que la generó.

**Por qué nullable:**
- Las partidas que vienen del seed (datos históricos SAP) no tienen pedido de origen en el POS.
- Solo las partidas generadas desde el POS tendrán vbeln.

**Consecuencia:**
- Al crear pedido → la partida se crea con `vbeln` del pedido.
- Al cobrar → `cobros.ts` busca partidas con `vbeln` no nulo y actualiza esos pedidos a estado "Procesado".
- En SAP real este vínculo existe nativamente (el pedido SD genera la factura FI). En el POC lo simulamos con este campo.

---

## ADR-020: Prisma Client generado no se sube a Git
**Estado:** Aprobado
**Fecha:** Marzo 2026

**Contexto:**
Un desarrollador descargó el repo desde GitHub, ejecutó `npm install` y `npm run dev`, pero el backend no compiló con errores TS2339 ("Property 'observaciones' does not exist on type..."). Causa: el directorio `server/src/generated/prisma/` (Prisma Client) está en `.gitignore` y no se genera automáticamente con `npm install`.

**Decisión:** Documentar `npx prisma generate` como paso obligatorio en el README, con tabla de cuándo re-ejecutar.

**Regla:** Después de cualquier `git pull` que modifique `schema.prisma`, SIEMPRE ejecutar:
```bash
cd server && npx prisma generate && npx prisma db push
```

> ⚠️ **Actualizado por ADR-028:** antes del `db push`, correr el dry-run (`prisma migrate diff`) y verificar que no haya `DROP`.

**Checklist para nuevos campos en schema.prisma:**
1. Agregar campo en `schema.prisma`
2. `npx prisma generate` (regenera tipos TypeScript)
3. `npx prisma db push` (aplica a PostgreSQL)
4. Usar el campo en rutas Express
5. Comunicar al equipo: "ejecutar prisma generate + db push después de pull"

**Consecuencia:**
Se agregó sección "Cuando Re-ejecutar Comandos Prisma" al README con tabla de situaciones y el error TS2339 documentado en "Solución de Problemas".

---

## ADR-021: Campo belnr_cobro en PedidoVenta para trazabilidad de pagos
**Estado:** Aprobado
**Fecha:** Marzo 2026 (Sprint 8)

**Contexto:**
Al cobrar en Caja, el backend genera un documento clase W con su BELNR. Este número es la referencia del cobro. Sin embargo, el pedido de venta no almacenaba esta referencia, por lo que no se podía mostrar el Nº Documento del cobro en el listado de pedidos.

**Decisión:** Agregar campo nullable `belnr_cobro` en la tabla `pedidos_venta` que se llena automáticamente al cambiar el estado a "Procesado" durante el cobro.

**Flujo:**
1. Cajero cobra partida → POST `/api/cobros` genera BELNR clase W
2. `cobros.ts` marca partidas como PAGADO
3. Busca pedidos vinculados via `partidas_abiertas.vbeln`
4. Actualiza `pedidos_venta.estado = 'Procesado'` **y** `belnr_cobro = belnr`
5. Listado de pedidos muestra la columna "Nº Documento" con el BELNR

**Consecuencia:**
Trazabilidad completa pedido → cobro. Facilita auditoría y reconciliación con SAP.

---

## ADR-022: Caja — filtros específicos reemplazan ClienteSearch
**Estado:** Aprobado
**Fecha:** Marzo 2026 (Sprint 8)

**Contexto:**
La sección de Caja usaba un `ClienteSearch` con autocompletado (mismo componente que Pedidos) para seleccionar un cliente y cargar sus partidas. El cliente solicitó reemplazar esto por 4 filtros independientes que permitan buscar documentos por cualquier criterio.

**Decisión:** Reemplazar `ClienteSearch` + botón "Cliente Boleta" + input genérico por 4 filtros específicos:
1. **Cliente** — busca por código (kunnr, contains)
2. **Nombre** — busca por nombre del cliente (nombreCliente, contains, case-insensitive)
3. **Nº Documento** — busca por BELNR (contains)
4. **Nº Pedido** — busca por VBELN vinculado (contains)

Se mantiene el dropdown de Estado (Todos/Vigente/Por vencer/Vencida/Pagada).

**Cambios derivados:**
- Backend `partidas.ts` ahora retorna `nombre_cliente` (JOIN con tabla clientes) y `vbeln`
- `IPartidaAbierta` tiene campos opcionales `nombreCliente` y `vbeln`
- `useCaja.ts` tiene 4 estados de filtro individuales en lugar de `filtroTexto`
- Filtrado es client-side (todas las partidas se cargan al montar)
- Título de la sección cambió de "Pago Cuenta Corriente — Cobro Efectivo" a "Listado documentos"
- Columna "Importe" renombrada a "Valor"

**Consecuencia:**
Mayor flexibilidad para el cajero — puede buscar documentos sin conocer el cliente de antemano.

---

## ADR-023: Menú lateral en módulo Pedidos (patrón CajaPage)
**Estado:** Aprobado
**Fecha:** Marzo 2026 (Sprint 9)

**Contexto:**
El cliente solicitó agregar un menú de navegación interno al módulo Pedidos, replicando la barra horizontal del WebDynpro SAP (Cotización | Pedido | Buscar documento | Clientes | Nota de Crédito | Reporte DIIO).

**Decisión:** Crear `PedidosPage.tsx` como wrapper que contiene un menú lateral vertical (200px) + contenido dinámico, reutilizando el patrón exacto de `CajaPage.tsx`. El wrapper renderiza `PedidoListPage` como contenido por defecto.

**Por qué vertical y no horizontal (tabs):**
- Consistencia visual con el módulo Caja que ya usa menú lateral vertical
- Más espacio para etiquetas largas en español
- El menú lateral es un patrón reconocido en apps empresariales SAP Fiori

**Consecuencia:**
- `PedidoListPage` no se modifica — se embebe dentro del wrapper
- Las rutas `/pedidos/nuevo` y `/pedidos/:vbeln` siguen como páginas independientes
- Tests existentes de PedidoListPage no se rompen

---

## ADR-024: Modelo Cliente ampliado con 21 campos SAP
**Estado:** Aprobado
**Fecha:** Marzo 2026 (Sprint 9)

**Contexto:**
El panel "Clientes" requiere mostrar datos completos del maestro deudor SAP: datos generales (19 campos de creación) y ficha (línea de crédito, interlocutores, socios, empresas relacionadas).

**Decisión:** Ampliar el modelo `Cliente` en Prisma con 21 campos nullable. Todos nullable para no romper datos existentes ni requerir migración destructiva.

**Campos agregados:**
- Datos generales: tratamiento, nombre2, concepto_busqueda, giro, direccion, region, ciudad, comuna, zona_transporte, telefono, celular, fax, direccion_postal, ciudad_postal, casilla, correo_contacto, correo_factura
- Ficha: razon_social, clasificacion_comercial, representante_legal, seguro, grupo_control_credito

**Consecuencia:**
- `ICliente` tiene todos los campos como opcionales (compatibilidad backward)
- `ICrearCliente` nuevo tipo con 10 campos obligatorios + 9 opcionales
- Búsqueda por RUT funciona con o sin puntos/guiones (backend normaliza)

---

## ADR-025: Auto-sugerencias en búsqueda de clientes (debounce 300ms)
**Estado:** Aprobado
**Fecha:** Marzo 2026 (Sprint 9)

**Contexto:**
El usuario no conoce los códigos KUNNR de memoria. Necesita poder buscar clientes por nombre o RUT y ver resultados incrementales mientras escribe.

**Decisión:** Implementar auto-búsqueda con debounce de 300ms después de 3 caracteres. Se muestra una lista desplegable con los clientes que coinciden. Al seleccionar uno, se carga su ficha completa.

**Aplica a:** Tab "Buscar" y tab "Ficha" del panel Clientes.

**Búsqueda por RUT sin formato:**
El backend compara el RUT limpio (sin puntos ni guiones) cuando la búsqueda parece numérica. Así `76543` matchea con `76.543.210-K`.

---

## ADR-026: Auto-init del maestro Sap_region al arrancar el backend
**Estado:** Aprobado
**Fecha:** Septiembre 2026

**Contexto:**
El formulario "Crear Cliente" (panel Clientes, Sprint 9) carga el select de
Región desde `GET /api/sap-maestro/regiones`, que lee la tabla `Sap_region`
vía Prisma (`server/src/routes/sapMaestro.ts`). Esa tabla se pobló hasta
ahora solo con un script manual, `server/createRegiones.js`, que no forma
parte de `prisma/seed.ts` ni de ningún paso documentado en el README.

Se detectó en una VM del ambiente del cliente (misma rama `main`, mismo
commit que el ambiente local) que el select de Región cargaba vacío. El
endpoint no fallaba — devolvía `{ d: { results: [] } }` porque nadie había
ejecutado `node createRegiones.js` en esa VM. Mismo patrón de causa raíz que
ADR-020 (Prisma Client no generado) y el problema que ADR-021/pgSetup.ts ya
resolvió para `pos_parametro_general`: dato o estructura que solo existe si
alguien se acuerda de correr un script suelto al desplegar.

**Decisión:**
Extender `server/src/database/pgSetup.ts` (ya usado para auto-crear
`pos_parametro_general`, ver commit `181f5c7`) con una función
`inicializarRegiones()` que hace `upsert` de las 16 regiones de Chile contra
el modelo Prisma `SapRegion` (tabla `Sap_region`) cada vez que arranca el
backend. Se invoca en `server/src/index.ts` junto a
`inicializarTablasPostgres()`, antes de `syncService.sincronizar()`.

**Por qué Prisma y no `pg.Pool` crudo (a diferencia de `pos_parametro_general`):**
`pos_parametro_general` no está modelada en `schema.prisma`, así que
`inicializarTablasPostgres()` usa `pg.Pool` para poder hacer `CREATE TABLE
IF NOT EXISTS`. `Sap_region` **sí** está en `schema.prisma` (la tabla ya
existe vía `prisma db push`) — solo faltan los datos. Por eso
`inicializarRegiones()` reutiliza el cliente Prisma compartido
(`server/src/lib/prisma.ts`) y solo hace `upsert`, sin gestionar DDL.

**Consecuencia:**
- Cualquier ambiente nuevo o existente (VM del cliente incluida) queda con
  el maestro de regiones poblado al reiniciar el backend, sin pasos manuales.
- `server/createRegiones.js` se mantiene intacto como script de respaldo
  (mismo criterio que `createTables.js`, que tampoco se eliminó al
  automatizar `pos_parametro_general`).
- `upsert` por `Codigo` es idempotente — reiniciar el backend repetidamente
  no duplica ni corrompe datos, y si se actualiza `Descripcion` en el código
  se propaga en el próximo arranque.
- **Regla derivada:** cualquier tabla maestro (`Sap_*`) que dependa hoy de un
  script `server/create*.js` manual es candidata al mismo tratamiento. Antes
  de dar por completo un módulo que consuma un maestro nuevo, verificar si
  su fuente de datos es un script suelto sin auto-init — si lo es,
  documentarlo aquí o automatizarlo, no asumir que todos los ambientes lo
  corrieron.

---

## ADR-027: Numeración externa de BusinessPartner al crear cliente en SAP (grupo ZNAC)
**Estado:** Aprobado
**Fecha:** Septiembre 2026

**Contexto:**
Al crear un cliente (Business Partner) en SAP vía `POST /A_BusinessPartner`
(`server/src/routes/sapClientesService.ts`, `crearClienteSap()`), el
`BusinessPartnerGrouping` usado es `ZNAC` (ver historial: `0001` → `ZD01`
→ `ZNAC` → revertido a `0001` → `ZNAC` de nuevo, commits `831aed4`,
`d9cf0c3`, `d3573f7` y el fix actual — confirmar con ABAP si queda estable).
El usuario indicó que el grupo `ZNAC` usa **numeración externa**: el
número de `BusinessPartner` no lo asigna SAP automáticamente, sino que el
sistema que llama a la API debe generarlo y enviarlo explícitamente en el
campo `BusinessPartner` del body.

**Decisión:**
Se agregó la tabla de parámetros libres `pos_parametro_general` (ver
commit `181f5c7`, ADR sin número — auto-init en `pgSetup.ts`) un registro
`clave='IDCLIENTE'` cuyo `valor` guarda el último número de `BusinessPartner`
usado. Cada creación de cliente:
1. Reserva atómicamente el siguiente número: `server/src/routes/sapClientes.ts`,
   función `reservarNumeroClienteSap()` — transacción con
   `SELECT ... FOR UPDATE` sobre la fila `IDCLIENTE`, calcula `valor + 1`,
   hace `UPDATE` y `COMMIT`, **antes** de llamar a SAP.
2. Envía ese número como `BusinessPartner` en el body de
   `crearClienteSap()` (`SapCrearClienteParams.businessPartner`, nuevo campo).

**Por qué reservar el número *antes* de llamar a SAP (no después de confirmar éxito):**
La alternativa —incrementar el contador solo cuando SAP confirma la
creación— es más "limpia" (nunca deja gaps en la secuencia) pero **no es
seguridad ante concurrencia**: si dos usuarios crean un cliente casi al
mismo tiempo, ambos podrían leer el mismo `valor` y enviar el mismo
`BusinessPartner` a SAP, arriesgando un rechazo por número duplicado (o, en
el peor caso, una condición de carrera indeterminística). La reserva atómica
con `SELECT FOR UPDATE` bloquea la fila durante la transacción, así que dos
creaciones simultáneas siempre reciben números distintos. El costo es que si
la creación en SAP falla *después* de reservar, ese número queda "quemado"
(gap en la secuencia) — comportamiento estándar y aceptado en numeración
SAP (los rangos de numeración internos de SAP tienen el mismo problema ante
un rollback).

**Consecuencia:**
- `pos_parametro_general.IDCLIENTE` es ahora una fuente de verdad crítica —
  si su fila se borra o su `valor` deja de ser numérico, la creación de
  clientes falla con un error explícito (`reservarNumeroClienteSap()` lanza
  antes de intentar nada en SAP, no asume un default).
- No hay padding del número (`String(valorActual + 1)`, sin ceros a la
  izquierda) — pendiente confirmar con ABAP si el rango `ZNAC` exige un
  largo fijo.
- Pendiente verificar en la primera prueba en vivo que el `BusinessPartner`
  que SAP realmente asigna coincide con el que se envió (si no coincide,
  indicaría que `ZNAC` no es numeración externa como se asumió, o que hay
  un rango/formato distinto al esperado).

---

## ADR-028: schema.prisma como espejo completo de la BD — dry-run obligatorio antes de `db push`
**Estado:** Aprobado
**Fecha:** Septiembre 2026

**Contexto:**
El `DATABASE_URL` de `server/.env` se cambió de la BD `postgres` a `cooprinsem_poc`
(mismo servidor `172.16.33.47`). Cada BD tenía datos que la otra no:

- `postgres` tenía las 5 columnas nuevas de `pedidos_venta` (`sap_sales_order`,
  `cliente_nombre`, `cliente_rut`, `condicion_pago`, `vendedor_nombre`) y los
  pedidos reales SAP N° 37/38/39/51.
- `cooprinsem_poc` tenía 7 tablas creadas por fuera de Prisma (`Sap_producto`,
  `Sap_producto_detalle`, `Sap_viapago`, `Sap_areaventa`, `Sap_centrobeneficio`,
  `Perfiles_usuarios`, `monto_apertura`) y más datos del sync SAP.

Síntoma: `GET /api/pedidos` → 500 ("Error al consultar pedidos"), porque Prisma
selecciona todas las columnas del modelo y 5 no existían. El arreglo obvio
(`npx prisma db push`) **habría borrado las 7 tablas** no modeladas, renombrado
índices y cambiado tipos de columnas: `db push` hace que la BD sea igual al
schema, incluyendo eliminar lo que el schema no declara.

**Decisión:**
1. `schema.prisma` debe declarar **todas** las tablas de la BD, incluidas las
   creadas por scripts, por el sync SAP externo o a mano. Si una tabla no tiene
   PK, se modela con `@@ignore` (Prisma no la borra ni genera cliente).
2. Las tablas alimentadas por el sync SAP externo (`Interfases_SAP`,
   `Sap_cliente`, `Sap_clientes_direccion`) se modelan **idénticas a la BD**
   (tipos, nulabilidad, defaults, nombres de índices) para que `db push` nunca
   las altere.
3. **Antes de cualquier `db push`**, correr el dry-run y revisar la salida:
   ```bash
   cd server
   npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```
   Si aparece `DROP TABLE`, `DROP INDEX`, `DROP COLUMN`, `RENAME` o
   `SET DATA TYPE`: **no ejecutar `db push`** — ajustar el schema primero.
   `npx prisma db pull --print` muestra el schema real de la BD sin escribir
   archivos, útil para copiar modelos.
4. Ante un cambio de BD, comparar ambas (tablas, columnas y contadores de
   `pos_parametro_general`) antes de dar por buena la nueva. Los contadores
   (`IDCLIENTE`, `NPEDIDO`) **nunca se bajan**: se toma el mayor de ambas BD
   para no reusar números ya enviados a SAP (ADR-027).

**Aplicación (commit `2ec75b8`):**
- Migración aditiva `postgres` → `cooprinsem_poc` en una transacción: columnas,
  pedidos `8000000006`–`8000000009` + posiciones, clientes del seed, centro
  `0001` de `admin`, `IDCLIENTE=10000024`, `NPEDIDO=8000000009`. La BD
  `postgres` queda intacta como respaldo.
- Schema homologado; `db push` aplicó solo `NOT NULL` (0 nulos), índice único
  `usuarios.IdVendedor` (0 duplicados) y FK `usuarios.rol_cod → roles`. El
  dry-run posterior es vacío.

**Consecuencia:**
- `db push` vuelve a ser seguro sobre `cooprinsem_poc` mientras se respete la regla 1.
- Prisma pide `--accept-data-loss` al agregar índices únicos aunque no haya
  duplicados — solo usarlo tras verificar duplicados y un dry-run sin `DROP`.
- **13-10-2026:** Arquitectura SAP creó `Sap_impresora_config`,
  `Sap_usuario_vendedor` y `Sap_usuario_impresora` (sync externo). El dry-run
  mostraba `DROP TABLE` de las 3: se modelaron idénticas a la BD
  (`SapImpresoraConfig`, `SapUsuarioVendedor`, `SapUsuarioImpresora`) y el
  dry-run volvió a quedar vacío. Ante cada tabla nueva publicada por
  Arquitectura, correr el dry-run: es la forma de detectarlas.
- **14-10-2026:** el sync agregó `BusinessPartnerCategory` y
  `BusinessPartnerGrouping` a `Sap_cliente` (el dry-run mostraba `DROP COLUMN`).
  Se agregaron al modelo `SapCliente`; dry-run vacío. Arquitectura también
  agrega columnas a tablas existentes: revisar el dry-run periódicamente.
- **15-10-2026:** aparecieron `apertura_caja`, `egreso_caja` y `tipo_documento`
  (el dry-run mostraba `DROP TABLE` de las 3). Se modelaron como `AperturaCaja`,
  `EgresoCaja` y `TipoDocumento`; dry-run vacío. `apertura_caja` la usa la
  apertura de caja (ver `server/src/routes/sapCaja.ts`).
- **15-10-2026:** el POS agregó a `egreso_caja` (a pedido del usuario, ALTER
  aditivo con la tabla vacía) `nro_documento` varchar(10), `ejercicio`
  varchar(4), `motivo` varchar(50) NOT NULL DEFAULT 'EGRESO' y `creado_en`
  timestamptz NOT NULL DEFAULT now(). Modelo `EgresoCaja` actualizado, dry-run
  vacío. Informado a Arquitectura (la tabla la mantienen ellos).
- **15-10-2026 (después):** apareció `egreso_caja.descripcion` varchar(500),
  agregada por terceros (el dry-run mostraba `DROP COLUMN`). Agregada al modelo
  `EgresoCaja`; dry-run vacío. Uso por confirmar con Arquitectura; el POS no la llena.
- **15-10-2026:** el POS agregó a `apertura_caja` (a pedido del usuario, ALTER
  aditivo; la tabla tenía 3 filas de prueba) `nro_documento` varchar(10),
  `ejercicio` varchar(4) y `creado_en` timestamptz NOT NULL DEFAULT now() (las
  filas existentes quedaron con la hora del ALTER). Modelo `AperturaCaja`
  actualizado, dry-run vacío.

---

## ADR-029: Usuarios SAP del POS (`Usuarios_pos`) — vínculo por username = usuario SAP
**Estado:** Aprobado
**Fecha:** Octubre 2026

**Contexto:**
Arquitectura SAP publica en `cooprinsem_poc` la tabla `Usuarios_pos` (usuarios
del POS mantenidos en SAP: perfil `IdRol`, `IdVendedor`, cliente CME `Kunnr`,
`TipoUsuario`, bloqueos y copia de los campos del perfil). La alimenta su sync
externo y se relaciona con `Perfiles_usuarios` por `IdRol`. El equipo SAP
confirmó: los vendedores y cajeros se crean en el POS **con su mismo usuario
SAP** (ej. `DVIANA`); Administrador y Consultas no tienen perfil SAP; las
contraseñas se siguen administrando en la tabla `usuarios` del POS.

**Decisión:**
1. `Usuarios_pos` se modela en `schema.prisma` (`UsuarioPos`) idéntica a la BD
   (ADR-028; dry-run vacío, sin `db push`). El POS solo la **lee**.
2. El vínculo usuario POS ↔ usuario SAP es `usuarios.username = Usuarios_pos.IdUsuario`
   (sin mayúsculas/minúsculas). **No** se agrega columna a `usuarios`.
3. Al crear un usuario se elige su usuario SAP y se completan login, nombre,
   oficina (centro del perfil) e Id Vendedor; el rol se **sugiere** por
   `TipoUsuario` (`FI` → 3 Caja; `CO` → 2 Ventas — confirmado por SAP) y, si
   viene vacío, por prefijo del perfil (`CAJA_` → 3; `MESON_`/`TERRENO` → 2).
   El administrador puede cambiarlo. Los códigos de rol no cambian (ADR-018).
4. `IdVendedor = '00000000'` (cajeros) se guarda vacío: `usuarios.IdVendedor`
   es único y todos los cajeros chocarían.

**Por qué sin columna nueva:** el equipo SAP pidió que el login sea el usuario
SAP, así que el username ya es la llave; una columna extra duplicaría el dato y
exigiría migración. Costo: los usuarios de prueba (`admin`, `venta`, `caja`) no
quedan vinculados — Pedidos y Caja usan para ellos los valores fijos actuales.

**Aclaración SAP (2026-10-07):** `TipoUsuario` **FI = Caja, CO = Ventas** (la
primera respuesta lo indicaba al revés; coincide con los datos). Con esto el
rol de perfiles sin regla de prefijo (ej. `ESTACION_`) sale del tipo del usuario.

**Pendiente (aviso amarillo `PendientesUsuariosSap.tsx`):** canal `VS`, formato
de la apertura de caja con el cliente CME del cajero, y Fase 3 (usar el perfil
al iniciar sesión en lugar de los valores fijos de Pedidos y Caja).

---

## ADR-030: Condiciones de precio manuales del pedido (descuentos y recargos) — formato SAP y desglose de cabecera
**Estado:** Aprobado
**Fecha:** Octubre 2026

**Contexto:**
Arquitectura SAP pidió enviar los descuentos y recargos que ingresa el vendedor:
cabecera ZD02 (Descuento %, porcentual) y ZFEM (Recargo Flete Mínimo, importe
fijo); posición ZD02 (Descuento Man. %) y ZFX3 (Flete Pes./Vol., peso bruto).
El ejemplo del correo (generado por IA) ponía las condiciones dentro de
`to_Pricing` como arreglo. La regla del proyecto es que el POS no calcula
precios ni descuentos: los calcula SAP.

**Validación en QAS (08-10-2026, `$metadata` + simulaciones de solo lectura):**
- Las condiciones manuales van en **`to_PricingElement`** de cabecera y de cada
  posición, en `A_SalesOrderSimulation` y en `A_SalesOrder`. En la simulación,
  `to_Pricing` es otra entidad (solo `SalesOrder`/`TransactionCurrency`) y se
  sigue enviando `{}` para gatillar el cálculo.
- El valor va en **`ConditionRateValue`**; `ConditionAmount` no es creatable.
  ZFEM y ZFX3 con `ConditionCurrency: "CLP"`.
- ZD02: SAP la deja negativa aunque se envíe positiva.
- **ZFX3 es rechazada** por SAP ("No puede utilizar la cl.condición ZFX3 en este
  documento comercial") en todas las variantes probadas: pendiente de
  configuración en SAP.
- SAP reparte el ZD02 de cabecera en todas las líneas (sobre el precio de lista)
  y carga el ZFEM entero en **una sola** línea. El `ConditionAmount` de la
  respuesta viene con escalas distintas según la condición (ZPR0/ZFEM ×100,
  ZD02 no): no es confiable para mostrar montos.

**Decisión:**
1. Se envían solo valores > 0 (SAP interpreta 0 como "no enviado"), en la
   consulta automática de precios, en la simulación y en la creación, para que
   el precio que ve el vendedor sea el que se graba.
2. Las condiciones de **línea** quedan en el precio de la línea. Las de
   **cabecera** se muestran **solo en los totales**: el backend
   (`simularConDesgloseCabecera()` en `sapPedidos.ts`) hace hasta 3
   simulaciones en paralelo —sin cabecera, solo con ZD02, completa— y obtiene
   cada monto como diferencia de `NetAmount` (confiable). El IVA y el total son
   los de la simulación completa. Sin condiciones de cabecera se hace una sola
   simulación, como antes.
3. En la simulación línea por línea (respaldo cuando SAP rechaza el pedido
   completo) no se envían las condiciones de cabecera: un monto fijo se cargaría
   entero a cada línea.
4. Inputs solo numéricos: descuentos enteros 0-100, recargos CLP enteros.

**Consecuencia:**
- Con condiciones de cabecera, cada consulta de precios cuesta hasta 3 llamadas
  a SAP (en paralelo).
- Mientras SAP no habilite ZFX3, una línea con "Recargo" no se puede grabar (la
  línea muestra el rechazo de SAP).
- Pendiente confirmar con SAP la unidad de ZFX3 y si los descuentos admiten
  decimales.

---

## ADR-031: Pago Cta. Cte. con `ZCOOP_PAYMENT_SRV` — pago y compensación en un solo POST
**Estado:** Aprobado (pendiente primera prueba en DEV)
**Fecha:** Octubre 2026

**Contexto:**
El pago de Caja > Pago Cta. Cte. usaba `ZCOOP_JOURNALENTRY_SRV` variante 3: SAP
creaba el documento de cobro (DW) pero la factura quedaba abierta hasta que el
equipo SAP la compensaba a mano (ej. pago 1400000061). José Castillo pidió
(12-10-2026) cambiar al servicio `ZCOOP_PAYMENT_SRV` (guía de consumo v1.0,
validada por SAP en DEV: docs. 1400000068 y 1400000069), que contabiliza el
cobro y compensa las facturas (FB05) en un solo POST a `PaymentHeaderSet`.
El `$metadata` (13-10-2026) coincide con la guía; `FisPeriod` admite 2
caracteres. No hay campos de cliente ni de centro de beneficio.

**Decisión:**
1. `POST /api/sap-cta-cte/pagos` y `/pagos/preview` arman el body con
   `server/src/routes/sapPagoCompensacion.ts` (funciones puras, testeadas):
   PK 40 (Count "1") = suma de las facturas; una línea de `to_Clearing` por
   factura (BELNR + ejercicio, no el folio SII); fechas `YYYYMMDD` de Chile;
   `FisPeriod` = mes con 2 dígitos; montos `"<entero>.00"`.
2. Solo efectivo: el excedente es **vuelto** y no se contabiliza (José,
   13-10-2026). El escenario B (PK 15, saldo a favor) queda implementado en el
   módulo pero sin uso en pantalla: aplica a cheques.
3. Antes de enviar se valida la regla R1 (caja = facturas + saldo a favor) y
   Count único; un descuadre no consume folio `NCOBRO`.
4. Parámetros en `pos_parametro_general` (auto-init en `pgSetup.ts`, ADR-026):
   `CUENTA_CAJA_PAGO` (provisoria `1010504000`; según José depende del cajero,
   pero el dato no existe en `Usuarios_pos` ni `Perfiles_usuarios`) y
   `PAGO_MULTIPLE` (`N` hasta validar 1 factura; `S` habilita el escenario C
   sin desplegar código). El backend también rechaza varias facturas si está en `N`.
5. Documentos con más de una partida abierta (cuotas) quedan bloqueados: el
   servicio compensa por documento, no por posición (pendiente con José).
6. Se mantiene la detección "Pagada · pend. compensación" (texto `PAGO FACT` de
   la variante 3) mientras existan pagos antiguos sin compensar.
7. El servicio **no es idempotente**: nunca se reintenta solo. Ante un corte de
   red se busca el pago por `RefDocNo` en `FAR_CUSTOMER_LINE_ITEMS` (sin filtro
   `IsCleared`) antes de dejar reintentar.
8. Errores frecuentes de SAP (F5/093, F5/263, 00088, 00349) se traducen para el
   cajero, conservando el mensaje original.

**Consecuencia:**
- La factura queda compensada al pagar; deja de aparecer en partidas abiertas.
- La apertura de caja sigue en `ZCOOP_JOURNALENTRY_SRV` (sin cambios).
- Los tests de funciones puras del backend (`server/src/**/*.test.ts`) corren con
  el Vitest de la raíz; `server/tsconfig.json` los excluye del build.
- Pendiente: primera prueba en DEV (1 factura), luego habilitar `PAGO_MULTIPLE`;
  cuenta de caja por cajero y centro de beneficio; compensación de los pagos
  antiguos de la variante 3; pago por cuotas; notas de crédito y débito.

---

## ADR-032: Búsqueda local de clientes solo grupo BP ZNAC y descripción de tipo de documento desde `tipo_documento`
**Estado:** Aprobado
**Fecha:** Octubre 2026

**Contexto:**
José Castillo pidió (14-10-2026) dos cambios: (1) que la búsqueda de clientes
liste solo el grupo BP `ZNAC`, para una lista más limpia; (2) que Caja > Pago
Cta. Cte. muestre la descripción del tipo de documento desde la tabla
`tipo_documento` (SAP manda D1 y D6 ambos como "Factura") y que esa tabla se
mantenga en Administración > Maestros POS. `Sap_cliente` (677 filas) tiene 104
clientes ZNAC; `tipo_documento` ya existía con 108 filas, cargada por un sync
de Arquitectura.

**Decisión:**
1. `GET /api/sap-cliente-tabla` filtra siempre `BusinessPartnerGrouping = 'ZNAC'`
   (constante `GRUPO_BP_CLIENTES_POS`). Aplica a todas las búsquedas locales:
   Nuevo Pedido, Clientes (Buscar y Ficha), Caja > Pago Cta. Cte. y Ant. Cliente.
   La búsqueda en vivo contra SAP no se filtra.
2. La sugerencia de Clientes > Ficha pasa de la tabla `clientes` del POC a
   `Sap_cliente`, como Buscar (la tabla del POC no tiene grupo BP).
3. El Cliente Boleta `999999` es grupo `ZESP` y **no** se incluye (decisión del
   usuario): se carga con el botón "Cliente Boleta"; en Caja no aparece en la
   búsqueda y así lo indica el aviso amarillo de Pago Cta. Cte.
4. `GET /api/sap-cta-cte/partidas` completa `tipoDocumentoNombre` con
   `tipo_documento.ltext`. La grilla muestra solo la descripción; si el código
   no está en la tabla, muestra el código.
5. Maestros POS > Tipo Documento: CRUD (`/api/pos-maestros/tipos-documento`),
   llave = código (1-2 caracteres, no editable), descripción hasta 50.
6. El filtro de la API de partidas a solo D1/D6 queda **en espera** (usuario,
   14-10-2026): filtrarlo ocultaría las DW que hoy detectan los pagos antiguos
   sin compensar ("Pagada · pend. compensación", ADR-031).

**Consecuencia:**
- Clientes de otros grupos (ZPER, ZDES, etc.) no aparecen en las búsquedas
  locales, ej. AGRICOLA FLORA SPA (ZDES).
- El sync de Arquitectura puede reemplazar lo editado en `tipo_documento`
  desde el POS (avisado en la pantalla).

---

## ADR-033: Facturación del pedido POS en 3 pasos (pedido → factura → folio)
**Estado:** Aprobado (en modo prueba: parámetros en N)
**Fecha:** Octubre 2026

**Contexto:**
José Castillo envió (16-10-2026) el documento "Creación de factura POS — ejemplo
de los 3 pasos SAP": 1) `API_SALES_ORDER_SRV` crea el pedido (ya implementado),
2) `API_BILLINGDOCUMENT` (OData **V4**, action `CreateFromSDDocument`) crea la
factura desde el pedido, 3) `ZPOS_PRINT_SRV/PrintInvoiceSet` (V2) pide el folio
DTE (espera hasta 60 s). Respuestas del mismo día: por ahora solo se factura un
pedido nuevo con Tipo Documento "Venta normal" (ZV01) y Boleta/Factura =
"Factura"; `Fkart` = clase del pedido (ZV01 factura, ZV02 boleta);
`IndExencion` fijo "0". Ambos servicios están activos en DEV (`$metadata` 200
con el usuario técnico `SCLPOS_01`).

**Decisión:**
1. `POST /api/sap-facturas/emitir` (`server/src/routes/sapFacturas.ts`; cuerpos
   en `sapFacturasBody.ts`, funciones puras testeadas) hace los pasos 2 y 3 en
   el backend, para que el avance se grabe aunque se cierre el navegador. El
   frontend lo llama apenas SAP devuelve el `SalesOrder` (modal "Pedido creado").
2. Las posiciones a facturar se leen desde SAP (`A_SalesOrder?$expand=to_Item`),
   no del carro: posición a 6 dígitos, cantidad completa, unidad de SAP.
3. **Sin duplicados:** antes de crear se busca la factura del pedido con
   `BillingDocumentItem?$filter=ReferenceSDDocument eq '<pedido 10 dígitos>'`
   (campo confirmado en el `$metadata`) y se descartan las anuladas
   (`BillingDocumentIsCancelled`). Cada resultado se graba en `pedidos_venta`
   apenas llega y el reintento continúa desde el primer paso que falte.
4. Token CSRF por servicio (la V4 desde su propio `$metadata`), reintento único
   ante 403. Timeout del folio: 90 s.
5. Parámetros (`pos_parametro_general`, auto-init en `pgSetup.ts`):
   `FACTURA_SAP_HABILITADO` (N = solo muestra el JSON), `FACTURA_CLASE_SAP`
   (clase de la factura), `FOLIO_SAP_HABILITADO` (N = se detiene tras la
   factura). Se crean con N / ZF2 / N; en DEV quedaron en S / ZV01 / S tras la
   prueba del 16-10-2026.
6. `pedidos_venta` + 10 columnas opcionales (ALTER aditivo del POS, dry-run
   vacío): `factura_sap`, `factura_clase`, `factura_doc_contable`,
   `factura_ejercicio`, `factura_estado`, `factura_mensaje`, `folio`,
   `folio_codigo`, `folio_mensaje`, `facturado_en`.
7. La pantalla muestra cada llamada a SAP con su URL, el JSON enviado y la
   respuesta (botón Copiar), y "Reintentar desde el paso pendiente".

**Prueba en DEV (16-10-2026, pedido 83):**
- `ZF2` → VF/007 "Clase de facturación ZF2 no prevista". En DEV las facturas de
  pedidos ZV01 son clase **ZV01** (lo mismo ZV04/ZV06/ZV07): `FACTURA_CLASE_SAP = ZV01`.
- Con los campos del ejemplo en `_Reference` (clase, fecha, organización, país,
  `_Item`) → SDBIL_BD_RAP/001; con `_Item` la unidad va en el código del idioma
  ES ("UN"; PCE/ST → BM/305). SAP aceptó solo la referencia **mínima**
  (`SDDocument` + `SDDocumentCategory "C"`), que factura el pedido completo.
- La action responde HTTP 200 con la factura **vacía**: el número se obtiene
  buscando la factura del pedido. Factura creada: **90000050**, contabilizada
  (doc. contable 1800000051).
- Folio: `ZPOS_PRINT_SRV` responde "Timeout: folio no asignado … en 60 seg"
  (`Zcodigo ???`) también al repetir. Pendiente en SAP (job del folio / SII).

**Consecuencia:**
- Con `FACTURA_SAP_HABILITADO = S` cada prueba crea documentos reales en SD/FI
  (la factura aparece como partida en Caja). Se pueden anular con la action
  `CreateCancellationDocument` del mismo servicio.
- Pendiente con SAP: clase real de factura/boleta, si el folio en DEV va al SII
  real, quién imprime el DTE, doble facturación en `CreateFromSDDocument`,
  `RequestedDeliveryDate`/`CustomerPaymentTerms`/`PurchaseOrderByCustomer` del
  pedido, consumidor final y autorización de `SCLPOS_01` para crear facturas.
