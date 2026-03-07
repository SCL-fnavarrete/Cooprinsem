# PRD — Cooprinsem POS (Point of Sale)

## 1. Resumen Ejecutivo

### 1.1 Visión
Reemplazar el sistema POS actual basado en SAP WebDynpro (tecnología obsoleta, sin soporte futuro) por una aplicación React moderna que consuma directamente los servicios OData de SAP S/4HANA, manteniendo toda la lógica de negocio en SAP y proporcionando una experiencia de usuario fluida, responsiva y familiar para usuarios del ecosistema SAP (estilo Fiori).

### 1.2 Cliente
| Campo | Valor |
|-------|-------|
| Razón Social | Cooprinsem Ltda. |
| Giro | Ferretería / Insumos Agrícolas |
| Tipo | Cooperativa agrícola chilena |
| Sociedad SAP | `COOP` |
| Sucursales | 18 a nivel nacional |
| Códigos sucursal | D190 (Osorno), D052, D014, D160, D170, D200, y otras |
| Volumen anual | ~70.000 transacciones |
| Promedio diario | ~11 transacciones/sucursal/día |

### 1.3 Problema
- SAP WebDynpro no tiene soporte futuro de SAP AG
- Interfaz lenta, no responsiva, no funciona en tablets Android
- Sin capacidad offline (Fase 2)
- Difícil de mantener y evolucionar
- UX anticuada que frena la productividad en el mesón

### 1.4 Solución
Aplicación React moderna desplegada en 2 fases:
- **Fase 1 (año actual, Online):** SPA React → OData → SAP S/4HANA vía VPN corporativa
- **Fase 2 (próximo año, Offline-First):** Electron (Windows) + Capacitor (Android) con SQLite local y sync batch

### 1.5 POC (Prueba de Concepto)
Alcance mínimo para validar la arquitectura técnica:
- **Venta Mesón** (crear pedido simple con grilla de artículos)
- **Caja: Pago con Efectivo** (cobrar factura en efectivo, registrar en SAP)

---

## 2. Usuarios y Roles

### 2.1 Perfiles de Usuario
| Código Rol | Rol | Módulos | Descripción |
|-----------|-----|---------|-------------|
| 1 | Administrador | Todos | Jefe de sucursal. Acceso total incluyendo mantenedores. |
| 2 | Ventas | Pedidos | Vendedor de mesón o terreno. Crea y gestiona pedidos. |
| 3 | Caja | Caja (8 funciones) | Cajero. Cobros, pagos, arqueo. |
| 4 | Consultas | Solo lectura | Reportes y consultas sin escritura. |

**Flujo de login:** Login → SAP autentica → según Rol_Cod → Administración / Pedidos / Caja

### 2.2 Dispositivos y Pantallas
- **PCs Windows:** Estaciones de caja y venta (pantalla ≥ 1024px, navegador Chrome)
- **Tablets Android:** Vendedores en terreno (Chrome, pantalla ≥ 768px, touch-friendly)
- **Navegador mínimo:** Chrome (última versión estable)

---

## 3. Parámetros del Sistema SAP

| Parámetro | Valor | Estado |
|-----------|-------|--------|
| Sociedad | `COOP` | ✅ Confirmado |
| Clase Doc. Venta | `ZPOS` | ✅ Confirmado |
| Moneda | `CLP` (pesos chilenos, sin decimales) | ✅ Confirmado |
| IVA | 19% | ✅ Confirmado |
| Cliente Boleta | `999999` | ✅ Confirmado |
| Canales distribución | Venta Mesón / Venta Industrial | ✅ Confirmado |
| Tipos de documento venta | Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada | ✅ Confirmado |
| Almacenes | B000, B001, B002, G000 | ✅ Confirmado |
| Org. Ventas (código) | ⚠️ Pendiente confirmar con ABAP | ❌ Pendiente |
| Canal Distribución (código) | ⚠️ Pendiente confirmar con ABAP | ❌ Pendiente |
| SAP Client Number | ⚠️ Pendiente confirmar con ABAP | ❌ Pendiente |
| Mantenedor tasas interés | Tabla SAP (ZFI001_CNF) — pendiente validar | ❌ Pendiente |

