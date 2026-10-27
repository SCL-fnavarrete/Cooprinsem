import { Router, Request, Response } from 'express';
import {
  buscarClientePorNumero,
  buscarClientePorRut,
  buscarClientePorNombre,
  obtenerDireccionCliente,
  obtenerRutCliente,
  crearClienteSap,
  ErrorCrearClienteSap,
  obtenerFichaCliente,
  SapCrearClienteParams,
  existeBusinessPartner,
} from './sapClientesService';
import { siguienteNumeroLibre } from './numeracionClientes';
import { limiteBusquedaSap } from './buscadorClientes';

const router = Router();

/**
 * Reserva atómicamente el próximo número de BusinessPartner para la numeración
 * externa ZNAC, incrementando pos_parametro_general (clave IDCLIENTE).
 *
 * Atómico: usa SELECT ... FOR UPDATE dentro de una transacción, para que dos
 * creaciones simultáneas nunca reciban el mismo número. Como contrapartida,
 * si la creación en SAP falla después de reservar el número, ese número queda
 * "quemado" (gap en la secuencia) — comportamiento estándar y aceptado en
 * numeración SAP, preferible a arriesgar un número duplicado.
 */
async function reservarNumeroClienteSap(): Promise<string> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query("SELECT valor FROM pos_parametro_general WHERE clave='IDCLIENTE' FOR UPDATE");
    if (r.rowCount === 0) {
      throw new Error('Falta el parámetro IDCLIENTE en pos_parametro_general');
    }
    const valorActual = Number(r.rows[0].valor);
    if (!Number.isFinite(valorActual)) {
      throw new Error(`Valor de IDCLIENTE no es numérico: "${r.rows[0].valor}"`);
    }
    // Salta los números que los usuarios ya crearon directo en SAP (mismo
    // correlativo ZNAC). La fila queda bloqueada mientras se consulta SAP.
    const { numero: idNuevoCliente, saltados } = await siguienteNumeroLibre(valorActual, existeBusinessPartner);
    if (saltados.length > 0) {
      console.warn(`[IDCLIENTE] Números ya existentes en SAP, se saltan: ${saltados.join(', ')} → se usa ${idNuevoCliente}`);
    }
    await client.query('UPDATE pos_parametro_general SET valor=$1 WHERE clave=$2', [idNuevoCliente, 'IDCLIENTE']);
    await client.query('COMMIT');
    return idNuevoCliente;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * GET /api/sap-clientes/buscar
 *
 * Busca un cliente en SAP por número de cliente, por RUT o por nombre.
 * Se debe proporcionar uno de los tres parámetros. Con nombre: "*" = comodín
 * y `limite` (20 por defecto, máximo 200); responde `hayMas` si SAP tiene más.
 *
 * Query params:
 *   - numero  → número de cliente SAP (ej: "1000000")
 *   - rut     → RUT del cliente       (ej: "12345678-9")
 */
