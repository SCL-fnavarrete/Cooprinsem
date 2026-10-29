#!/usr/bin/env bash
# Instalación única del Cooprinsem POS en el servidor Linux (ADR-049). Requiere sudo:
#   sudo bash instalar-root.sh
# Idempotente: se puede repetir sin romper nada. No toca PostgreSQL ni otras aplicaciones.
set -euo pipefail

USUARIO="${SUDO_USER:-automationui}"
BASE=/opt/cooprinsem-pos
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Ejecutar con sudo: sudo bash $0" >&2
  exit 1
fi
if [[ "$USUARIO" == "root" ]]; then
  echo "Ejecutar con sudo desde el usuario de la aplicación (automationui), no como root directo." >&2
  exit 1
fi
UID_USUARIO="$(id -u "$USUARIO")"

echo "== 1/5 Paquetes (nginx, git)"
FALTAN=()
command -v nginx >/dev/null || FALTAN+=(nginx)
command -v git >/dev/null || FALTAN+=(git)
if ((${#FALTAN[@]})); then
  apt-get update
  apt-get install -y "${FALTAN[@]}"
else
  echo "   ya instalados"
fi

echo "== 2/5 Carpetas en $BASE (dueño $USUARIO)"
install -d -o "$USUARIO" -g "$USUARIO" -m 755 "$BASE" "$BASE/releases" "$BASE/shared"

echo "== 3/5 Nginx (puerto 80)"
install -m 644 "$AQUI/nginx-cooprinsem-pos.conf" /etc/nginx/sites-available/cooprinsem-pos
ln -sf /etc/nginx/sites-available/cooprinsem-pos /etc/nginx/sites-enabled/cooprinsem-pos
# El sitio "default" de nginx (página de bienvenida) también usa default_server en el 80
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx 2>/dev/null || systemctl start nginx

echo "== 4/5 Firewall"
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp
else
  echo "   ufw no está activo: nada que abrir"
fi

echo "== 5/5 Servicio del backend (systemd de usuario, se reinicia sin sudo)"
# linger: el servicio de usuario arranca con el servidor aunque nadie haya iniciado sesión
loginctl enable-linger "$USUARIO"
NODE="$(sudo -u "$USUARIO" -H bash -lic 'command -v node' 2>/dev/null | tail -1)"
if [[ -z "$NODE" ]]; then
  echo "No se encontró node para $USUARIO" >&2
  exit 1
fi
echo "   node: $NODE ($("$NODE" -v))"
DIR_UNIDADES="$(getent passwd "$USUARIO" | cut -d: -f6)/.config/systemd/user"
sudo -u "$USUARIO" mkdir -p "$DIR_UNIDADES"
sed "s#@NODE@#$NODE#" "$AQUI/cooprinsem-pos-backend.service" > "$DIR_UNIDADES/cooprinsem-pos-backend.service"
chown "$USUARIO:$USUARIO" "$DIR_UNIDADES/cooprinsem-pos-backend.service"
sudo -u "$USUARIO" XDG_RUNTIME_DIR="/run/user/$UID_USUARIO" systemctl --user daemon-reload
sudo -u "$USUARIO" XDG_RUNTIME_DIR="/run/user/$UID_USUARIO" systemctl --user enable cooprinsem-pos-backend

echo
echo "Listo. Siguiente paso (sin sudo): bash $BASE/repo/deploy/linux/deploy.sh"