---

## 4. Módulo: PEDIDOS (Crear Venta / Venta Mesón)

### 4.1 Descripción
El vendedor crea un pedido de venta seleccionando artículos de un catálogo SAP, especificando cantidades, y asociándolo a un cliente. El pedido se graba en SAP como Sales Order. Los cálculos de precio, IVA, descuentos e impuestos los realiza SAP.

### 4.2 Flujo Principal (POC)
1. Vendedor abre módulo "Crear Venta"
2. Sistema carga parámetros por defecto (centro=sucursal actual, org. ventas, canal)
3. Vendedor selecciona cliente (búsqueda por RUT, nombre o código SAP)
   - Si no identifica → usa Cliente Boleta (`999999`, contado, sin RUT)
4. Vendedor busca artículos (por código, descripción o código de barras)
5. Agrega artículos a la grilla con cantidad
6. Sistema calcula subtotales, IVA y total automáticamente
7. Vendedor puede modificar cantidades o eliminar líneas
8. Vendedor graba el pedido → SAP crea Sales Order → retorna VBELN
9. Sistema muestra número de pedido SAP generado

### 4.3 Panel de Crédito del Cliente (nuevo — desde reuniones de mejora)
Al seleccionar un cliente, mostrar inmediatamente su estado crediticio:

| Indicador | Descripción | Fuente SAP |
|-----------|-------------|------------|
| Estado | `BLOQUEADO` / `AL DÍA` / `CON DEUDA` | Maestro deudor / partidas abiertas |
| Crédito Asignado | Límite de crédito total del cliente en CLP | Maestro cliente FD32 |
| Crédito Utilizado | Monto ya comprometido en SAP | Control de crédito SAP |
| % Agotamiento | Crédito utilizado / Crédito asignado × 100 | Calculado en frontend |

> ⚠️ El consultor SAP indicó que esto podría requerir una nueva interfaz OData. Coordinar con equipo ABAP.

**Regla:** Si el cliente está `BLOQUEADO`, mostrar advertencia visual prominente al vendedor antes de continuar. SAP igualmente rechazará el pedido al grabar, pero la advertencia temprana mejora la experiencia.

### 4.4 Pantalla: Cabecera del Pedido
| Campo | Tipo | Oblig. | Descripción |
|-------|------|--------|-------------|
| Canal distribución | Select | Sí | Venta Mesón / Venta Industrial |
| Tipo Documento | Select | Sí | Venta Normal, Venta Boleta, V. Puesto Fundo, V. Calzada, Venta Anticipada |
| Cliente (Solicitante) | Search Input | Sí | Búsqueda por RUT, nombre o código SAP (KUNNR) |
| Destinatario mercancía | Search Input | No | Si el destinatario difiere del cliente |
| Retira | Text Input | No | Nombre de quien retira la mercancía |
| Vendedor | Display | Sí | Código y nombre (automático según usuario) |
| Tipo de Compra | Select | No | Categoría de la compra |
| Nro. Pedido | Display | — | Correlativo asignado por SAP al grabar |
| Grupo Crédito | Display | — | Automático desde maestro cliente |
| Segmento | Display | — | Automático desde org. de ventas |
| Condición de Pago | Display | Sí | Contado / Crédito (del maestro del cliente) |
| O.C. Cliente | Text Input | No | Número de orden de compra del cliente |
| Descuento % | Number Input | No | Descuento global del pedido (si autorizado) |
| Clasificación Fiscal | Display | — | Automático desde maestro cliente |
| Oficina de Ventas | Display | — | Automático según sucursal |

### 4.4 Pantalla: Datos Logísticos y Entrega
| Campo | Tipo | Descripción |
|-------|------|-------------|
| Patente | Text Input | Placa del vehículo de retiro |
| Despacho | Select | Ej: Retiro en Tienda / Despacho a domicilio |
| Zona Transporte | Text/Select | Zona de transporte |
| Recargo Flete | Number | Cargo por flete si aplica |

