# FIELD_SPEC.md — Especificacion de Campos POC

Especificacion completa de campos para los dos modulos del POC:
- **Venta Meson** (Pedidos)
- **Caja: Pago Efectivo**

Referencia de origenes:
- `maestro-SAP`: dato que viene del maestro de clientes/materiales en SAP
- `input-usuario`: el usuario ingresa el valor manualmente
- `calculado`: el sistema lo calcula a partir de otros campos
- `auto-sistema`: asignado automaticamente por el sistema (fecha, correlativo, usuario logueado, sucursal)

---

## F-01: Login

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Usuario | text | Si | - | input-usuario | - (autenticacion SAP, no en BD local) | ⏳ pendiente-ABAP | Credencial SAP del usuario (Basic Auth) |
| Contrasena | text (password) | Si | - | input-usuario | - (autenticacion SAP, no en BD local) | ⏳ pendiente-ABAP | Misma clave SAP del WebDynpro actual |

> **Nota:** En el POC con backend local no hay autenticacion real. En Fase 1, el login valida contra SAP via Basic Auth + header `Authorization`.

---

## F-02: Pedido — Cabecera (Datos Generales)

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Canal Distribucion | select | Si | "Venta Meson" | input-usuario | `PedidoVenta.canal` | ⏳ pendiente-ABAP (VTWEG) | Valores: "Venta Meson", "Venta Industrial". PRD RN-04 |
| Tipo Documento | select | Si | "Venta Normal" | input-usuario | `PedidoVenta.tipo_doc` | ⏳ pendiente-ABAP (AUART) | Valores: Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada. PRD RN-03. Cambiar tipo NO borra la grilla de articulos |
| Cliente (Solicitante) | search | Si | - | input-usuario + maestro-SAP | `PedidoVenta.kunnr` | ⏳ pendiente-ABAP (KUNNR) | Busqueda por RUT, nombre o codigo SAP. Case-insensitive. Prioridad por sucursal actual. Acceso rapido a Cliente Boleta 999999 |
| Destinatario Mercancia | search | No | mismo que Cliente | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP (KUNWE) | Si difiere del cliente solicitante |
| Retira | text | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Nombre de persona que retira mercancia |
| Vendedor | readonly | Si | usuario logueado | auto-sistema | - (no en schema POC) | ⏳ pendiente-ABAP (PERNR) | Se asigna automaticamente segun usuario logueado. PRD RN-18 |
| Tipo de Compra | select | No | "1 - Compras del giro" | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | PRD RN-05 |
| Nro. Pedido | readonly | Auto | - | auto-sistema | `PedidoVenta.vbeln` | ⏳ pendiente-ABAP (VBELN) | Correlativo generado por SAP al grabar. PRD RN-01 |
| Grupo Credito | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Se carga automaticamente al seleccionar cliente |
| Segmento | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP (SPART) | Se carga automaticamente al seleccionar cliente |
| Condicion de Pago | readonly | Si | - | maestro-SAP | `Cliente.condicion_pago` | ⏳ pendiente-ABAP (KZAWR) | Se carga automaticamente al seleccionar cliente. PRD RN-02 |
| O.C. Cliente | text | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP (BSTKD) | Numero de orden de compra externa del cliente |
| Descuento % | number | No | 0 | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Descuento global del pedido. PRD RN-19: se aplica al subtotal antes de impuestos |
| Clasificacion Fiscal | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP (TAXKM) | Se carga automaticamente al seleccionar cliente |
| Oficina de Ventas | readonly | Auto | sucursal del usuario | auto-sistema | - (no en schema POC) | ⏳ pendiente-ABAP (VKBUR) | Determinada por la sucursal (ej: D190). PRD RN-06 |

### Panel de Credito del Cliente (se muestra al seleccionar cliente)

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Estado Credito | readonly (badge) | Auto | - | maestro-SAP | `Cliente.estado_credito` | ⏳ pendiente-ABAP | Badge: BLOQUEADO (rojo), AL_DIA (verde), CON_DEUDA (amarillo) |
| Credito Asignado | readonly | Auto | - | maestro-SAP | `Cliente.credito_asignado` | ⏳ pendiente-ABAP | Monto en CLP (entero, sin decimales). Limite de credito total |
| Credito Utilizado | readonly | Auto | - | maestro-SAP | `Cliente.credito_utilizado` | ⏳ pendiente-ABAP | Monto en CLP (entero, sin decimales) |
| % Agotamiento | calculated | Auto | - | calculado | - (calculado en frontend) | - | Formula: `(credito_utilizado / credito_asignado) * 100`. Si credito_asignado = 0, mostrar 0% |

