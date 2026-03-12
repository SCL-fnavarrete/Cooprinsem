# Cooprinsem POS

Sistema Punto de Venta para Cooprinsem Ltda. (cooperativa agricola chilena, 18 sucursales).
Reemplaza frontend SAP WebDynpro por React SPA que consume servicios REST/OData.

## Stack

### Frontend
- React 18 + TypeScript strict + Vite
- UI: @ui5/webcomponents-react (estilo SAP Fiori)
- State: React Context (POC)
- Testing: Vitest + RTL + MSW v2

### Backend POC
- Node.js + Express 5 + TypeScript
- PostgreSQL (nativo o Docker) + Prisma 7
- Endpoints que imitan estructura OData SAP

## Requisitos Previos

- **Node.js** 18+ (recomendado 20+)
- **PostgreSQL** 14+ (nativo instalado en el sistema, o Docker)
- **npm** (incluido con Node.js)

## Instalacion Paso a Paso

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd cooprinsem-pos

# Instalar dependencias frontend
npm install

# Instalar dependencias backend
cd server && npm install && cd ..
```

### 2. Configurar archivos de entorno

Los archivos `.env` no se suben a git por seguridad. Hay que crearlos manualmente:

**Frontend** (raiz del proyecto):
```bash
cp .env.example .env.development
```

Editar `.env.development` y cambiar estas 2 lineas:
```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3001
```

**Backend** (carpeta server/):
```bash
cp server/.env.example server/.env
```

Verificar que `server/.env` tenga la URL correcta de tu PostgreSQL:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cooprinsem_poc"
PORT=3001
```

> Si tu PostgreSQL usa otro usuario, password o puerto, ajusta la URL.

### 3. Crear la base de datos

#### Opcion A: PostgreSQL nativo (instalado en el sistema)

Abrir una terminal y crear la base de datos:

```bash
# En Windows (desde cmd o PowerShell):
psql -U postgres -c "CREATE DATABASE cooprinsem_poc;"

# Si pide password, usar el que configuraste al instalar PostgreSQL
```

Si no tienes `psql` en el PATH, buscar la ruta de instalacion:
```
# Ruta tipica en Windows:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE cooprinsem_poc;"
```

#### Opcion B: PostgreSQL en Docker

```bash
docker run --name cooprinsem-poc -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cooprinsem_poc -p 5432:5432 -d postgres:16
```

Para iniciar el container en sesiones futuras:
```bash
docker start cooprinsem-poc
```

### 4. Migrar schema y sembrar datos de prueba

```bash
cd server
npx prisma db push      # Crea las tablas en PostgreSQL
npm run seed             # Pobla con datos de prueba (clientes, materiales, partidas)
cd ..
```

### 5. Levantar el entorno (2 terminales)

**Terminal 1 — Backend (puerto 3001):**
```bash
cd server && npm run dev
```

Verificar que responde:
```bash
curl http://localhost:3001/api/clientes
# Debe retornar JSON con clientes
```

**Terminal 2 — Frontend (puerto 5173):**
```bash
npm run dev
```

### 6. Abrir en navegador

Ir a http://localhost:5173

## Solucion de Problemas

| Sintoma | Causa | Solucion |
|---------|-------|----------|
| Pagina en blanco | Frontend no esta corriendo | Verificar `npm run dev` en terminal 2 |
| Solo aparece Pago Cta. Cte. | Backend no esta corriendo o BD vacia | Verificar `cd server && npm run dev` + `npm run seed` |
| Error "ECONNREFUSED 5432" | PostgreSQL no esta corriendo | Iniciar el servicio PostgreSQL o `docker start cooprinsem-poc` |
| Error "database cooprinsem_poc does not exist" | BD no creada | Ejecutar paso 3 (crear la base de datos) |
| Error al hacer seed | Tablas no creadas | Ejecutar `cd server && npx prisma db push` primero |
| Login no funciona | Backend caido o `.env.development` sin `VITE_API_BASE_URL` | Verificar ambos procesos y archivo .env |

## Usuarios de Prueba