### 4.5 Pantalla: Grilla de Artículos
| Columna | Tipo | Descripción |
|---------|------|-------------|
| Pos | Auto | Número de posición (10, 20, 30...) |
| Artículo | Search | Código SAP del material (MATNR) |
| Descripción | Display | Texto del material (auto desde SAP) |
| Centro | Display | Centro/sucursal (automático) |
| Almacén | Display | Almacén (automático) |
| PtEx | Display | Punto de expedición |
| Ruta | Display | Ruta de despacho |
| Cantidad | Input | Cantidad solicitada (> 0) |
| UM | Display | Unidad de medida (UN, KG, MT, L...) |
| Precio Unitario | Display | Precio de lista desde SAP |
| Precio Proveedor | Display | Precio del proveedor (referencia) |
| Subtotal | Calculated | Cantidad × Precio |
| Recargo | Display | Recargo del artículo |
| Rec.CondPago | Display | Recargo por condición de pago |
| Valor Flete | Display | Valor flete línea |
| Recargo Flete | Display | Recargo de flete |

### 4.5.1 Reglas del Buscador de Artículos (desde reuniones de mejora)
- **Sin asteriscos:** El buscador debe funcionar con texto libre, sin requerir comodines (`*`) al inicio ni al final. La búsqueda parcial debe ser automática.
- **Case-insensitive:** Búsqueda indistinta de mayúsculas y minúsculas.
- **Prioridad por stock:** Los resultados deben mostrarse ordenados por stock disponible en la sucursal actual, de mayor a menor.
- **Ocultar "NO USAR":** Los materiales marcados con flag de "NO USAR" o bloqueados en SAP no deben aparecer en los resultados.
- **Selección múltiple de variantes:** Para productos con múltiples presentaciones (ej: pinturas en distintos tamaños), facilitar la selección de varias variantes en una sola operación.

### 4.6 Pantalla: Panel Inferior
| Sección | Campo | Descripción |
|---------|-------|-------------|
| Stock por Centro | B000, B001, B002, G000 | Disponibilidad por bodega |
| Totales | Subtotal | Suma de subtotales netos |
| Totales | Flete | Cargo de flete total |
| Totales | IVA | 19% del subtotal neto |
| Totales | Impuesto Específico | Impuesto adicional si aplica |
| Totales | Total | Monto final a pagar |
| Documento | Observaciones de Factura | Texto libre para documento legal |
| Documento | Ubicación Predio | Información geográfica del destino |

### 4.7 Acciones del Pedido
| Botón | Acción | POC |
|-------|--------|-----|
| Grabar (F9) | Crear pedido en SAP vía POST OData | ✅ |
| Limpiar | Reset del formulario con confirmación | ✅ |
| Simular | Validar sin grabar (pre-check SAP) | ❌ Post-POC |
| Imprimir | Generar PDF / imprimir pedido | ❌ Post-POC |

### 4.8 Reglas del Buscador de Clientes (desde reuniones de mejora)
- **Case-insensitive:** Búsqueda indistinta de mayúsculas y minúsculas.
- **Prioridad por sucursal:** Mostrar primero los clientes de la sucursal actual. Clientes de otras sucursales aparecen al final de los resultados.
- **Cambio de tipo documento sin perder datos:** Si el usuario cambia el tipo de documento (ej: de Factura a Boleta) después de cargar artículos, el sistema **NO** borra la grilla. Solo se actualiza la cabecera.

### 4.9 Reglas de Negocio — Pedidos
- Cliente Boleta (`999999`): solo contado, sin RUT, sin crédito
- Posiciones numeradas en múltiplos de 10 (10, 20, 30...)
- Pedido graba como clase de documento `ZPOS` en SAP
- Validaciones de stock y precio las ejecuta SAP al grabar (no replicar en frontend)
- Precio viene de condiciones SAP (relación material/cliente/org.ventas)
- Si el cliente está bloqueado crediticiamente: mostrar advertencia visual prominente al seleccionarlo (SAP rechazará el pedido al grabar de todas formas, pero la advertencia temprana evita trabajo perdido)

