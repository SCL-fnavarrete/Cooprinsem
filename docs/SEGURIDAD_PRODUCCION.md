# Seguridad y paso a producción — documento de trabajo

**Estado:** en pausa, esperando validación con Arquitectura (22-10-2026).
**Relacionado:** ADR-035 (Visualizador / encabezado `X-POS-Usuario`), ADR-042 (pre_prod en la VM), PRD §8.3 (seguridad).

Este documento junta el diagnóstico, las opciones y las preguntas abiertas para retomar
la autenticación del backend y el despliegue productivo cuando Arquitectura responda.

---

## 1. Diagnóstico actual (revisado en el código, 22-10-2026)

| # | Hallazgo | Dónde | Riesgo |
|---|----------|-------|--------|
| 1 | Contraseñas en texto plano; el login compara en la consulta (`username = ? AND password = ?`) | `server/src/routes/auth.ts`, `usuarios.password` | Quien acceda a la BD compartida ve todas las contraseñas |
| 2 | El login no entrega sesión ni token; el frontend guarda el usuario en `sessionStorage` y envía `X-POS-Usuario` en cada llamada | `src/services/api/encabezadoUsuario.ts` | El encabezado se puede falsificar a mano |
| 3 | Ninguna ruta del backend exige sesión (ej. `GET /api/admin/usuarios`, POST que contabilizan pagos en SAP con el usuario técnico) | `server/src/index.ts` | Cualquiera que llegue al puerto 3001 puede operar |
| 4 | Roles validados en el backend solo para el Visualizador (rol 5); el resto solo en pantalla (`ProtectedRoute`) | `server/src/middleware/soloLectura.ts` | Un vendedor podría llamar rutas de Caja/Admin |
| 5 | Datos de identidad llegan en el cuerpo desde el navegador (ej. `usuario` del pago parcial → cliente CME del cajero en SAP) | `usePagoDetalle.ts`, `sapCtaCte.ts` | Riesgo contable: cobrar a nombre de otro cajero |
| 6 | CORS abierto (`cors()`), sin límite de intentos de login | `server/src/index.ts` | Fuerza bruta, llamadas desde otros orígenes |
| 7 | Frontend servido con `vite preview` (no es servidor de producción), sin HTTPS | ADR-042 | Credenciales y datos en claro en la red |

---

## 2. Recomendación de autenticación (backend)

1. **Sesión en el servidor con cookie** (`express-session` + `connect-pg-simple`): cookie
   `HttpOnly`, `Secure`, `SameSite=Strict`. Revocable al instante (logout, bloqueo, cambio de
   rol), sin token en JavaScript. Frontend y backend ya están en el mismo origen (`/api`
   relativo, ADR-042). JWT solo si aparecen varios backends o la app móvil de Fase 2 lo exige.
   Expiración: 30 min de inactividad (PRD) y máximo absoluto ~12 h (turno).
2. **Contraseñas con hash** (`argon2id` o `bcrypt`). Migración transparente: en el siguiente
   login, si la contraseña guardada no tiene hash se compara en claro y se reemplaza. Bloqueo
   de 15 min tras 5 intentos + `express-rate-limit` en `/api/auth/login`.
3. **Autorización en el backend:** middleware global `requiereSesion` (excepto `/health` y
   `/api/auth/login`) y `requiereRol` por módulo, alineado con `ProtectedRoute`. La regla del
   Visualizador toma el rol de la sesión.
4. **Identidad desde la sesión:** eliminar `X-POS-Usuario` y los `usuario` de los cuerpos;
   CME del cajero, Id Vendedor, sucursal y auditoría salen de la sesión.
5. **CSRF:** `SameSite=Strict` + revisión del encabezado `Origin` en POST/PUT/PATCH/DELETE.
6. **Auditoría:** tabla `auditoria_pos` (quién, cuándo, acción, IP) para login, pagos,
   pedidos, aperturas, egresos y cambios de usuarios.
7. **Frontend:** sin encabezado manual; 401 → login con "sesión expirada"; logout llama a
   `/api/auth/logout`; `sessionStorage` solo para mostrar nombre y rol.
8. **Opcional:** login contra SAP o Active Directory / Entra ID (OIDC, con MFA) para no tener
   contraseñas propias del POS. El PRD ya plantea "mismos usuarios SAP del WebDynpro".

**Etapas (sin cortar el servicio):**
1. Hash + límite de intentos + cookie de sesión al iniciar sesión; el backend acepta sesión y
   todavía el encabezado, y registra quién llega sin sesión.
2. Exigir sesión y roles en todas las rutas; identidad (CME, vendedor, sucursal) desde la sesión.
3. Quitar `X-POS-Usuario`, cerrar CORS, auditoría, ADR nuevo y actualizar ADR-035.

Estimación: 2 a 3 días con tests (middlewares de sesión y rol) y prueba en Chrome por rol.

---

## 3. Opciones de despliegue productivo

**Base común a cualquier escenario:** servidor web real (IIS o Nginx) sirviendo los
estáticos y reenviando `/api` al backend; backend como servicio (NSSM / WinSW / systemd)
escuchando solo en `localhost`; HTTPS; CORS limitado al dominio; secretos con permisos
restringidos; usuario técnico SAP con permisos mínimos; BD y SAP productivos separados de
DEV; respaldos de PostgreSQL; monitoreo y alertas; desplegar una versión ya compilada (CI),
no compilar en el servidor.

