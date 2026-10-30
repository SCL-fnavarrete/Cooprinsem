# Seguridad y paso a producción — documento de trabajo

**Estado:** arquitectura definida por Arquitectura el 26-10-2026 (ADR-045): app **online** en un
**servidor central Linux**, usada desde la **intranet** por navegador, **sin SQLite ni offline**.
Implementación pendiente de aprobación (ver §6).
**Relacionado:** ADR-045 (arquitectura), ADR-035 (Visualizador / encabezado `X-POS-Usuario`),
ADR-042 (pre_prod en la VM), ADR-031 (pagos no idempotentes), PRD §8.3 (seguridad).

> **Historial:** 22-10 en pausa esperando a Arquitectura · 23-10 Arquitectura indica app
> instalada en cada POS (~100 PC) · **26-10 reemplazado:** servidor central Linux, todo online.

---

## 0. Arquitectura vigente (correo de José Castillo, 26-10-2026)

```
Equipos locales (navegador)         Servidor central (Linux)              SAP
PC Ventas  ─┐                       App web (diagrama: Next.js 16 +
PC Caja    ─┼── HTTPS (intranet) ──▶   NextAuth; POS hoy: React+Express)
Tablet     ─┘                          │
terreno                             PostgreSQL (BD central)
                                       │
                                    Integración SAP (cola · reintentos)
                                       │
                                    Broker · middleware SAP ───────────▶ SD
```

**Qué resuelve de lo que estaba pendiente**

| Pregunta (§4) | Respuesta |
|---|---|
| ¿Dónde vive la app? | Servidor central, no en cada POS ni por sucursal |
| ¿Windows o Linux? | **Linux** |
| ¿Acceso? | **Intranet Cooprinsem**, HTTPS, por navegador |
| ¿BD local u offline? | **No.** Solo PostgreSQL central |
| ¿El backend propio se queda? | Sí: hay capa de servidor e integración entre la BD y SAP |
| ¿Instalador .exe / Electron / actualizaciones en 100 PC? | **No aplica:** se publica una vez en el servidor |

**Qué deja de ser riesgo (respecto del modelo "app en cada POS")**
- Credenciales del usuario técnico SAP copiadas en ~100 equipos → quedan solo en el servidor.
- Contraseñas de usuarios copiadas en SQLite para el login offline → se elimina.
- Contadores `NPEDIDO` / `NCOBRO` y sincronización de maestros ×100 → una sola BD central.
- Backend expuesto en `localhost` de cada PC y distribución de versiones → un solo despliegue.

**Pedido concreto al POS**
1. Que el modelo de desarrollo **no cargue datos locales al iniciar** → quitar SQLite (§0.1).
2. **Publicar en el servidor Linux** → §3.

### 0.1 Quitar SQLite / offline del código — ✅ hecho el 26-10-2026 (rama `refactor/sin-sqlite-offline`)

| Pieza | Dónde | Acción |
|---|---|---|
| Base SQLite local (`server/data/cooprinsem_local.db`) | `server/src/database/localDb.ts` | Eliminar |
| Copia PostgreSQL → SQLite al arrancar (roles, usuarios, clientes, materiales) | `syncService.ts`, `server/src/index.ts` | Eliminar la llamada y el módulo |
| Login de respaldo contra SQLite (contraseñas copiadas) | `server/src/routes/auth.ts` | Dejar solo el login contra PostgreSQL; si la BD no responde → 503 claro |
| Admin > Maestros POS > "Clientes" (clientes locales: listar, limpiar, recargar) | `posMaestros.ts` (backend y API), `PosMaestrosPanel.tsx` | Eliminar pestaña y rutas `/clientes-local` |
| Dependencia `better-sqlite3` (requiere compilación nativa) | `server/package.json` | Quitar; simplifica el build en Linux |
| Campo `modo: 'online' / 'offline'` del login | `auth.ts`, frontend | Quitar si nada lo usa |

No toca la sincronización de maestros `Sap_*` / `Usuarios_pos` de Arquitectura (PostgreSQL),
que sigue igual. **Pendiente en cada ambiente (VM incluida):** borrar `server/data/cooprinsem_local.db`.