---

## 5. Módulo: CAJA

### 5.1 Funciones del Menú de Caja (8 sub-módulos)
| # | Etiqueta en UI | Función | POC |
|---|----------------|---------|-----|
| 1 | Pago Cta. Cte. | Cobrar facturas pendientes del cliente | ✅ Solo efectivo |
| 2 | Egr. de Caja | Egresos / devoluciones autorizadas | ❌ |
| 3 | List. Pagarés | Listado pagarés (solo lectura) | ❌ |
| 4 | Ant. Cliente | Registrar anticipos de clientes | ❌ |
| 5 | E° de Cuenta | Estado de cuenta del cliente | ❌ |
| 6 | Consulta Pago | Consultar pagos realizados | ❌ |
| 7 | Arqueo Caja | Cuadrar caja del día | ❌ |
| 8 | Salir de la Caja | Cerrar sesión de caja | ❌ |

> **Nota:** El botón "Depósito de Cheques" fue eliminado del alcance. NO implementar.

### 5.2 Pago Cta. Cte. (Pago Cuenta Corriente) — Función Principal

#### Descripción
Permite al cajero cobrar documentos pendientes de clientes usando múltiples medios de pago. Es la función más compleja del módulo. Equivale a la transacción FBL5N en SAP para consulta de partidas.

#### Flujo Completo
1. Cajero busca cliente/deudor por RUT o nombre
2. Sistema consulta partidas abiertas del cliente en SAP (equivalente FBL5N)
3. Cajero ve grilla de documentos pendientes
4. Cajero selecciona los documentos a cancelar
5. Cajero selecciona medio(s) de pago y captura montos
6. Sistema calcula: Total a Pagar, Total Pagado, Total a Devolver, Total a Cta. Cte.
7. Cajero ejecuta el cobro
8. SAP genera documento contable clase `W` (Recaudación de Caja)

#### Grilla de Documentos Pendientes
| Columna | Descripción |
|---------|-------------|
| Estado (semáforo) | Verde=vigente / Amarillo=por vencer / Rojo=vencido |
| Referencia | Referencia del documento |
| Asignación | Campo de asignación SAP |
| Nº Documento | Número de documento contable (BELNR) |
| Clase | Clase de documento SAP |
| Fecha | Fecha de creación |
| Vencimiento | Fecha de vencimiento (FAEDT) |
| Días Mora | Días vencidos |
| Importe | Monto del documento en CLP |
| Tipo | EF=Efectivo / CF=Cheque a Fecha / TD=Tarjeta Débito |
| Usuario | Usuario que creó el documento |

#### Medios de Pago Disponibles (sistema completo)
| # | Medio | POC | Modal requerido |
|---|-------|-----|----------------|
| 1 | Pagaré | ❌ | — |
| 2 | Efectivo | ✅ | No (solo monto recibido y vuelto) |
| 3 | Tarjeta Débito | ❌ | Transbank |
| 4 | Tarjeta Crédito | ❌ | Transbank |
| 5 | Cheque al Día | ❌ | Formulario cheque |
| 6 | Cheque a Fecha | ❌ | Formulario cheque |
| 7 | Vale Vista | ❌ | — |

#### Formulario Modal Cheque (campos requeridos cuando se implementen)
Fecha máxima cheque, Fecha Giro, Fecha Cheque, RUT Girador, Código bancario (dropdown desde SAP), Plaza, Cuenta bancaria, N° Cheque, Monto, N° teléfono.

#### Reglas de Negocio — Cobros
| Regla | Detalle |
|-------|---------|
| Sobrepago tarjetas | NO permitido — monto debe ser exacto al total |
| Sobrepago cheques | SÍ permitido — exceso va a saldo a favor en cta. cte. del cliente |
| Total negativo | Si queda negativo tras aplicar saldos → genera movimiento a cta. cte. |
| Pago mixto | Permitido combinar múltiples medios en una sola transacción (ej: Efectivo $100.000 + Cheque a Fecha $580.000 + Saldo Cta. Cte. $7.369) |
| Doc. generado | Clase W (Recaudación de Caja) en SAP |

