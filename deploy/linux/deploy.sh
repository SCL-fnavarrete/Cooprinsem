#!/usr/bin/env bash
# Despliega una versión del Cooprinsem POS en el servidor Linux (ADR-049). Sin sudo.
#   bash deploy.sh                 # último commit de la rama pre-build
#   bash deploy.sh <commit|rama>   # una versión puntual
#   bash deploy.sh --volver        # vuelve a la versión anterior
#   bash deploy.sh --estado        # muestra la versión activa
# Cada versión se compila en su propia carpeta; "current" cambia solo si todo compiló bien.
# Nunca ejecuta prisma db push (BD compartida, ADR-028).
set -euo pipefail

BASE=/opt/cooprinsem-pos
REPO="$BASE/repo"
RAMA_DEMO=pre-build
CONSERVAR=3
SERVICIO=cooprinsem-pos-backend
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

# Node puede venir de nvm: cargar el perfil del usuario
if ! command -v node >/dev/null; then
  # shellcheck disable=SC1090
  source ~/.nvm/nvm.sh 2>/dev/null || true
fi

reiniciar_y_probar() {
  systemctl --user restart "$SERVICIO"
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3101/health >/dev/null 2>&1; then
      echo "Backend arriba: $(readlink -f "$BASE/current")"
      return 0
    fi
    sleep 1
  done
  echo "El backend no respondió en 30 s. Revisar: journalctl --user -u $SERVICIO -n 50" >&2
  return 1
}

case "${1:-}" in
  --estado)
    echo "Activa: $(readlink -f "$BASE/current" 2>/dev/null || echo ninguna)"
    ls -1t "$BASE/releases"
    systemctl --user --no-pager status "$SERVICIO" | head -5
    exit 0
    ;;
  --volver)
    ACTUAL="$(readlink -f "$BASE/current")"
    ANTERIOR="$(ls -1dt "$BASE"/releases/*/ | sed 's#/$##' | grep -vx "$ACTUAL" | head -1 || true)"
    [[ -n "$ANTERIOR" ]] || { echo "No hay versión anterior" >&2; exit 1; }
    ln -sfn "$ANTERIOR" "$BASE/current.tmp" && mv -Tf "$BASE/current.tmp" "$BASE/current"
    reiniciar_y_probar
    exit 0
    ;;
esac

[[ -f "$BASE/shared/server.env" ]] || { echo "Falta $BASE/shared/server.env (ver deploy/linux/README.md)" >&2; exit 1; }

echo "== Código"
if [[ ! -d "$REPO/.git" ]]; then
  echo "Falta el repositorio en $REPO (ver deploy/linux/README.md)" >&2
  exit 1
fi
git -C "$REPO" fetch --prune origin
REF="${1:-origin/$RAMA_DEMO}"
COMMIT="$(git -C "$REPO" rev-parse --short "$REF^{commit}")"
DESTINO="$BASE/releases/$(date +%Y%m%d-%H%M)-$COMMIT"
if [[ "$(readlink -f "$BASE/current" 2>/dev/null)" == *"-$COMMIT" ]]; then
  echo "La versión $COMMIT ya está activa. Para reinstalarla, borrar su carpeta en releases/."
  exit 0
fi
echo "   $REF → $COMMIT en $DESTINO"
git -C "$REPO" worktree prune
git -C "$REPO" worktree add --detach "$DESTINO" "$COMMIT" >/dev/null

limpiar_si_falla() {
  echo "Falló la compilación: la versión activa no cambió. Carpeta borrada: $DESTINO" >&2
  git -C "$REPO" worktree remove --force "$DESTINO" 2>/dev/null || rm -rf "$DESTINO"
}
trap limpiar_si_falla ERR

echo "== Frontend"
cd "$DESTINO"
npm ci --no-audit --no-fund
npm run build:preprod

echo "== Backend"
cd "$DESTINO/server"
ln -s "$BASE/shared/server.env" .env
npm ci --no-audit --no-fund
npx prisma generate
npm run build

trap - ERR

echo "== Activar"
ln -sfn "$DESTINO" "$BASE/current.tmp" && mv -Tf "$BASE/current.tmp" "$BASE/current"
reiniciar_y_probar

echo "== Limpieza (se conservan $CONSERVAR versiones)"
ACTUAL="$(readlink -f "$BASE/current")"
ls -1dt "$BASE"/releases/*/ | sed 's#/$##' | tail -n +$((CONSERVAR + 1)) | while read -r VIEJA; do
  [[ "$VIEJA" == "$ACTUAL" ]] && continue
  git -C "$REPO" worktree remove --force "$VIEJA" 2>/dev/null || rm -rf "$VIEJA"
  echo "   borrada $VIEJA"
done
git -C "$REPO" worktree prune
