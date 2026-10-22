// Usado por VigilaPOS.bat: comprueba que cada dependencia de package.json esté
// instalada en node_modules de la carpeta indicada. Sale con código 1 (y lista
// las que faltan) si alguna no está, para que el script corra "npm install".
// Uso: node scripts/verificarDependencias.cjs <carpeta con package.json>
const fs = require('fs')
const path = require('path')

const carpeta = path.resolve(process.argv[2] || '.')
let paquete
try {
  paquete = JSON.parse(fs.readFileSync(path.join(carpeta, 'package.json'), 'utf8'))
} catch {
  console.log(`No se pudo leer ${path.join(carpeta, 'package.json')}`)
  process.exit(1)
}

const nombres = Object.keys({ ...paquete.dependencies, ...paquete.devDependencies })
const faltan = nombres.filter((n) => !fs.existsSync(path.join(carpeta, 'node_modules', n, 'package.json')))
if (faltan.length > 0) {
  console.log(`Faltan en node_modules: ${faltan.join(', ')}`)
  process.exit(1)
}
