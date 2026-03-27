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
