import type { ColumnaExport } from '@/utils/exportarTabla'
import type {
  ISapBanco, ISapCentro, ISapCentroCosto, ISapSociedad, ISapRegion, ISapPerfilUsuario, ISapUsuarioPos,
  ISapImpresoraConfig, ISapUsuarioVendedor, ISapUsuarioImpresora, ISapClienteMaestro,
} from '@/types/sapMaestro'
import { idVendedorSap, tipoUsuarioTexto } from './usuarioSap'
import { categoria, fechaHora } from './TablaSapClientes'

// Admin > Tablas SAP: columnas de "Exportar tabla" por pestaña, con los mismos
// títulos que muestra cada grilla. Se exportan todas las filas cargadas (todas
// las páginas; el buscador ya filtra en el backend).

export type TabSapExport =
  | 'bancos' | 'centros' | 'centros-costo' | 'sociedades' | 'regiones' | 'perfiles'
  | 'usuario-vendedor' | 'impresora-config' | 'usuario-impresora' | 'clientes'

export interface IExportacionTabla {
  filas: unknown[]
  columnas: ColumnaExport<unknown>[]
  nombreArchivo: string
  nombreHoja: string
}

// Las columnas de una tabla solo se aplican a sus propias filas: el cambio a
// `unknown` es para guardar distintas tablas en la misma estructura.
function exportacion<T>(filas: T[], columnas: ColumnaExport<T>[], nombreHoja: string): IExportacionTabla {
  return { filas, columnas: columnas as unknown as ColumnaExport<unknown>[], nombreArchivo: `Tablas SAP ${nombreHoja}`, nombreHoja }
}

const siNo = (v: boolean) => (v ? 'Sí' : 'No')

export const COLUMNAS_BANCOS: ColumnaExport<ISapBanco>[] = [
  { titulo: 'País', valor: (b) => b.BankCountry },
  { titulo: 'Clave Banco', valor: (b) => b.BankKey },
  { titulo: 'Nombre', valor: (b) => b.BankName },
  { titulo: 'Ciudad', valor: (b) => b.City },
  { titulo: 'SWIFT', valor: (b) => b.SwiftCode },
]

export const COLUMNAS_CENTROS: ColumnaExport<ISapCentro>[] = [
  { titulo: 'Código', valor: (c) => c.Plant },
  { titulo: 'Nombre', valor: (c) => c.PlantName },
  { titulo: 'Org. Ventas', valor: (c) => c.SalesOrganization },
  { titulo: 'Archivado', valor: (c) => siNo(!!c.IsMarkedForArchiving) },
]

export const COLUMNAS_CENTROS_COSTO: ColumnaExport<ISapCentroCosto>[] = [
  { titulo: 'Área Control', valor: (c) => c.ControllingArea },
  { titulo: 'Centro Costo', valor: (c) => c.CostCenter },
  { titulo: 'Empresa', valor: (c) => c.CompanyCode },
  { titulo: 'Depto.', valor: (c) => c.Department },
  { titulo: 'Bloqueado', valor: (c) => siNo(!!c.IsBlocked) },
]

export const COLUMNAS_SOCIEDADES: ColumnaExport<ISapSociedad>[] = [
  { titulo: 'Código', valor: (s) => s.CompanyCode },
  { titulo: 'Nombre', valor: (s) => s.CompanyCodeName },
  { titulo: 'Ciudad', valor: (s) => s.CityName },
  { titulo: 'País', valor: (s) => s.Country },
  { titulo: 'Moneda', valor: (s) => s.Currency },
]

export const COLUMNAS_REGIONES: ColumnaExport<ISapRegion>[] = [
  { titulo: 'Código', valor: (r) => r.Codigo },
  { titulo: 'Descripción', valor: (r) => r.Descripcion },
]