---

## F-03: Pedido — Logistica y Entrega

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Patente | text | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Placa del vehiculo de retiro |
| Despacho | select | No | "Retiro en Tienda" | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Valores: Retiro en Tienda, Despacho a domicilio (otros por definir) |
| Zona Transporte | text | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Campo pendiente de definicion por negocio. PRD RN-10 |
| Recargo Flete | number | No | 0 | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Campo pendiente de definicion por negocio. PRD RN-10. Monto en CLP |

---

## F-04: Pedido — Linea de Articulo (por cada producto en la grilla)

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Pos | readonly | Auto | - | auto-sistema | - (calculado por indice) | ⏳ pendiente-ABAP (POSNR) | Correlativo en multiplos de 10: 10, 20, 30... |
| Articulo | search | Si | - | input-usuario | `PedidoPosicion.matnr` | ⏳ pendiente-ABAP (MATNR) | Busqueda por codigo, descripcion o codigo de barras. Sin asteriscos, case-insensitive. Ocultar materiales bloqueados. Ordenar por stock desc |
| Descripcion | readonly | Auto | - | maestro-SAP | `Material.descripcion` | ⏳ pendiente-ABAP (MAKTX) | Se carga automaticamente al seleccionar articulo |
| Centro | readonly | Auto | sucursal actual | auto-sistema | - (no en schema POC) | ⏳ pendiente-ABAP (WERKS) | Centro logistico/planta de la sucursal del usuario |
| Almacen | readonly | Auto | "B000" | auto-sistema | - (no en schema POC) | ⏳ pendiente-ABAP (LGORT) | Almacen por defecto de la sucursal. Valores: B000, B001, B002, G000 |
| PtEx | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP (VSTEL) | Punto de expedicion |
| Ruta | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP (ROUTE) | Ruta de despacho |
| Cantidad | number | Si | 1 | input-usuario | `PedidoPosicion.cantidad` | ⏳ pendiente-ABAP (KWMENG) | Debe ser > 0. Warning visual si supera stock disponible |
| UM | readonly | Auto | - | maestro-SAP | `Material.unidad_medida` | ⏳ pendiente-ABAP (MEINS) | Unidad de medida del material: UN, KG, MT, L, GL, SA |
| Precio Unitario | readonly | Auto | - | maestro-SAP | `Material.precio_unitario` / `PedidoPosicion.precio_unitario` | ⏳ pendiente-ABAP (NETPR) | Precio de lista desde SAP. CLP entero sin decimales |
| Precio Proveedor | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Precio del proveedor (referencia de costo/margen). PRD RN-23 |
| Subtotal | calculated | Auto | - | calculado | `PedidoPosicion.subtotal` | ⏳ pendiente-ABAP (NETWR) | Formula: `Cantidad * Precio Unitario`. CLP entero sin decimales |
| Recargo | readonly | Auto | 0 | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Recargo del articulo |
| Rec.CondPago | readonly | Auto | 0 | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Recargo por condicion de pago |
| Valor Flete | readonly | Auto | 0 | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Valor flete por linea |
| Recargo Flete | readonly | Auto | 0 | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Recargo de flete por linea |

---

## F-05: Pedido — Panel Resumen (montos y totales)

### Stock por Centro (tabla solo lectura)

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| B000 | readonly | Auto | - | maestro-SAP | `Stock.cantidad` (where almacen='B000') | ⏳ pendiente-ABAP (LABST) | Stock disponible en almacen B000 del articulo seleccionado. PRD RN-07 |
| B001 | readonly | Auto | - | maestro-SAP | `Stock.cantidad` (where almacen='B001') | ⏳ pendiente-ABAP (LABST) | Stock disponible en almacen B001 |
| B002 | readonly | Auto | - | maestro-SAP | `Stock.cantidad` (where almacen='B002') | ⏳ pendiente-ABAP (LABST) | Stock disponible en almacen B002 |
| G000 | readonly | Auto | - | maestro-SAP | `Stock.cantidad` (where almacen='G000') | ⏳ pendiente-ABAP (LABST) | Stock disponible en almacen G000 |

