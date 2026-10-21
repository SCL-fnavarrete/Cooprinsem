import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { crearSoloLectura } from './soloLectura';

// Usuarios de prueba: visor (rol 5, id 7) y admin (rol 1, id 1)
const buscar = async (username: string) =>
  username === 'visor' ? { rol: 5, id: 7 } : username === 'admin' ? { rol: 1, id: 1 } : { rol: null, id: null };
const middleware = crearSoloLectura(buscar);

function llamar(method: string, path: string, usuario?: string, body: Record<string, unknown> = {}) {
  const req = { method, path, headers: usuario ? { 'x-pos-usuario': usuario } : {}, body } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return middleware(req, res, next).then(() => ({ req, res, next, json }));
}

describe('soloLectura (perfil Visualizador)', () => {
  it('debería dejar pasar las consultas GET', async () => {
    const r = await llamar('GET', '/api/pedidos', 'visor');
    expect(r.next).toHaveBeenCalled();
  });

  it('debería rechazar con 403 una escritura del Visualizador', async () => {
    const r = await llamar('POST', '/api/sap-pedidos/crear', 'visor');
    expect(r.next).not.toHaveBeenCalled();
    expect(r.res.status).toHaveBeenCalledWith(403);
    expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ soloLectura: true }));
  });

  it('debería permitir los POST que solo consultan o simulan', async () => {
    for (const ruta of ['/api/sap-pedidos/simular', '/api/sap-pedidos/precios', '/api/sap-cta-cte/pagos/preview', '/api/sap-cta-cte/anticipos/preview', '/api/auth/login']) {
      expect((await llamar('POST', ruta, 'visor')).next).toHaveBeenCalled();
    }
  });

  it('debería rechazar el pago de un anticipo (contabiliza) aunque permita su vista previa', async () => {
    const r = await llamar('POST', '/api/sap-cta-cte/anticipos/pagos', 'visor');
    expect(r.next).not.toHaveBeenCalled();
    expect(r.res.status).toHaveBeenCalledWith(403);
  });

  it('debería dejar escribir a los demás roles y a llamadas sin usuario', async () => {
    expect((await llamar('POST', '/api/sap-pedidos/crear', 'admin')).next).toHaveBeenCalled();
    expect((await llamar('DELETE', '/api/pos-maestros/parametros/X')).next).toHaveBeenCalled();
  });

  it('debería permitir editar su propio usuario dejando solo nombre, RUT y email', async () => {
    const r = await llamar('PUT', '/api/admin/usuarios/7', 'visor', { nombreCompleto: 'Nuevo', rolCod: 1, estado: 2, modoTecnico: true, email: 'a@b.cl' });
    expect(r.next).toHaveBeenCalled();
    expect(r.req.body).toEqual({ nombreCompleto: 'Nuevo', email: 'a@b.cl' });
  });

  it('debería rechazar editar a otro usuario', async () => {
    const r = await llamar('PUT', '/api/admin/usuarios/1', 'visor', { nombreCompleto: 'X' });
    expect(r.res.status).toHaveBeenCalledWith(403);
  });
});
