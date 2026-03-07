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