### Totales

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Subtotal | calculated | Auto | 0 | calculado | `PedidoVenta.total` (aprox.) | ⏳ pendiente-ABAP (NETWR) | Formula: `SUM(subtotal de cada linea)`. CLP entero. PRD RN-08 |
| Flete | calculated | Auto | 0 | calculado | - (no en schema POC) | ⏳ pendiente-ABAP | Formula: `SUM(valor_flete de cada linea) + Recargo Flete global`. PRD RN-08 |
| IVA | calculated | Auto | 0 | calculado | - (calculado en frontend para POC) | ⏳ pendiente-ABAP (MWSBP) | Formula: `Math.round(Subtotal * 0.19)`. 19% sobre neto gravado. CLP entero. PRD RN-24. En SAP real: NO calcular en frontend, usar valor de SAP |
| Impuesto Especifico | calculated | Auto | 0 | calculado | - (no en schema POC) | ⏳ pendiente-ABAP | Impuesto adicional segun tipo de producto (alcohol, combustibles). Calculado por SAP |
| Total | calculated | Auto | 0 | calculado | `PedidoVenta.total` | ⏳ pendiente-ABAP | Formula: `Subtotal + Flete + IVA + Impuesto Especifico`. CLP entero. PRD RN-08 |

### Datos adicionales

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Observaciones de Factura | textarea | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Texto libre que se imprime en el documento tributario (DTE). PRD RN-09 |
| Ubicacion Predio | text | No | - | input-usuario | - (no en schema POC) | ⏳ pendiente-ABAP | Informacion geografica del lugar de destino |

### Acciones

| Boton | Atajo | Habilitado cuando | Accion |
|---|---|---|---|
| Grabar | F9 | Cliente seleccionado AND al menos 1 articulo AND todas las cantidades > 0 | POST a SAP/backend. Retorna VBELN. Muestra mensaje "Pedido N XXXXXXXXXX creado correctamente" |
| Limpiar | - | siempre | Reset del formulario completo con dialogo de confirmacion |

---

## F-06: Caja — Grilla de Pedidos Pendientes (columnas de la tabla)

> Esta grilla muestra los documentos del dia (boletas y facturas contado) listos para cobro. En el sistema completo equivale a la pantalla principal del POS de Caja.

| Campo UI (columna) | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Seleccion (checkbox) | checkbox | - | false | input-usuario | - | - | Permite seleccion multiple con Shift+Click. PRD Caja RN-05 |
| Semaforo (estado) | readonly (icono) | Auto | - | calculado | - (calculado desde `PartidaAbierta.dias_mora`) | - | Verde: vigente (dias_mora = 0). Amarillo: vence en proximos 7 dias. Rojo: vencida (dias_mora > 0) |
| Referencia | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Referencia del documento |
| Asignacion | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Campo de asignacion SAP |
| Nro Documento | readonly | Auto | - | maestro-SAP | `PartidaAbierta.belnr` | ⏳ pendiente-ABAP (BELNR) | Numero de documento contable |
| Clase | readonly | Auto | - | maestro-SAP | `PartidaAbierta.clase_doc` | ⏳ pendiente-ABAP (BLART) | Clase de documento SAP (FV, NC, etc.) |
| Fecha | readonly | Auto | - | maestro-SAP | `PartidaAbierta.fecha_doc` | ⏳ pendiente-ABAP (BUDAT) | Fecha de creacion. Formato DD/MM/YYYY |
| Vencimiento | readonly | Auto | - | maestro-SAP | `PartidaAbierta.fecha_venc` | ⏳ pendiente-ABAP (FAEDT) | Fecha de vencimiento. Formato DD/MM/YYYY |
| Dias Mora | calculated | Auto | - | calculado | `PartidaAbierta.dias_mora` | - | Formula: `max(0, hoy - fecha_vencimiento)` en dias. 0 si no esta vencido |
| Importe | readonly | Auto | - | maestro-SAP | `PartidaAbierta.importe` | ⏳ pendiente-ABAP (DMBTR) | Monto del documento en CLP (entero). Formato: $1.234.567 |
| Tipo | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | EF=Efectivo, CF=Cheque a Fecha, TD=Tarjeta Debito |
| Usuario | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Usuario que creo el documento |