router.get('/buscar', async (req: Request, res: Response) => {
  const { numero, rut } = req.query;

  // El nombre también se acepta (antes se rechazaba con 400 y la pantalla caía a la
  // tabla de demostración del POC — corregido 26-10-2026).
  if (!numero && !rut && !req.query.nombre) {
    res.status(400).json({
      success: false,
      message: 'Debe proporcionar al menos un parámetro: numero, rut o nombre',
    });
    return;
  }

  try {
    const nombre = req.query.nombre as string | undefined;

    if (nombre) {
      const limite = limiteBusquedaSap(req.query.limite);
      const { clientes, hayMas } = await buscarClientePorNombre(nombre, limite);
      // Dirección y RUT: 2 llamadas por cliente, de a 10 en paralelo para no saturar SAP
      const clientesEnriquecidos = [];
      for (let i = 0; i < clientes.length; i += 10) {
        clientesEnriquecidos.push(...await Promise.all(
          clientes.slice(i, i + 10).map(async (c) => {
            const [direccion, rutCliente] = await Promise.all([
              obtenerDireccionCliente(c.BusinessPartner).catch(() => null),
              obtenerRutCliente(c.BusinessPartner).catch(() => ''),
            ]);
            return { ...c, TaxNumber1: rutCliente, direccion };
          })
        ));
      }
      res.json({ success: true, total: clientesEnriquecidos.length, limite, hayMas, data: clientesEnriquecidos });
      return;
    }
    if (numero) {
      // Búsqueda por número de cliente
      const cliente = await buscarClientePorNumero(numero as string);
      const [direccion, rut] = await Promise.all([
        obtenerDireccionCliente(cliente.BusinessPartner).catch(() => null),
        obtenerRutCliente(cliente.BusinessPartner).catch(() => ''),
      ]);
      res.json({ success: true, data: { ...cliente, TaxNumber1: rut, direccion } });
    } else {
      // Búsqueda por RUT
      const clientes = await buscarClientePorRut(rut as string);

      // Enriquecer cada cliente con su dirección
      const clientesConDireccion = await Promise.all(
        clientes.map(async (cliente) => {
          const direccion = await obtenerDireccionCliente(cliente.BusinessPartner).catch(() => null);
          return { ...cliente, direccion };
        })
      );

      res.json({ success: true, total: clientesConDireccion.length, data: clientesConDireccion });
    }
  } catch (error: any) {
    console.error('[GET /api/sap-clientes/buscar] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al buscar cliente en SAP',
      detail: error.message,
    });
  }
});

/**
 * GET /api/sap-clientes/ficha/:bp
 *
 * Obtiene los datos completos de un cliente desde SAP para la pantalla Ficha.
 * Expande dirección, datos de cliente, contactos y relaciones.
 */
router.get('/ficha/:bp', async (req: Request, res: Response) => {
  try {
    const bp = req.params.bp as string;
    const ficha = await obtenerFichaCliente(bp);
    res.json({ success: true, data: ficha });
  } catch (error: any) {
    console.error('[GET /api/sap-clientes/ficha] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ficha del cliente en SAP',
      detail: error.message,
    });
  }
});
/**
 * POST /api/sap-clientes
 *
 * Crea un nuevo cliente (Business Partner) en SAP.
 * Requiere todos los campos obligatorios del formulario.
 *
 * Body: SapCrearClienteParams
 */
router.post('/', async (req: Request, res: Response) => {
  const params: SapCrearClienteParams = req.body;

  // Validar campos obligatorios
  const camposObligatorios: (keyof SapCrearClienteParams)[] = [
    'tratamiento', 'rut', 'nombre', 'conceptoBusqueda',
    'giro', 'direccion', 'region', 'ciudad', 'comuna', 'zonaTransporte',
  ];

  const faltantes = camposObligatorios.filter(campo => !params[campo]);

  if (faltantes.length > 0) {
    res.status(400).json({
      success: false,
      message: `Faltan campos obligatorios: ${faltantes.join(', ')}`,
    });
    return;
  }

  try {
    const idNuevoCliente = await reservarNumeroClienteSap();
    const { businessPartner, llamadas } = await crearClienteSap({ ...params, businessPartner: idNuevoCliente });
    // Devuelve también cada llamada a SAP (URL, JSON enviado y respuesta) para
    // mostrarla en pantalla; un error en datos de contacto no anula el cliente.
    res.status(201).json({
      success: true,
      businessPartner,
      message: `Cliente ${businessPartner} creado correctamente en SAP`,
      llamadas,
    });
  } catch (error: any) {
    const causa = error instanceof ErrorCrearClienteSap ? error.causa : error;
    const detalleSap = causa?.response?.data?.error?.message?.value
      ?? causa?.message;
    console.error('[POST /api/sap-clientes] Error:', causa?.message);
    console.error('[POST /api/sap-clientes] Detalle:', JSON.stringify(causa?.response?.data));
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente en SAP',
      detail: detalleSap,
      llamadas: error instanceof ErrorCrearClienteSap ? error.llamadas : [],
    });
  }
});

export default router;