#### Saldo a Favor
- Panel accesible desde botón en parte superior de la pantalla de cobro
- Lista saldos a favor disponibles: monto, origen, referencia, estado de autorización
- Se pueden aplicar a facturas seleccionadas para reducir el total a pagar
- Reducir saldo a favor reduce el monto que el cajero debe cobrar

### 5.3 Egr. de Caja (Egreso de Caja / Devoluciones)
**Solo ejecutable por roles autorizados (Jefe Administrativo).**

#### Flujo
1. Cliente trae nota de crédito
2. Jefe Administrativo genera documento de egreso en SAP (proceso previo, fuera del POS)
3. El egreso aparece en el POS del cajero para ser procesado
4. Cajero entrega el efectivo y confirma el egreso en el POS
5. El egreso se rebaja del saldo de caja al momento del cierre

#### Reglas
- Solo usuarios con rol autorizado pueden ejecutar egresos
- Requiere parametrización de monto máximo por sucursal (hoy es control manual — pendiente automatizar)
- Para cliente boleta (`999999`): requiere pasos adicionales en SAP (F-37, FB05) con RUT del cliente original

### 5.4 List. Pagarés
- Pantalla informativa de **solo lectura**
- Muestra compromisos de pago de clientes
- Columnas: Cliente, Nombre, RUT, Referencia, Cuota, Valor Pagaré, Fecha Vencimiento
- Botones: Volver, Imprimir
- Sin lógica de escritura

### 5.5 Ant. Cliente (Anticipos de Cliente)
#### Flujo
1. Modal inicial solicita: Cliente y N° Documento
2. SAP crea solicitud de anticipo de deudor vía transacción F-37, clase `DZ`
3. Campos en SAP: cuenta deudor, importe, LN/Sup (sucursal), CeBe (centro de beneficio), fecha vencimiento, texto libre
4. Al aceptar, el anticipo llega a la pantalla de pago estándar (reutiliza la UI de Pago Cta. Cte.)
5. Las vías de pago mostradas dependen de la condición de pago del cliente
6. Se genera: documento de anticipo (ej: 1400000015) + documento de recaudación al cobrar

> **Nota:** La contabilización del anticipo no puede hacerse directamente desde el POS en el sistema actual; primero debe registrarse en SAP. En el nuevo sistema evaluar si se puede automatizar.

### 5.6 E° de Cuenta (Estado de Cuenta)
- Existe versión imprimible
- Actualmente Cooprinsem usa otra plataforma para calcular intereses y generar estados
- ⚠️ **Pendiente definir:** ¿El nuevo front reemplaza esa plataforma o coexiste?

### 5.7 Consulta Pago
- ⚠️ **Pendiente documentar** en próximas reuniones con Mariela

### 5.8 Arqueo Caja
- ⚠️ **Pendiente documentar** en próximas reuniones con Mariela

---

## 6. Intereses por Mora

> ⚠️ Esta funcionalidad aplica para Pago Cta. Cte. en Fase 1 completa. **NO implementar en POC.**

### 6.1 Descripción
Los intereses se calculan sobre **deuda vencida** del cliente (documentos con fecha de vencimiento pasada). **No** sobre saldos negativos en caja — son cosas distintas y no confundir.

### 6.2 Configuración en SAP
- Tabla de tasas configurable en SAP (transacción `ZFI001_CNF` — pendiente confirmar nombre exacto)
- Tipo interés Afecta (`A`): con IVA
- Tipo interés Exenta (`E`): sin IVA, comisión 1%
- Indicador de intereses: campo en maestro de clientes
- Días libres: período de gracia configurable por cliente/tipo documento

### 6.3 Proceso en POS
1. Sistema detecta factura vencida al cargar partidas abiertas
2. Calcula monto de interés según reglas SAP
3. Muestra al cajero: Monto original + Interés + Total
4. Usuario con autorización puede eximir/modificar el interés
5. Al confirmar → POS gatilla la generación del documento SD en SAP (SAP ejecuta la lógica, no el frontend)
6. SAP genera: documento SD (factura de intereses) + asiento contable (Ingreso por interés a plazo + IVA débito fiscal)