export const COLUMNAS_PERFILES: ColumnaExport<ISapPerfilUsuario>[] = [
  { titulo: 'Perfil (IdRol)', valor: (p) => p.IdRol },
  { titulo: 'Org. Ventas (Vkorg)', valor: (p) => p.Vkorg },
  { titulo: 'Canal (Vtweg)', valor: (p) => p.Vtweg },
  { titulo: 'Sector (Spart)', valor: (p) => p.Spart },
  { titulo: 'Oficina (Vkbur)', valor: (p) => p.Vkbur },
  { titulo: 'Grupo Vend. (Vkgrp)', valor: (p) => p.Vkgrp },
  { titulo: 'Centro (Werks)', valor: (p) => p.Werks },
  { titulo: 'Almacén (Lgort)', valor: (p) => p.Lgort },
  { titulo: 'Sociedad (Bukrs)', valor: (p) => p.Bukrs },
  { titulo: 'Área Crédito (Kkber)', valor: (p) => p.Kkber },
  { titulo: 'Cierre Caja', valor: (p) => (p.CierreCaja === 'X' ? 'Sí' : '') },
]

export const COLUMNAS_USUARIOS_PERFIL: ColumnaExport<ISapUsuarioPos>[] = [
  { titulo: 'Usuario (IdUsuario)', valor: (u) => u.IdUsuario },
  { titulo: 'Nombre', valor: (u) => u.Nombre },
  { titulo: 'Perfil (IdRol)', valor: (u) => u.IdRol },
  { titulo: 'Vendedor (IdVendedor)', valor: (u) => idVendedorSap(u.IdVendedor) },
  { titulo: 'Cliente CME (Kunnr)', valor: (u) => u.Kunnr },
  { titulo: 'Tipo Usuario', valor: (u) => (u.TipoUsuario ? `${u.TipoUsuario}${tipoUsuarioTexto(u.TipoUsuario) ? ` · ${tipoUsuarioTexto(u.TipoUsuario)}` : ''}` : '') },
  { titulo: 'Bloq. Pedido', valor: (u) => u.BloqPedido },
  { titulo: 'Bloq. Entrega', valor: (u) => u.BloqEntrega },
  { titulo: 'Vend. Terreno', valor: (u) => (u.VendTerreno === 'X' ? 'Sí' : '') },
  { titulo: 'Mod. Precio', valor: (u) => (u.ModPrecio === 'X' ? 'Sí' : '') },
  { titulo: 'En POS', valor: (u) => siNo(!!u.enPos) },
]

export const COLUMNAS_IMPRESORA_CONFIG: ColumnaExport<ISapImpresoraConfig>[] = [
  { titulo: 'Sociedad (Bukrs)', valor: (f) => f.Bukrs },
  { titulo: 'Oficina (Vkbur)', valor: (f) => f.Vkbur },
  { titulo: 'Usuario (Uname)', valor: (f) => f.Uname || 'Toda la oficina' },
  { titulo: 'Imp. Copago', valor: (f) => f.ImpCopago },
  { titulo: 'Copago Activo', valor: (f) => siNo(!!f.CopagoActivo) },
  { titulo: 'Imp. Cta. Cte.', valor: (f) => f.ImpCtaCte },
  { titulo: 'Imp. Cotización', valor: (f) => f.ImpCotizacion },
]

export const COLUMNAS_USUARIO_VENDEDOR: ColumnaExport<ISapUsuarioVendedor>[] = [
  { titulo: 'Usuario SAP (Bname)', valor: (f) => f.Bname },
  { titulo: 'Vendedor (Zvendedor)', valor: (f) => f.Zvendedor },
  {
    titulo: 'Id Vendedor en Usuarios_pos',
    valor: (f) => (f.idVendedorPos === null ? 'No está en Usuarios_pos' : f.difiere ? `${f.idVendedorPos || '(vacío)'} · difiere` : f.idVendedorPos),
  },
]

export const COLUMNAS_USUARIO_IMPRESORA: ColumnaExport<ISapUsuarioImpresora>[] = [
  { titulo: 'Usuario SAP (Bname)', valor: (f) => f.Bname },
  { titulo: 'Centro (Werks)', valor: (f) => f.Werks },
  { titulo: 'Clase mensaje (Kschl)', valor: (f) => f.Kschl },
  { titulo: 'Impresora (Zip)', valor: (f) => f.Zip },
]

