import { describe, it, expect } from 'vitest';
import {
  escaparLike, fragmentosBusqueda, grupoBusqueda, patronLike, patronRut, limiteBusquedaSap, filtroNombreSap, calzaEnOrden, LIMITE_SAP_MAXIMO,
} from './buscadorClientes';

describe('buscador de clientes con comodín', () => {
  it('debería armar "contiene" respetando el orden de los pedazos', () => {
    expect(patronLike('Agricola*verde')).toBe('%Agricola%verde%');
    expect(patronLike('soc*agr*quel')).toBe('%soc%agr%quel%');
  });

  it('sin comodín debería quedar igual que antes ("contiene" el texto completo)', () => {
    expect(patronLike('campo verde')).toBe('%campo verde%');
  });

  it('debería ignorar "*" al inicio, al final y repetidos', () => {
    expect(fragmentosBusqueda('*agricola**verde*')).toEqual(['agricola', 'verde']);
    expect(patronLike('***')).toBe('');
    expect(patronLike('')).toBe('');
  });

  it('debería escapar % y _ para buscarlos como texto', () => {
    expect(escaparLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
    expect(patronLike('50%*off')).toBe('%50\\%%off%');
  });

  it('el RUT debería buscarse sin puntos ni guion', () => {
    expect(patronRut('16.029.421-3')).toBe('%160294213%');
    expect(patronRut('16029*3')).toBe('%16029%3%');
  });
});

describe('filtro por grupo BP', () => {
  it('debería usar ZNAC por defecto o ante un valor inválido', () => {
    expect(grupoBusqueda(undefined)).toBe('ZNAC');
    expect(grupoBusqueda('')).toBe('ZNAC');
    expect(grupoBusqueda("ZN'; DROP")).toBe('ZNAC');
  });

  it('debería aceptar un grupo y "TODOS" = sin filtro', () => {
    expect(grupoBusqueda('zper')).toBe('ZPER');
    expect(grupoBusqueda('0001')).toBe('0001');
    expect(grupoBusqueda('todos')).toBeNull();
  });
});

describe('búsqueda por nombre en SAP en vivo', () => {
  it('debería armar un substringof por pedazo en nombre y nombre completo, escapando comillas', () => {
    expect(filtroNombreSap(['agricola', 'verde'])).toBe(
      "(substringof('AGRICOLA', BusinessPartnerName) and substringof('VERDE', BusinessPartnerName)) or "
      + "(substringof('AGRICOLA', BusinessPartnerFullName) and substringof('VERDE', BusinessPartnerFullName))",
    );
    expect(filtroNombreSap(["o'higgins"])).toContain("substringof('O''HIGGINS', BusinessPartnerName)");
  });

  it('debería confirmar el orden de los pedazos', () => {
    expect(calzaEnOrden('AGRICOLA CAMPO VERDE LTDA.', ['agricola', 'verde'])).toBe(true);
    expect(calzaEnOrden('VERDE AGRICOLA', ['agricola', 'verde'])).toBe(false);
  });

  it('debería usar 20 por defecto y no pasar del máximo', () => {
    expect(limiteBusquedaSap(undefined)).toBe(20);
    expect(limiteBusquedaSap('abc')).toBe(20);
    expect(limiteBusquedaSap('100')).toBe(100);
    expect(limiteBusquedaSap('9999')).toBe(LIMITE_SAP_MAXIMO);
  });
});