### 6.4 Sobre Folios Tributarios
- En ambiente de pruebas: no hay folio tributario
- En producción: el folio se guarda en campo referencia de SAP

---

## 7. Integración con SAP S/4HANA

### 7.1 Arquitectura de Conexión
- SAP expone servicios OData. No hay bus de integración (no hay SAP PI/PO ni CPI).
- Conexión directa vía HTTP/HTTPS a los endpoints OData de SAP a través de la VPN corporativa.
- URL base actual WebDynpro: `sapqas.cooprinsem:44320/sap/bc/webdynpro/sap/zpos_wd_fun_001`
- URL base OData esperada: `sapqas.cooprinsem:44320/sap/opu/odata/sap/`

### 7.2 Servicios OData Requeridos
| Servicio | Equivalente SAP | Operaciones | Estado |
|---------|-----------------|-------------|--------|
| Consultar partidas abiertas | FBL5N | GET | ⚠️ Confirmar con ABAP |
| Datos maestros de cliente | Maestro deudor | GET | ⚠️ Confirmar con ABAP |
| Catálogo de bancos | Tabla bancos SAP | GET | ⚠️ Confirmar con ABAP |
| Ejecutar recaudación (clase W) | Doc. contable caja | POST | ⚠️ Confirmar con ABAP |
| Crear solicitud anticipo | F-37 (clase DZ) | POST | ⚠️ Confirmar con ABAP |
| Generar egreso de caja | Doc. egreso FI | POST | ⚠️ Confirmar con ABAP |
| Generar doc. SD intereses | Factura SD | POST | ⚠️ Confirmar con ABAP |
| Consultar stock por centro/almacén | Stock MM (B000-G000) | GET | ⚠️ Confirmar con ABAP |
| CRUD pedidos de venta | Pedidos SD (ZPOS) | GET/POST/PATCH | ⚠️ Confirmar con ABAP |

### 7.3 Autenticación
- Basic Auth sobre HTTPS (vía VPN)
- Mismo usuario SAP que el WebDynpro actual
- CSRF Token requerido para operaciones de escritura (POST/PATCH/DELETE)
  - Obtener con: GET al servicio + header `x-csrf-token: fetch` → responder con el token en operaciones de escritura

### 7.4 Formato OData
- Respuestas en JSON (incluir `$format=json` en headers o query)
- Paginación con `$top`, `$skip`
- Filtros con `$filter` (ej: `$filter=KUNNR eq '0001000001'`)
- Campos en alemán SAP → mapear a español en la capa de tipos del frontend

---

## 8. Requisitos No Funcionales

### 8.1 Rendimiento
- Carga inicial de la app: < 3 segundos en VPN de 10 Mbps
- Búsqueda de artículos/clientes: < 1 segundo
- Grabación de pedido: < 3 segundos
- Registro de cobro en caja: < 3 segundos

### 8.2 Usabilidad
- Interfaz táctil-friendly para tablets Android
- Operación con teclado para PCs de caja (atajos de teclado)
- Feedback visual inmediato en cada acción (spinners, mensajes de éxito/error)
- Mensajes de error descriptivos en español (no exponer errores técnicos SAP crudos al usuario)
- Estilo SAP Fiori — familiar para usuarios del ecosistema SAP

### 8.3 Seguridad
- Autenticación delegada a SAP (credenciales SAP del usuario)
- Roles controlados por SAP Authorization Objects
- No almacenar credenciales en `localStorage`
- HTTPS obligatorio (garantizado por VPN corporativa)
- Timeout de sesión configurable (sugerido: 30 min de inactividad)

### 8.4 Disponibilidad Fase 1
- Dependiente de VPN y SAP (SLA SAP Cooprinsem)
- Ante caída de VPN: mostrar mensaje claro "Sin conexión a SAP" con reintentos automáticos

---

## 9. Riesgos Identificados