---

## 1. Diagnóstico actual (revisado en el código, 22-10-2026; actualizado 26-10)

| # | Hallazgo | Dónde | Riesgo |
|---|----------|-------|--------|
| 1 | Contraseñas en texto plano; el login compara en la consulta (`username = ? AND password = ?`) | `server/src/routes/auth.ts`, `usuarios.password` | Quien acceda a la BD compartida ve todas las contraseñas |
| 2 | El login no entrega sesión ni token; el frontend guarda el usuario en `sessionStorage` y envía `X-POS-Usuario` en cada llamada | `src/services/api/encabezadoUsuario.ts` | El encabezado se puede falsificar a mano |
| 3 | Ninguna ruta del backend exige sesión (ej. `GET /api/admin/usuarios`, POST que contabilizan pagos en SAP con el usuario técnico) | `server/src/index.ts` | Cualquiera que llegue al puerto 3001 puede operar |
| 4 | Roles validados en el backend solo para el Visualizador (rol 5); el resto solo en pantalla (`ProtectedRoute`) | `server/src/middleware/soloLectura.ts` | Un vendedor podría llamar rutas de Caja/Admin |
| 5 | Datos de identidad llegan en el cuerpo desde el navegador (ej. `usuario` del pago parcial → cliente CME del cajero en SAP) | `usePagoDetalle.ts`, `sapCtaCte.ts` | Riesgo contable: cobrar a nombre de otro cajero |
| 6 | CORS abierto (`cors()`), sin límite de intentos de login | `server/src/index.ts` | Fuerza bruta, llamadas desde otros orígenes |
| 7 | Frontend servido con `vite preview` (no es servidor de producción), sin HTTPS | ADR-042 | Credenciales y datos en claro en la red |
| 8 | **(26-10)** Copia de usuarios **con contraseñas** en SQLite y login offline sin conexión a la BD | `localDb.ts`, `auth.ts` | Contraseñas en un archivo local; se resuelve al quitar SQLite (§0.1) |

Con la app en un servidor de la intranet (muchas personas en la misma red), los puntos 2, 3, 4 y 5
pasan a ser **críticos**: cualquier equipo de la intranet llegaría al backend.

---

## 2. Recomendación de autenticación (backend)

Sigue vigente y ahora es más simple: un solo servidor, una sola BD de sesiones. El diagrama
de Arquitectura indica **NextAuth** (sesiones en el servidor), que es el mismo enfoque que
se recomienda aquí; si el stack se mantiene en Express, el equivalente es `express-session`.

1. **Sesión en el servidor con cookie** (`express-session` + `connect-pg-simple`, guardada en
   la PostgreSQL central): cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Revocable al instante
   (logout, bloqueo, cambio de rol), sin token en JavaScript. Frontend y backend detrás del mismo
   Nginx → mismo origen (`/api` relativo, ADR-042). Expiración: 30 min de inactividad (PRD) y
   máximo absoluto ~12 h (turno).
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
8. **Opcional:** login contra Active Directory / Entra ID de la intranet (OIDC, con MFA) o con
   el usuario SAP, para no tener contraseñas propias del POS. NextAuth / Auth.js lo soporta
   directo; en Express, con `openid-client`.

**Etapas (sin cortar el servicio):**
0. ~~Quitar SQLite y el login offline (§0.1)~~ — hecho el 26-10-2026.
1. Hash + límite de intentos + cookie de sesión al iniciar sesión; el backend acepta sesión y
   todavía el encabezado, y registra quién llega sin sesión.
2. Exigir sesión y roles en todas las rutas; identidad (CME, vendedor, sucursal) desde la sesión.
3. Quitar `X-POS-Usuario`, cerrar CORS, auditoría, ADR nuevo y actualizar ADR-035.

Estimación: 2 a 3 días con tests (middlewares de sesión y rol) y prueba en Chrome por rol.
**Recomendación:** las etapas 1 y 2 antes de abrir el servidor a usuarios de la intranet.