### Acciones de la grilla

| Boton | Habilitado cuando | Accion |
|---|---|---|
| Pago / Cobrar en Efectivo | Al menos 1 documento seleccionado | Abre la pantalla de detalle de pago (F-07) con los documentos seleccionados |
| Actualizar | siempre | Refresca la lista de documentos. Auto-actualiza cada 30 segundos. PRD Caja RN-03/RN-04 |

---

## F-07: Caja — Detalle de Pago (datos cliente + documentos a cancelar)

### Datos del Cliente (solo lectura, se cargan al seleccionar documentos o buscar por RUT)

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Busqueda Cliente | search | Si | - | input-usuario | - | ⏳ pendiente-ABAP | Busqueda por RUT o nombre. Case-insensitive. Al seleccionar, carga partidas abiertas automaticamente. PRD Caja RN-20 |
| RUT | readonly | Auto | - | maestro-SAP | `Cliente.rut` | ⏳ pendiente-ABAP (STCD1) | Formato 12.345.678-9. Validar con modulo 11 |
| Nombre | readonly | Auto | - | maestro-SAP | `Cliente.nombre` | ⏳ pendiente-ABAP (NAME1) | Nombre completo del cliente |
| Direccion | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Direccion fiscal del cliente |
| Poblacion | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Localidad/comuna |
| Distrito | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Distrito/region |
| Segmento | readonly | Auto | - | maestro-SAP | - (no en schema POC) | ⏳ pendiente-ABAP | Segmento comercial. Se carga automaticamente al seleccionar cliente |

### Documentos a Cancelar (tabla con seleccion, mismas columnas que F-06)

> Usa la misma estructura de columnas que F-06 (Grilla de Pedidos Pendientes). El cajero selecciona los documentos que el cliente desea pagar.

### Resumen de Montos

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Total a Pagar | calculated | Auto | 0 | calculado | - (calculado en frontend) | - | Formula: `SUM(importe de documentos seleccionados)`. CLP entero. Se actualiza dinamicamente al checkear/descheckear documentos |
| Total Pagado | calculated | Auto | 0 | calculado | - (calculado en frontend) | - | Formula: `SUM(montos de todos los medios de pago ingresados)`. CLP entero |
| Total a Devolver | calculated | Auto | 0 | calculado | - (calculado en frontend) | - | Formula: `Total Pagado - Total a Pagar`. Si >= 0 mostrar en verde, si < 0 mostrar en rojo. PRD Caja RN-28 |
| Total a Cta. Cte. | calculated | Auto | 0 | calculado | - (calculado en frontend) | - | Aplica solo si sobrepago va a cuenta corriente (no aplica en POC con solo efectivo). PRD Caja RN-14 |

---

## F-08: Caja — Modal Pago Efectivo

| Campo UI | Tipo | Obligatorio | Valor por defecto | Origen | Campo BD (backend POC) | Campo SAP/OData | Regla de negocio |
|---|---|---|---|---|---|---|---|
| Cliente | readonly | Auto | - | auto-sistema | `Cobro.kunnr` | - | Nombre y RUT del cliente (datos de F-07) |
| Documentos Seleccionados | readonly (lista) | Auto | - | auto-sistema | - | - | Lista de BELNR seleccionados en F-07 con sus importes |
| Total a Cobrar | readonly | Auto | - | calculado | - (calculado en frontend) | - | Formula: `SUM(importe de documentos seleccionados)`. CLP entero. Formato: $1.234.567 |
| Monto Recibido | number | Si | Total a Cobrar | input-usuario | - (no en schema POC) | - | Autofoco al abrir modal. Precargado con el total de documentos seleccionados. PRD Caja RN-09. Se permite monto >= Total a Cobrar. PRD Caja RN-10 |
| Vuelto | calculated | Auto | 0 | calculado | - (calculado en frontend) | - | Formula: `Monto Recibido - Total a Cobrar`. Calculo en tiempo real. Verde si >= 0, rojo si < 0. CLP entero |

### Acciones del Modal

| Boton | Habilitado cuando | Accion |
|---|---|---|
| Confirmar Cobro | `Monto Recibido >= Total a Cobrar` | POST a SAP/backend. Genera doc. clase W. Retorna BELNR. Campos enviados: `Cobro.kunnr`, `Cobro.monto`, `Cobro.medio_pago='EFECTIVO'`, `Cobro.clase_doc='W'`. PRD Caja RN-17/RN-18 |
| Cancelar | siempre | Cierra modal sin registrar. No se genera documento. PRD Caja RN-08 (slide 8) |