| # | Riesgo | Impacto | Mitigación |
|---|--------|---------|------------|
| 1 | Servicios OData no disponibles o incompletos | **Crítico** | Coordinar con ABAP tempranamente. Definir contratos OData antes de iniciar desarrollo. Usar MSW para no bloquear desarrollo UI. |
| 2 | VPN inestable en sucursales remotas | Alto | Fase 2 offline mitiga esto. En Fase 1, implementar reintentos automáticos y colas de transacciones pendientes. |
| 3 | Conflictos de stock en modo offline (Fase 2) | Alto | Definir política de negocio: ¿gana el primero en sincronizar? ¿Se permite sobreventa? (⚠️ pendiente con Cooprinsem) |
| 4 | Peso ejecutable Electron (~150 MB) | Medio | Implementar auto-update. 18 sucursales hace manejable la distribución. |
| 5 | Plataforma externa de intereses/estados de cuenta | Medio | ⚠️ Clarificar con cliente si nuestro front la reemplaza o coexiste. |
| 6 | Resistencia al cambio de usuarios cajeros | Medio | UI con estilo Fiori similar al WebDynpro. Mantener flujos funcionales idénticos. |

---

## 10. Pendientes por Validar (con Mariela y equipo Cooprinsem)

- [ ] Lista exacta de servicios OData ya expuestos en SAP
- [ ] Servicios OData que el equipo ABAP debe construir (con especificación de campos)
- [ ] Nombre exacto del mantenedor de tasas de interés (¿tabla SAP existente o crear?)
- [ ] Plataforma externa de estados de cuenta: ¿qué es? ¿Nuestro front la reemplaza o coexiste?
- [ ] Detalle completo de pantallas: Consulta Pago, Arqueo Caja
- [ ] Flujo completo de Pagarés con casos reales (pendiente replicación práctica)
- [ ] Frecuencia y duración de cortes de internet en sucursales
- [ ] Política de conflictos de stock en modo offline (Fase 2)
- [ ] Estrategia de actualización automática de la app (auto-update en Electron)
- [ ] Lógica exacta del mantenedor de intereses (períodos, porcentajes, cómo se gatilla)
- [ ] Parametrización de montos máximos de egreso por sucursal
- [ ] Código SAP Client y parámetros org. de ventas/canal/sector
- [ ] Multi-caja: ¿puede haber múltiples cajas simultáneas por sucursal?
- [ ] Impresoras de recibo: tipo (térmica A4, USB, IP), driver compatible
- [ ] Lector de código de barras: USB HID vs. cámara tablet

### Nuevos pendientes identificados en reuniones de mejora (NotasMejorasCooprinsem_v3)
- [ ] **Estado crediticio del cliente:** ¿Qué servicio OData expone crédito asignado, utilizado y % agotamiento? (consultor SAP indica posible nueva interfaz)
- [ ] **Buscador clientes priorización por sucursal:** ¿Cómo determinar la sucursal del cliente en SAP para ordenar resultados?
- [ ] **Materiales "NO USAR":** ¿Qué flag en el maestro de materiales SAP identifica los productos no activos? (posible `MARA-LVORM` o flag de bloqueo)
- [ ] **Cotizaciones como tipo de documento:** El usuario indicó que quiere informar precios desde el POS. ¿Se implementa como tipo documento adicional en `ZPOS` o es un flujo separado?
- [ ] **Modo offline:** Pendiente replantear con Juan Pablo (según nota en Excel: "Conversación interna pendiente")
- [ ] **Historial de ventas por cliente/producto (VA05N):** ¿Se incluye en Fase 1 o es post-scope?

---

## Especificaciones Detalladas por Módulo

Los siguientes archivos contienen la especificación completa de cada módulo, generada a partir de las presentaciones del cliente:

- **Caja: Recaudación (Pago Cta. Cte., Anticipo, Egreso)** → @docs/PRD_CAJA_RECAUDACION.md
- **Caja: Arqueo y Cierre de Caja** → @docs/PRD_CAJA_ARQUEO.md
- **Módulo Punto de Venta (POC)** → @docs/PRD_POC_PUNTO_DE_VENTA.md
