import { describe, it, expect } from 'vitest'
import { exportacionTablaSap, type IDatosTablasSap, type TabSapExport } from './exportTablasSap'
import { generarCsv } from '@/utils/exportarTabla'

const vacio: IDatosTablasSap = {
  bancos: [], centros: [], centrosCosto: [], sociedades: [], regiones: [], perfiles: [],
  usuarioVendedor: [], impresoraConfig: [], usuarioImpresora: [], clientes: [],
}

describe('exportacionTablaSap', () => {
  it('debería devolver nombre y columnas para cada pestaña de Tablas SAP', () => {
    const tabs: TabSapExport[] = ['bancos', 'centros', 'centros-costo', 'sociedades', 'regiones', 'perfiles', 'usuario-vendedor', 'impresora-config', 'usuario-impresora', 'clientes']
    for (const t of tabs) {
      const e = exportacionTablaSap(t, vacio)
      expect(e.columnas.length).toBeGreaterThan(0)
      expect(e.nombreArchivo).toMatch(/^Tablas SAP /)
    }
  })

  it('debería exportar las regiones con tildes y los mismos títulos de la grilla', () => {
    const e = exportacionTablaSap('regiones', { ...vacio, regiones: [{ id: 1, Codigo: '01', Descripcion: 'I- Tarapacá' }] })
    expect(generarCsv(e.filas, e.columnas).slice(1)).toBe('Código;Descripción\r\n01;I- Tarapacá\r\n')
  })

  it('debería mostrar el vendedor de Usuarios_pos igual que la grilla', () => {
    const e = exportacionTablaSap('usuario-vendedor', {
      ...vacio,
      usuarioVendedor: [
        { id: 1, Bname: 'DVIANA', Zvendedor: '00001', idVendedorPos: null, difiere: false },
        { id: 2, Bname: 'AAVENDAÑO', Zvendedor: '00002', idVendedorPos: '00009', difiere: true },
      ] as IDatosTablasSap['usuarioVendedor'],
    })
    const csv = generarCsv(e.filas, e.columnas)
    expect(csv).toContain('DVIANA;00001;No está en Usuarios_pos')
    expect(csv).toContain('AAVENDAÑO;00002;00009 · difiere')
  })
})