export const COLUMNAS_CLIENTES_SAP: ColumnaExport<ISapClienteMaestro>[] = [
  { titulo: 'Cliente (Customer)', valor: (c) => c.Customer },
  { titulo: 'BP', valor: (c) => c.BusinessPartner },
  { titulo: 'Nombre (CustomerName)', valor: (c) => c.CustomerName },
  { titulo: 'Nombre completo (CustomerFullName)', valor: (c) => c.CustomerFullName },
  { titulo: 'RUT (CliRut)', valor: (c) => c.CliRut },
  { titulo: 'Sucursal (CliSucursal)', valor: (c) => c.CliSucursal },
  { titulo: 'IDCliente', valor: (c) => c.IDCliente },
  { titulo: 'Grupo cuentas (CustomerAccountGroup)', valor: (c) => c.CustomerAccountGroup },
  { titulo: 'Categoría BP (BusinessPartnerCategory)', valor: (c) => categoria(c.BusinessPartnerCategory) },
  { titulo: 'Grupo BP (BusinessPartnerGrouping)', valor: (c) => c.BusinessPartnerGrouping },
  { titulo: 'Bloq. contab. (PostingIsBlocked)', valor: (c) => siNo(!!c.PostingIsBlocked) },
  { titulo: 'Bloq. entrega (DeliveryIsBlocked)', valor: (c) => c.DeliveryIsBlocked },
  { titulo: 'Bloq. factura (BillingIsBlockedForCustomer)', valor: (c) => c.BillingIsBlockedForCustomer },
  { titulo: 'Bloq. pedido (OrderIsBlockedForCustomer)', valor: (c) => c.OrderIsBlockedForCustomer },
  { titulo: 'Marca borrado (DeletionIndicator)', valor: (c) => siNo(!!c.DeletionIndicator) },
  { titulo: 'Creado (created_at)', valor: (c) => fechaHora(c.created_at) },
  { titulo: 'Actualizado (updated_at)', valor: (c) => fechaHora(c.updated_at) },
  { titulo: 'id', valor: (c) => c.id },
]

export interface IDatosTablasSap {
  bancos: ISapBanco[]
  centros: ISapCentro[]
  centrosCosto: ISapCentroCosto[]
  sociedades: ISapSociedad[]
  regiones: ISapRegion[]
  perfiles: ISapPerfilUsuario[]
  usuarioVendedor: ISapUsuarioVendedor[]
  impresoraConfig: ISapImpresoraConfig[]
  usuarioImpresora: ISapUsuarioImpresora[]
  clientes: ISapClienteMaestro[]
}

/** Filas y columnas a exportar de la pestaña activa de Tablas SAP. */
export function exportacionTablaSap(tab: TabSapExport, d: IDatosTablasSap): IExportacionTabla {
  switch (tab) {
    case 'bancos': return exportacion(d.bancos, COLUMNAS_BANCOS, 'Bancos')
    case 'centros': return exportacion(d.centros, COLUMNAS_CENTROS, 'Centros')
    case 'centros-costo': return exportacion(d.centrosCosto, COLUMNAS_CENTROS_COSTO, 'Centros de Costo')
    case 'sociedades': return exportacion(d.sociedades, COLUMNAS_SOCIEDADES, 'Sociedades')
    case 'regiones': return exportacion(d.regiones, COLUMNAS_REGIONES, 'Regiones')
    case 'perfiles': return exportacion(d.perfiles, COLUMNAS_PERFILES, 'Perfiles Usuario')
    case 'usuario-vendedor': return exportacion(d.usuarioVendedor, COLUMNAS_USUARIO_VENDEDOR, 'Usuario Vendedor')
    case 'impresora-config': return exportacion(d.impresoraConfig, COLUMNAS_IMPRESORA_CONFIG, 'Config. Impresoras')
    case 'usuario-impresora': return exportacion(d.usuarioImpresora, COLUMNAS_USUARIO_IMPRESORA, 'Impresoras Usuario')
    case 'clientes': return exportacion(d.clientes, COLUMNAS_CLIENTES_SAP, 'Clientes SAP')
  }
}