| Escenario | Opción | Notas |
|---|---|---|
| **Red privada** (recomendado) | 1A. Windows Server + IIS (URL Rewrite + ARR) + Node como servicio | Alineado con el ecosistema actual; HTTPS con CA interna; posible login con AD |
| | 1B. Linux + Nginx + systemd / PM2 o Docker Compose | Más liviano; requiere administración Linux |
| | Vendedores en terreno | Por VPN corporativa o liviana (Tailscale / WireGuard), sin exponer el POS |
| **Público** | 2.1 Zero-trust (Cloudflare Tunnel + Access, Azure AD App Proxy) | **Preferido**: sin puertos abiertos, identidad + MFA antes de llegar al POS |
| | 2.2 DMZ con proxy inverso público (certificado público, WAF, rate limit) | El backend llega a SAP por la red interna |
| | 2.3 Nube (App Service / contenedores + PostgreSQL administrado) | Requiere VPN sitio a sitio a SAP on-premise |

En escenario público, además: MFA, cabeceras de seguridad (`helmet`), validación de
entradas, revisar que el modo técnico no exponga datos sensibles, auditoría y **prueba de
penetración antes de salir**.

**NSSM (o WinSW):** convierte `node` en servicio de Windows: arranca sin sesión iniciada,
reinicia solo si cae, rota logs, sin ventanas. Con servicios, `VigilaPOS.bat` solo compila
y hace `nssm stop` / `nssm start` al cambiar de versión. NSSM no se mantiene desde 2017;
WinSW es la alternativa mantenida.

---

## 4. Preguntas para Arquitectura

### A. Dónde va a vivir la app
- [ ] ¿Servidor central (datacenter / junto a SAP), uno por sucursal (Fase 2) o nube?
- [ ] ¿Windows Server o Linux? ¿Quién lo administra (parches, respaldos, monitoreo)?
- [ ] ¿Ambientes separados DEV / QAS / PRD, cada uno con su SAP y su BD?
- [ ] ¿La BD PostgreSQL productiva es propia del POS o compartida? ¿Quién la respalda y con qué frecuencia? ¿Cuál es la retención?
- [ ] ¿Cómo se despliegan versiones (CI/CD, ventana de cambios, aprobaciones, vuelta atrás)?
- [ ] ¿Capacidad esperada? (18 sucursales, ~11 transacciones por sucursal al día, usuarios simultáneos)

### B. Qué nivel de seguridad requerimos
- [ ] ¿Acceso solo desde la red corporativa/VPN, o también desde internet (vendedores en terreno, tablets 4G)?
- [ ] ¿Política corporativa de identidad: Active Directory / Entra ID? ¿MFA obligatorio? ¿Login con usuario SAP?
- [ ] ¿Requisitos de contraseña, expiración de sesión y bloqueo por intentos?
- [ ] ¿Certificados: CA interna o públicos? ¿Quién los emite y renueva?
- [ ] ¿Normativa aplicable? (Ley 19.628 / nueva ley de datos personales, SII, auditoría interna, PCI si se integran tarjetas con Transbank)
- [ ] ¿Requisitos de auditoría: qué se registra, cuánto tiempo, quién lo revisa?
- [ ] ¿Se exige prueba de penetración o revisión de seguridad antes de producción? ¿Quién la hace?
- [ ] ¿Gestión de secretos: dónde viven las credenciales del usuario técnico SAP? ¿Rotación?

### C. Qué servicios estarán disponibles
- [ ] ¿Proxy inverso / WAF / balanceador corporativo existente (IIS, F5, Nginx, Cloudflare, Azure Front Door)?
- [ ] ¿Servicio de identidad (AD, Entra ID, SAP IdP) con OIDC/SAML para integrarse?
- [ ] ¿Monitoreo y logs centralizados (Zabbix, Azure Monitor, ELK, Grafana)? ¿Alertas a quién?
- [ ] ¿Respaldos administrados de PostgreSQL?
- [ ] ¿Acceso a SAP desde el servidor del POS: por VPN, red interna o SAP BTP / Cloud Connector?
- [ ] ¿Usuarios técnicos SAP por ambiente y con permisos mínimos (hoy `SCLPOS_01`)?
- [ ] ¿Correo (SMTP) para avisos, por ejemplo el estado de cuenta en PDF?
- [ ] ¿Impresoras: quién imprime boletas, facturas y comprobantes (SAP o el POS)?

### D. Otras cosas para empezar a entender
- [ ] **Arquitectura objetivo:** el plan original (ADR-03/04) era frontend directo a SAP sin backend propio; hoy el backend hace pagos, facturación, maestros y sincronización. Confirmar que el backend se queda y registrarlo en un ADR.
- [ ] **Sincronización de maestros** (`Sap_*`, `Usuarios_pos`): ¿quién la opera en producción y con qué frecuencia? ¿Qué pasa si falla?
- [ ] **Continuidad:** ¿qué hace una sucursal si se cae la VPN o el servidor? (relación con la Fase 2 offline)
- [ ] **Datos de prueba en DEV** (pedidos 126 y 128, entrega 8000000099, anticipos 1400000119/120): limpiar antes de comparar con producción.
- [ ] **Responsables:** quién aprueba el paso a producción, quién da soporte de primer nivel y quién de segundo.

---

## 5. Próximo paso al retomar
1. Leer las respuestas de Arquitectura y marcar las casillas de la sección 4.
2. Elegir el escenario de despliegue (sección 3) y registrarlo en un ADR.
3. Partir por la **etapa 1 de autenticación** (sección 2), que aplica a todos los escenarios.
