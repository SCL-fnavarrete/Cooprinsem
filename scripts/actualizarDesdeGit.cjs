// Actualización automática de la VM desde git (27-10-2026). La llama VigilaPOS.bat
// antes de compilar. Trae la versión nueva de la rama main solo si:
//   1. no existe logs\PAUSAR_ACTUALIZACION (respaldo manual, sin depender del backend);
//   2. el parámetro ACTUALIZACION_AUTOMATICA_VM está en S (Admin > Parámetros) y nadie
//      usó el POS en los últimos minutos ni hay llamadas en curso (GET /api/sistema/actualizacion).
//      Si el backend no responde, nadie puede estar usándolo: se actualiza igual;
//   3. los únicos archivos modificados en la VM son los package-lock.json (los reescribe
//      el npm install de VigilaPOS.bat); si hay otros, no se toca nada.
// Luego "git pull --ff-only" (nunca mezcla). VigilaPOS.bat compila la versión nueva.
//
// Uso: node scripts\actualizarDesdeGit.cjs <raiz> <puerto backend>
// Salida: 0 = sin cambios o actualizado; 3 = cambió VigilaPOS.bat (debe terminar y
// correr de nuevo con la versión nueva); 1 = error (sigue con la versión actual).

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const raiz = process.argv[2] || path.resolve(__dirname, '..');
const puerto = process.argv[3] || '3001';
const RAMA = 'main';
const LOCKS = ['package-lock.json', 'server/package-lock.json'];

const fecha = () => new Date().toLocaleString('es-CL');
const log = (m) => console.log(`[${fecha()}] [git] ${m}`);

function git(args, timeout = 60000) {
  return execFileSync('git', ['-C', raiz, ...args], {
    encoding: 'utf8',
    timeout,
    // Sin credenciales guardadas, que falle en vez de quedar esperando una contraseña
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function consultarBackend() {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: puerto, path: '/api/sistema/actualizacion', timeout: 5000 }, (res) => {
      let cuerpo = '';
      res.on('data', (d) => (cuerpo += d));
      res.on('end', () => {
        try { resolve(res.statusCode === 200 ? JSON.parse(cuerpo) : null); } catch { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

async function main() {
  if (fs.existsSync(path.join(raiz, 'logs', 'PAUSAR_ACTUALIZACION'))) {
    log('Pausada (existe logs\\PAUSAR_ACTUALIZACION): no se busca versión nueva.');
    return 0;
  }
  const rama = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (rama !== RAMA) {
    log(`La VM está en la rama "${rama}", no en ${RAMA}: no se actualiza sola.`);
    return 0;
  }

  git(['fetch', '--quiet', 'origin', RAMA], 120000);
  const local = git(['rev-parse', 'HEAD']);
  const remoto = git(['rev-parse', `origin/${RAMA}`]);
  if (local === remoto) return 0; // sin novedades: no se escribe nada en el log

  const estado = await consultarBackend();
  if (estado && estado.actualizar !== 'S') {
    log(`Hay versión nueva (${remoto.slice(0, 7)}) pero se espera: ${estado.motivo || 'el backend no lo permite'}.`);
    return 0;
  }
  if (!estado) log('El backend no responde (nadie puede estar usándolo): se actualiza.');

  // Solo se descartan los package-lock.json; cualquier otro cambio local bloquea
  // Archivos versionados con cambios (sin preparar y preparados); los no versionados no importan
  const modificados = [...new Set([
    ...git(['diff', '--name-only']).split(/\r?\n/),
    ...git(['diff', '--name-only', '--cached']).split(/\r?\n/),
  ].filter(Boolean))];
  const otros = modificados.filter((f) => !LOCKS.includes(f));
  if (otros.length > 0) {
    log(`[AVISO] Archivos modificados en la VM: ${otros.join(', ')}. No se actualiza (revisar a mano).`);
    return 1;
  }
  const locks = modificados.filter((f) => LOCKS.includes(f));
  if (locks.length > 0) {
    git(['checkout', '--', ...locks]);
    log(`Se descartaron los cambios de npm en ${locks.join(', ')}.`);
  }

  log(`Actualizando ${local.slice(0, 7)} -> ${remoto.slice(0, 7)} (git pull --ff-only)...`);
  try {
    git(['pull', '--ff-only', '--quiet', 'origin', RAMA], 120000);
  } catch (e) {
    log(`[AVISO] git pull --ff-only no se pudo aplicar (¿la VM tiene commits propios?): ${String(e.stderr || e.message).trim()}`);
    return 1;
  }
  const cambiados = git(['diff', '--name-only', local, 'HEAD']).split(/\r?\n/);
  log(`Código actualizado a ${git(['rev-parse', '--short', 'HEAD'])} (${cambiados.filter(Boolean).length} archivos).`);
  if (cambiados.includes('VigilaPOS.bat')) {
    log('Cambió VigilaPOS.bat: la versión nueva se compila en la próxima revisión.');
    return 3;
  }
  return 0;
}

main().then((codigo) => process.exit(codigo)).catch((e) => {
  log(`[ERROR] ${String(e.stderr || e.message).trim()}`);
  process.exit(1);
});
