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

**Consecuencia:**
- Todo componente que use `Input` con `SuggestionItem` debe usar `onSelectionChange`.
- `textContent` retorna string vacío en v2 para `SuggestionItem`; usar `getAttribute('text')`.
- Los callbacks de `MessageBox` reciben `action` directamente, no un evento wrapper.
- Ante dudas, consultar la guía de migración oficial.

**Referencia:** https://sap.github.io/ui5-webcomponents-react/v2/?path=/docs/migration-guide--docs

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