---

## 3. Despliegue en el servidor Linux (escenario elegido: red privada, Linux)

> **Aplicado para la demo (29-10-2026, ADR-049):** `http://172.16.33.47/`, Nginx + servicio
> systemd de usuario (backend en `127.0.0.1:3101`), BD con `pos_app` (sin superusuario),
> `deploy/linux/deploy.sh` desde la rama `pre-build` (compila en el servidor, versión por carpeta).
> HTTP hasta definir si es la infraestructura final. La tabla de abajo queda como referencia.

| Pieza | Propuesta |
|---|---|
| Servidor web | **Nginx**: sirve el frontend compilado (`dist/`) y reenvía `/api` al backend en `127.0.0.1:3001`. `index.html` con `Cache-Control: no-cache` y `assets/` (nombres con hash) con caché larga, para que el navegador tome cada versión nueva sin Ctrl+F5 (pasó en la VM el 26-10) |
| Backend | Node como servicio **systemd** (o PM2), solo en `localhost`; reinicio automático; logs con `journald` |
| Alternativa | **Docker Compose** (nginx + backend), si Arquitectura ya usa contenedores |
| HTTPS | Certificado de la CA interna de Cooprinsem (o el que defina Arquitectura) |
| BD | PostgreSQL central (¿la misma `cooprinsem_poc` o una nueva productiva?) |
| Secretos | `server/.env` con permisos 600 y usuario de servicio sin login; credenciales SAP solo ahí |
| Versiones | Compilar en CI o en un equipo de build y copiar el resultado (no compilar en el servidor); carpeta por versión + enlace `current` para volver atrás en segundos |
| Prisma | `prisma generate` en el build; **nunca `db push` en el servidor sin dry-run** (ADR-028) |
| Monitoreo | Endpoint `/health`, alerta si el servicio cae o SAP no responde |

Lo que cambia respecto del pre_prod actual (ADR-042):
- `VigilaPOS.bat` y NSSM/WinSW quedan **solo para la VM Windows de pre_prod**; en Linux el
  equivalente es un script de despliegue (`git pull` / artefacto → build → `systemctl restart`).
- `vite preview` se reemplaza por Nginx (servidor de producción real).
- `better-sqlite3` sale del proyecto (§0.1): evita compilar módulos nativos en Linux.
- Las rutas del frontend ya son relativas (`/api`, `.env.preprod`), así que funcionan detrás de
  Nginx sin cambios.

**Tablets de terreno:** si salen de la intranet, preferir **VPN** (corporativa o
Tailscale/WireGuard) antes que exponer el servidor a internet. Si se expone, aplica el
escenario público (zero-trust con Cloudflare Access / Azure App Proxy, MFA, WAF, `helmet`,
prueba de penetración).

---

## 4. Preguntas para Arquitectura

### A. Dónde va a vivir la app
- [x] ¿Servidor central, por sucursal o nube? → **Servidor central** (26-10)
- [x] ¿Windows Server o Linux? → **Linux** (26-10)
- [ ] ¿Quién administra el servidor (parches, respaldos, monitoreo)? IP: `172.16.33.47` (demo, 29-10); dominio pendiente
- [ ] ¿Ambientes separados DEV / QAS / PRD, cada uno con su SAP y su BD?
- [ ] ¿La BD PostgreSQL productiva es la misma `cooprinsem_poc` o una nueva? ¿Respaldos y retención?
- [x] ¿Cómo se despliegan versiones? → SSH con llave + `deploy.sh` desde `pre-build`, con vuelta atrás (ADR-049). Falta: ventana de cambios y aprobaciones
- [ ] ¿Docker disponible en el servidor o servicio systemd directo?
- [ ] ¿Capacidad esperada? (18 sucursales, ~11 transacciones por sucursal al día, usuarios simultáneos)

