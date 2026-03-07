# SESSIONS.md — Registro de Sesiones Claude Code
## Proyecto: Cooprinsem POS

Actualizar este archivo al terminar cada sesión de trabajo.
Claude Code también puede actualizarlo automáticamente al finalizar una tarea.

---

## Estado Actual del Proyecto

**Última actualización:** [fecha]
**Sprint activo:** Sprint 0 — Setup inicial
**Estado general:** 🔴 Por iniciar

---

## Checklist de Progreso

### Sprint 0 — Setup
- [ ] Scaffold Vite + React + TypeScript creado
- [ ] Dependencias instaladas
- [ ] vite.config.ts configurado (alias @, proxy SAP)
- [ ] tsconfig.json strict configurado
- [ ] Vitest configurado con jsdom
- [ ] Estructura src/ creada
- [ ] src/config/sap.ts con constantes
- [ ] .env.development configurado
- [ ] .gitignore correcto
- [ ] git init + commit inicial

### Sprint 1 — Tipos y Mocks
- [ ] src/types/cliente.ts
- [ ] src/types/articulo.ts
- [ ] src/types/pedido.ts
- [ ] src/types/caja.ts
- [ ] src/types/credito.ts
- [ ] src/types/common.ts
- [ ] src/test/factories.ts (30 artículos, 10 clientes, facturas)
- [ ] src/test/helpers.tsx (renderWithProviders)
- [ ] src/services/mock/handlers.ts (MSW)

### Sprint 2 — Módulo Pedidos
- [ ] src/utils/format.ts (formatCLP, formatRUT)
- [ ] src/utils/validar.ts (validarRUT módulo 11)
- [ ] src/services/api/clientes.ts
- [ ] src/services/api/materiales.ts
- [ ] src/services/api/pedidos.ts
- [ ] src/components/pos/ClienteSearch.tsx
- [ ] src/components/pos/ArticuloSearch.tsx
- [ ] src/components/pos/ArticuloGrid.tsx
- [ ] src/components/pos/PedidoHeader.tsx
- [ ] src/components/pos/PedidoTotals.tsx
- [ ] src/hooks/usePedido.ts
- [ ] src/features/pedidos/PedidoPage.tsx

### Sprint 3 — Módulo Caja
- [ ] src/services/api/facturas.ts
- [ ] src/services/api/cobros.ts
- [ ] src/components/pos/CajaFacturaList.tsx
- [ ] src/components/pos/PagoEfectivoModal.tsx
- [ ] src/hooks/useCaja.ts
- [ ] src/features/caja/CajaPage.tsx (8 botones, 1 habilitado)

### Sprint 4 — Auth + Finalización
- [ ] src/features/auth/LoginPage.tsx
- [ ] src/routes/ configurado
- [ ] src/layouts/AppShell.tsx
- [ ] Manejo global errores SAP
- [ ] README.md completo
- [ ] npm run build — sin errores ✅
- [ ] npm run test:coverage — ≥70% líneas ✅

---

## Pendientes Bloqueantes con Equipo ABAP

| Pendiente | Asignado a | Estado |
|-----------|-----------|--------|
| Lista servicios OData expuestos en SAP | Equipo ABAP Cooprinsem | ⏳ Pendiente |
| Credenciales acceso SAP QAS para desarrollo | Mariela / Basis SAP | ⏳ Pendiente |
| Versión OData: ¿v2 o v4? | Equipo ABAP | ⏳ Pendiente |
| Org. Ventas (código) | Equipo ABAP | ⏳ Pendiente |
| Canal Distribución (código numérico) | Equipo ABAP | ⏳ Pendiente |
| SAP Client Number | Equipo ABAP | ⏳ Pendiente |
| Nombre exacto entidades OData | Equipo ABAP | ⏳ Pendiente |
| Servicio OData para estado crediticio cliente | Equipo ABAP | ⏳ Pendiente |
| Flag materiales "NO USAR" en maestro | Equipo ABAP | ⏳ Pendiente |

---

## Log de Sesiones

### Sesión 001 — [fecha]
**Duración:** xx min
**Trabajo realizado:** Setup inicial del proyecto
**Archivos creados/modificados:** -
**Problemas encontrados:** -
**Próximo paso:** Ejecutar PROMPT 1 de SPEC_POC.md

---
<!-- Agregar nueva sesión copiando el bloque anterior -->