### Resultado exitoso (post-cobro)

| Campo UI | Tipo | Origen | Campo BD (backend POC) | Campo SAP/OData | Descripcion |
|---|---|---|---|---|---|
| Nro Documento SAP | readonly | auto-sistema | `Cobro.belnr` | ⏳ pendiente-ABAP (BELNR) | Numero de documento contable clase W generado |
| Clase Documento | readonly | auto-sistema | `Cobro.clase_doc` | ⏳ pendiente-ABAP (BLART) | Siempre "W" (Recaudacion de Caja) |
| Fecha | readonly | auto-sistema | `Cobro.fecha` | ⏳ pendiente-ABAP (BUDAT) | Fecha de contabilizacion |
| Monto Cobrado | readonly | auto-sistema | `Cobro.monto` | ⏳ pendiente-ABAP (DMBTR) | Monto total cobrado en CLP |
| Vuelto Entregado | calculated | calculado | - | - | Monto Recibido - Total a Cobrar |

---

## Pendientes con equipo ABAP

Todos los campos marcados como ⏳ pendiente-ABAP requieren confirmacion del nombre exacto del campo OData y del servicio que los expone. Lista agrupada por entidad:

### Autenticacion
- Campo de usuario SAP para Basic Auth
- Campo de contrasena SAP

### Cliente (CustomerSet / Maestro Deudor)
- `KUNNR` — codigo de cliente
- `NAME1` — nombre del cliente
- `STCD1` — RUT del cliente
- `KZAWR` — condicion de pago
- `SPART` — segmento
- `TAXKM` — clasificacion fiscal
- Grupo de credito
- Credito asignado (limite de credito, FD32)
- Credito utilizado (control de credito SAP)
- Estado crediticio (BLOQUEADO / AL_DIA / CON_DEUDA)
- Direccion, Poblacion, Distrito
- Cuenta corriente activa (boolean)

### Material (MaterialSet / Maestro Materiales)
- `MATNR` — codigo del material
- `MAKTX` — descripcion del material
- `NETPR` — precio unitario
- `MEINS` — unidad de medida
- Flag de bloqueo / "NO USAR" (posible `MARA-LVORM`)
- Precio proveedor (referencia de costo)

### Stock (StockSet / MM)
- `LABST` — stock disponible por centro/almacen
- `WERKS` — centro
- `LGORT` — almacen

### Pedido de Venta (SalesOrderSet / SD)
- `VBELN` — numero de pedido
- `POSNR` — posicion
- `AUART` — tipo de documento de venta
- `VTWEG` — canal de distribucion
- `VKORG` — organizacion de ventas
- `VKBUR` — oficina de ventas
- `KWMENG` — cantidad
- `NETWR` — valor neto
- `MWSBP` — monto IVA
- `BSTKD` — O.C. del cliente
- `KUNWE` — destinatario de mercancia
- `PERNR` — vendedor
- `VSTEL` — punto de expedicion
- `ROUTE` — ruta de despacho
- Recargo, Rec.CondPago, Valor Flete, Recargo Flete (por linea)
- Impuesto Especifico
- Observaciones de Factura
- Ubicacion Predio
- Patente, Despacho, Zona Transporte, Recargo Flete (cabecera)

### Partidas Abiertas (OpenItemSet / FBL5N equiv.)
- `BELNR` — numero de documento contable
- `BLART` — clase de documento
- `BUDAT` — fecha de documento
- `FAEDT` — fecha de vencimiento
- `DMBTR` — importe en moneda local
- Referencia
- Asignacion
- Tipo (EF/CF/TD)
- Usuario creador

### Cobro / Recaudacion (PaymentSet / clase W)
- `BELNR` — numero de documento contable generado
- `BLART` — clase de documento (W)
- `BUDAT` — fecha de contabilizacion
- `DMBTR` — monto cobrado
- Medio de pago

### Parametros organizativos (aun sin confirmar)
- Organizacion de Ventas (codigo exacto)
- Canal de Distribucion (codigo exacto, no solo texto)
- SAP Client Number (mandante)