### B. Qué nivel de seguridad requerimos
- [x] ¿Acceso solo red corporativa o internet? → **Intranet** (26-10). Falta: tablets de terreno
- [ ] Tablets de terreno (4G): ¿VPN o se expone el servidor?
- [ ] ¿Política de identidad: Active Directory / Entra ID? ¿MFA? ¿Login con usuario SAP?
- [ ] ¿Requisitos de contraseña, expiración de sesión y bloqueo por intentos?
- [ ] ¿Certificados: CA interna o públicos? ¿Quién los emite y renueva?
- [ ] ¿Normativa aplicable? (Ley 19.628 / nueva ley de datos personales, SII, auditoría interna, PCI si se integran tarjetas con Transbank)
- [ ] ¿Requisitos de auditoría: qué se registra, cuánto tiempo, quién lo revisa?
- [ ] ¿Se exige prueba de penetración o revisión de seguridad antes de producción?
- [ ] ¿Gestión de secretos: dónde viven las credenciales del usuario técnico SAP? ¿Rotación?

### C. Qué servicios estarán disponibles
- [ ] ¿Proxy inverso / WAF / balanceador corporativo existente delante del servidor Linux?
- [ ] ¿Servicio de identidad (AD, Entra ID, SAP IdP) con OIDC/SAML para integrarse?
- [ ] ¿Monitoreo y logs centralizados? ¿Alertas a quién?
- [ ] ¿Acceso a SAP desde el servidor Linux: red interna directa o solo vía el Broker?
- [ ] ¿Usuarios técnicos SAP por ambiente y con permisos mínimos (hoy `SCLPOS_01`)?
- [ ] ¿Correo (SMTP) para avisos, por ejemplo el estado de cuenta en PDF?
- [ ] ¿Impresoras: quién imprime boletas, facturas y comprobantes (SAP o el POS)?

### D. Nuevas por el correo del 26-10
- [ ] **Stack:** el diagrama dice **Next.js 16 + NextAuth**; el POS es React 18 + Vite + Express.
  ¿Es solo el bloque lógico o se pide migrar? (migrar es un proyecto aparte; la recomendación
  es mantener el stack y desplegarlo tal cual en Linux)
- [ ] **Integración SAP (cola · reintentos) y Broker / middleware SAP:** ¿quién los construye y
  opera? ¿El backend del POS sigue llamando directo a SAP o pasa por el broker?
- [ ] **Idempotencia:** `ZCOOP_PAYMENT_SRV` no es idempotente (ADR-031). Una cola con reintento
  automático podría duplicar pagos o pedidos. ¿El broker maneja llave de idempotencia
  (ej. `RefDocNo` / `NCOBRO`) o la cola solo reintenta lo que SAP confirma que no grabó?
- [ ] **Continuidad sin offline:** si se cae la intranet / VPN de una sucursal o el servidor,
  ¿procedimiento de contingencia (venta manual, WebDynpro)?
- [x] **Sincronización de maestros** (`Sap_*`, `Usuarios_pos`): sigue a cargo de Arquitectura
  hacia la BD central (no es la SQLite local).

### E. Otras
- [ ] **Datos de prueba en DEV** (pedidos 126 y 128, entrega 8000000099, anticipos 1400000119/120): limpiar antes de comparar con producción.
- [ ] **Responsables:** quién aprueba el paso a producción, quién da soporte de primer nivel y quién de segundo.

---

## 5. Opciones descartadas (para referencia)

- **App instalada en cada POS (~100 PC)** con Electron / Tauri / servicio local + navegador,
  MSIX / Intune (evaluado el 23-10): descartado por ADR-045.
- **Windows Server + IIS** (1A): Arquitectura eligió Linux.
- **Nube / exposición pública**: solo si las tablets de terreno lo requieren (§3).

---

## 6. Próximo paso al retomar
1. ~~Quitar SQLite y el login offline (§0.1)~~ — hecho el 26-10-2026.
2. Preparar el despliegue Linux (§3): Nginx + systemd, script de despliegue, `/health`.
   Necesita las respuestas de §4.A (servidor, acceso, BD).
3. **Etapas 1 y 2 de autenticación** (§2) antes de abrir el servidor a la intranet.
4. Con las respuestas de §4.D, definir cómo encaja el backend con la cola / broker de SAP.