| Usuario    | Contrasena | Rol             | Acceso          |
|------------|------------|-----------------|-----------------|
| admin      | 1234       | Administrador   | Pedidos + Caja + Administracion |
| vendedor   | 1234       | Ventas          | Pedidos         |
| cajero     | 1234       | Caja            | Caja            |
| consulta   | 1234       | Consultas       | Pedidos (lectura)|

## Comandos

```bash
npm run dev           # Vite dev server
npm run build         # Build produccion
npm run test          # Vitest
npm run test:watch    # Vitest watch
npm run test:coverage # Cobertura
npm run lint          # ESLint
npm run type-check    # tsc --noEmit
```

## Alcance Implementado

### POC Base (Sprints 0-4)
1. **Venta Meson** - Crear pedido con grilla de articulos
2. **Caja: Pago Efectivo** - Cobrar facturas pendientes en efectivo

### Sprint 5 — Modulos Caja Adicionales + Panel Admin
3. **List. Pagares** - Tabla solo lectura de pagares
4. **Ant. Cliente** - Busqueda y cobro de anticipos (clase DZ)
5. **Arqueo Caja** - Dual-rol: cajero graba arqueo, admin ejecuta cierre
6. **Panel Administracion** - CRUD usuarios, roles y sucursales (rol 1)

### Sprint 6 — HomePage + Listado Pedidos + Mejoras Caja
7. **HomePage** - Tiles Fiori por rol con auto-redireccion
8. **PedidoListPage** - Listado de pedidos con filtros (fecha, estado)
9. **PedidoDetallePage** - Vista detalle de pedido existente
10. **Caja mejorada** - Partidas visibles sin buscador, cliente auto-detectado

### NO incluido aun
Transbank, SII, offline, otros medios de pago (cheques, tarjetas, pagare), apertura/cierre caja, egresos, intereses por mora.

## Variables de Entorno

Hay 2 archivos `.env` necesarios (ninguno se sube a git):

| Archivo | Plantilla | Proposito |
|---------|-----------|-----------|
| `.env.development` | `.env.example` | Config frontend (Vite) |
| `server/.env` | `server/.env.example` | Config backend (Prisma + Express) |

Variables clave del frontend:
- `VITE_USE_MOCK=false` - Usar backend POC (default para desarrollo)
- `VITE_API_BASE_URL=http://localhost:3001` - URL del backend POC

## Estructura del Proyecto

```
src/
  components/pos/      # Componentes POS (grillas, busquedas, modales)
  features/auth/       # Login y rutas protegidas
  features/home/       # HomePage con tiles Fiori por rol
  features/pedidos/    # Modulo Venta Meson (listado, formulario, detalle)
  features/caja/       # Modulo Caja (8 sub-modulos, 5 habilitados)
  features/admin/      # Panel Administracion (CRUD usuarios, roles, sucursales)
  services/api/        # Funciones de llamada al backend
  services/mock/       # MSW handlers para tests
  types/               # Interfaces TypeScript
  utils/               # formatCLP, formatRUT, validarRUT
  config/              # Constantes SAP
server/
  src/routes/          # Endpoints Express
  prisma/              # Schema + seed
```

## Arquitectura

Ver `docs/ARCHITECTURE.md` para detalles completos.

- **POC:** React SPA -> Express/Prisma -> PostgreSQL local
- **Fase 1:** React SPA -> SAP S/4HANA OData (solo cambia URL en .env)
- **Fase 2:** Electron/Capacitor + SQLite offline + sync batch

## Pendientes con Equipo ABAP

Los campos marcados como "pendiente-ABAP" en `docs/FIELD_SPEC.md` requieren confirmacion:
- Nombres exactos de entidades y campos OData
- Organizacion de Ventas, Canal Distribucion (codigos)
- SAP Client Number (mandante)
- Servicio OData para estado crediticio del cliente

## Documentacion

- `docs/PRD.md` - Requerimientos del producto
- `docs/ARCHITECTURE.md` - Arquitectura tecnica
- `docs/TASKS.md` - Plan de construccion
- `docs/TESTING.md` - Estrategia de testing
- `docs/DECISIONS.md` - Decisiones de arquitectura (ADR)
- `docs/FIELD_SPEC.md` - Especificacion de campos
