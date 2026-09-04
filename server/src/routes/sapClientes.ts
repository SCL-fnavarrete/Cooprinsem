import { Router, Request, Response } from 'express';
import {
  buscarClientePorNumero,
  buscarClientePorRut,
  buscarClientePorNombre,
  obtenerDireccionCliente,
  obtenerRutCliente,
  crearClienteSap,
  obtenerFichaCliente,
  SapCrearClienteParams,
} from './sapClientesService';

const router = Router();

/**
 * GET /api/sap-clientes/buscar
 *
 * Busca un cliente en SAP por número de cliente o por RUT.
 * Se debe proporcionar uno de los dos parámetros.
 *
 * Query params:
 *   - numero  → número de cliente SAP (ej: "1000000")
 *   - rut     → RUT del cliente       (ej: "12345678-9")
 */
router.get('/buscar', async (req: Request, res: Response) => {
  const { numero, rut } = req.query;

  if (!numero && !rut) {
    res.status(400).json({
      success: false,
      message: 'Debe proporcionar al menos un parámetro: numero o rut',
    });
    return;
  }

  try {
    const nombre = req.query.nombre as string | undefined;

    if (nombre) {
      const clientes = await buscarClientePorNombre(nombre);
      const clientesEnriquecidos = await Promise.all(
        clientes.map(async (c) => {
          const direccion = await obtenerDireccionCliente(c.BusinessPartner).catch(() => null);
          const rut = await obtenerRutCliente(c.BusinessPartner).catch(() => '');
          return { ...c, TaxNumber1: rut, direccion };
        })
      );
      res.json({ success: true, total: clientesEnriquecidos.length, data: clientesEnriquecidos });
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
    const businessPartner = await crearClienteSap(params);
    res.status(201).json({
      success: true,
      businessPartner,
      message: `Cliente ${businessPartner} creado correctamente en SAP`,
    });
  } catch (error: any) {
    const detalleSap = error.response?.data?.error?.message?.value
      ?? error.message;
    console.error('[POST /api/sap-clientes] Error:', error.message);
    console.error('[POST /api/sap-clientes] Detalle:', JSON.stringify(error.response?.data));
    res.status(500).json({
      success: false,
      message: 'Error al crear cliente en SAP',
      detail: detalleSap,
    });
  }
});

export default router;