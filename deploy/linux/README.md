# Despliegue en el servidor Linux (demo) — ADR-049

Servidor `172.16.33.47` (Ubuntu 24.04, usuario `automationui`). Misma máquina que la BD
`cooprinsem_poc`. Los usuarios entran por navegador a **`http://172.16.33.47/`**.

```
Navegador ──80──▶ Nginx ──┬── /            → /opt/cooprinsem-pos/current/dist (frontend compilado)
                          └── /api, /health → 127.0.0.1:3101 (backend, servicio systemd de usuario)
                                                  └── PostgreSQL localhost:5432 (usuario pos_app) y SAP
```

| Ruta | Qué es |
|---|---|
| `/opt/cooprinsem-pos/repo` | Clon de GitHub (solo se lee; no se trabaja ahí) |
| `/opt/cooprinsem-pos/releases/<fecha>-<commit>` | Cada versión compilada (se guardan 3) |
| `/opt/cooprinsem-pos/current` | Enlace a la versión activa |
| `/opt/cooprinsem-pos/shared/server.env` | Configuración del backend (permisos 600, **no** está en git) |

La rama de las demos es **`pre-build`**.

## Instalación (una vez)

```bash
# 1. Como automationui, con sudo (pide la clave): carpetas, Nginx, firewall y servicio
sudo install -d -o automationui -g automationui /opt/cooprinsem-pos
git clone --branch pre-build https://github.com/SCL-fnavarrete/Cooprinsem.git /opt/cooprinsem-pos/repo
sudo bash /opt/cooprinsem-pos/repo/deploy/linux/instalar-root.sh

# 2. Configuración del backend (sin sudo)
nano /opt/cooprinsem-pos/shared/server.env
chmod 600 /opt/cooprinsem-pos/shared/server.env

# 3. Primera versión (sin sudo)
bash /opt/cooprinsem-pos/repo/deploy/linux/deploy.sh
```

Contenido de `server.env` (los valores de SAP son los mismos de desarrollo):

```bash
DATABASE_URL="postgresql://pos_app:<clave>@localhost:5432/cooprinsem_poc"
SAP_BASE_URL=https://vhyccs4dci.sap.cooprinsem.cl:44300/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV
SAP_ZPOS_URL=https://vhyccs4dci.sap.cooprinsem.cl:44300
SAP_USER=<usuario técnico SAP>
SAP_PASSWORD=<clave>
```

`HOST` y `PORT` los fija el servicio (`127.0.0.1:3101`): no ponerlos en `server.env`.

## Actualizar la demo

```bash
bash /opt/cooprinsem-pos/repo/deploy/linux/deploy.sh            # último commit de pre-build
bash /opt/cooprinsem-pos/repo/deploy/linux/deploy.sh --volver   # volver a la versión anterior
bash /opt/cooprinsem-pos/repo/deploy/linux/deploy.sh --estado   # versión activa
```

Compila en una carpeta nueva y solo cambia la versión activa si todo compiló; si falla, la demo
sigue con la versión anterior. No hay actualización automática: un push a `pre-build` no cambia
la demo hasta correr `deploy.sh`. **Nunca** ejecuta `prisma db push` (BD compartida, ADR-028).

## Operación

```bash
systemctl --user status cooprinsem-pos-backend
systemctl --user restart cooprinsem-pos-backend
journalctl --user -u cooprinsem-pos-backend -f      # logs del backend
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
curl http://127.0.0.1:3101/health
```

## Seguridad (demo)

- El backend escucha solo en `127.0.0.1`: desde la red solo se llega por Nginx.
- La BD se usa con `pos_app` (sin superusuario), no con `postgres`.
- Sigue pendiente la autenticación real del backend (`docs/SEGURIDAD_PRODUCCION.md` §2):
  acotar la demo a los revisores.
- HTTP sin cifrar hasta que se defina la infraestructura final.
