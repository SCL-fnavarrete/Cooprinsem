__PRD — Módulo Punto de Venta \(POC / Prototipo\)__

__Sección 1 — Información General del Módulo__

Campo

Valor

__Nombre del Módulo__

POC Punto de Venta \(Prototipo\) — Venta Simple y Caja

__Sistema Origen__

Aplicación Web con integración SAP \(SAP SD/FI\) — Diseño Fiori

__Empresa__

COOP \(Cooperativa — referencia visible: "COOP \- Test \- Osorno"\)

__Usuarios Principales__

Vendedor de Mesón, Cajero, Administrador, Consultas

__Documento Fuente__

POC\_260223\.pptx \(Prueba de Concepto, fechada 26/02/2023\)

__Idioma__

Español \(Chile / México\)

__Plataforma__

Aplicación Web \(navegador\) — SAP Fiori Fundamental React

__Módulos SAP Relacionados__

SD \(Sales & Distribution\), FI \(Financial Accounting\), MM \(Materials Management\)

__Sección 2 — Objetivo del Módulo__

El módulo tiene como objetivo desarrollar una __prueba de concepto \(POC\)__ de una aplicación de __punto de venta__ para la cooperativa COOP\. El prototipo cubre dos flujos críticos de negocio: __Venta Simple \(Venta Mesón\)__ y __Caja \(Pago Efectivo\)__\.

El sistema permite a un vendedor crear pedidos de venta desde el mesón de una sucursal \(tienda\), registrando datos del cliente, artículos, precios, descuentos, condiciones logísticas de despacho y datos fiscales\. Una vez creado el pedido, éste transita al módulo de Caja donde un cajero procesa el cobro \(inicialmente sólo pago en efectivo\), registra los medios de pago, genera documentos tributarios y cierra la transacción\.

El diseño de interfaz sigue los lineamientos de __SAP Fiori__ \(basado en React\), integrándose con los maestros de SAP \(clientes, materiales, centros, almacenes, condiciones de pago\) y respetando el modelo de datos estándar de SAP SD\.

__Sección 3 — Resumen Ejecutivo del Flujo__

┌─────────────────────────────────────────────────────────────────────┐ │ FLUJO END\-TO\-END │ └─────────────────────────────────────────────────────────────────────┘ ┌──────────┐ ┌────────────────┐ ┌──────────────────────┐ │ LOGIN │────►│ MENÚ PRINCIPAL │────►│ SELECCIÓN MÓDULO │ │\(Usuario \+│ │ │ │ ┌──────────────┐ │ │ Rol\) │ │ │ │ │Administración│ │ └──────────┘ └────────────────┘ │ ├──────────────┤ │ │ │ Pedidos │◄───┤ │ ├──────────────┤ │ │ │ Caja │◄───┤ │ └──────────────┘ │ └──────────────────────┘ │ ┌─────────────────────┼──────────────┐ ▼ ▼ ▼ ┌──────────────┐ ┌───────────────┐ ┌────────────┐ │ADMINISTRACIÓN│ │ PEDIDOS │ │ CAJA │ │• Usuarios │ │\(Venta Mesón\) │ │ │ │• Roles │ │ │ │ │ │• Sucursales │ │ 1\.Cabecera │ │ 1\.Grilla │ │• Clientes │ │ 2\.Detalle Art\. │ │ pedidos │ │• Artículos │ │ 3\.Logística │ │ creados │ └──────────────┘ │ 4\.Resumen $ │ │ │ │ 5\.Grabar │ │ 2\.Detalle │ └───────┬────────┘ │ pago │ │ │ │ │ Estado: │ 3\.Medio │ │ "Pedido │ pago │ │ Creado" │ \(Efectivo\)│ │ │ │ └───────────►│ 4\.Confirmar│ │ pago │ └────────────┘

__Sección 4 — Análisis Detallado por Pantalla \(Slide\-by\-Slide\)__

__Slide 1 — "Desarrollo POC \(Prototipo\)"__

- __Tipo de pantalla__: Diagrama de alcance / Índice de módulos
- __Funcionalidad principal__: Presenta la estructura general del prototipo y los tres pilares funcionales del sistema\.
- __Subtítulo__: *"Desarrollo de aplicación para punto de ventas\. Prueba conceptual: Venta simple y Caja"* \(nota: existe un typo — dice "par" en lugar de "para"\)
- __Componentes UI identificados__: Tres columnas con rectángulos que agrupan funcionalidades:
	- __Columna 1 — "Seguridad / Maestros"__: Usuarios, Roles, Sucursales, Clientes, Artículos
	- __Columna 2 — "Pedido \(Casos Uso\)"__: 1\.\- Venta Mesón
	- __Columna 3 — "Caja \(Casos Uso\)"__: 1\.\- Pago Efectivo
- __Insight PRD__:
	- El alcance del POC se limita a UN caso de uso de pedido \(Venta Mesón\) y UN caso de uso de caja \(Pago Efectivo\)\. Otros tipos de venta y medios de pago quedan fuera del alcance inicial\.
	- Los maestros de Seguridad incluyen 5 entidades que deben existir antes del flujo transaccional\.
	- *\[Inferencia\]* La numeración "1\.\-" sugiere que futuras iteraciones incluirán más casos de uso \(Venta Industrial, Pago Tarjeta, etc\.\)

__Slide 2 — "Maestros y Seguridad"__

- __Tipo de pantalla__: Capturas de pantalla del sistema — Tablas de datos \+ Diagrama de navegación
- __Funcionalidad principal__: Administración de usuarios, roles y navegación post\-login\.
- __Componentes UI identificados__:
	- __Tabla "Usuario"__: Grilla con columnas visibles — incluye campos como Emi\_Usu \(email, ej: jcastillo@lasys\.d…\), Est\_Usu \(estado, valores: 1/2\)
	- __Tabla "Roles"__: Grilla con columnas numéricas \(1\-4\) y lista de roles: Administrador, Ventas, Caja, Consultas
	- __Diagrama de flujo Login__: Caja "Login" con conectores hacia tres módulos: Administración, Pedidos, Caja
- __Textos literales__: Título "Maestros y Seguridad"; tablas de Usuario y Roles
- __Insight PRD__:
	- El sistema tiene __4 roles definidos__: \(1\) Administrador, \(2\) Ventas, \(3\) Caja, \(4\) Consultas
	- Cada usuario tiene un estado \(Est\_Usu\) que puede ser 1 o 2 \(activo/inactivo\)
	- Post\-login, la navegación se bifurca según el rol del usuario: Administración, Pedidos o Caja
	- *\[Inferencia\]* El rol "Consultas" probablemente tiene acceso de solo lectura a los módulos\.
	- *\[Inferencia\]* Los emails usan dominio "@lasys\.d\.\.\." \(posiblemente @lasys\.dev o @lasys\.de — proveedor del desarrollo\)

__Slide 3 — "Pedidos" \(Ejemplo de Pedido\)__

- __Tipo de pantalla__: Captura de pantalla del sistema — Formulario de pedido completo
- __Funcionalidad principal__: Muestra la interfaz completa de creación de un pedido de venta tipo "Venta Mesón"
- __Componentes UI identificados__ \(extraídos de la captura de pantalla\):
	- __Header de aplicación__: "COOP \- Test \- Osorno" \(nombre de la instancia/sucursal\)
	- __Zona superior__ \(Cabecera del pedido\): Campos de cliente, tipo documento, canal, vendedor
	- __Grilla central__: Tabla de artículos con columnas \(Artículo, Descripción, Centro, Almacén, Cantidad, UM, Precio unitario, etc\.\)
	- __Zona inferior__: Paneles de resumen \(Stock, Montos, Observaciones\)
	- __Tabs/Pestañas__: Navegación entre secciones del pedido
- __Textos literales__: Subtítulo "Ejemplo de pedido\."
- __Insight PRD__:
	- La interfaz sigue un layout maestro\-detalle con cabecera fija y grilla scrollable
	- El sistema opera por sucursal \(Osorno visible como entorno de prueba\)
	- *\[Inferencia\]* La pantalla es tipo SPA \(Single Page Application\) con secciones colapsables

__Slide 4 — "Pedidos" \(Datos del Pedido — Detalle Textual\)__

- __Tipo de pantalla__: Documentación de campos — Especificación funcional
- __Funcionalidad principal__: Detalla todos los campos de la __Cabecera del Pedido \(Datos Generales\)__
- __Componentes UI documentados__ \(textos literales de los callouts\):
	1. __Canal distribución__: Ej: Venta Mesón / Venta industrial
	2. __Tipo Documento__: Ej: Venta Normal / Venta Boleta / V\. Puesto fundo / V\. Calzada / Venta Anticipada
	3. __Cliente__: Código del cliente que realiza la compra
	4. __Destinatario__: Quién recibe la mercadería
	5. __Retira__: Persona autorizada para retirar
	6. __Cliente / Planta__: Relación del cliente con una planta específica \(planta o cliente\)
	7. __Vendedor__: Código y nombre del ejecutivo \(en la imagen: Luis Eduardo Angulo\)
	8. __Tipo de Compra__: 1 → Compras del giro
	9. __Nro\. Pedido__: Número correlativo del sistema
	10. __Grupo crédito / Segmento__: Información financiera del cliente
	11. __Cond\. Pago__: Acuerdos de pago \(contado, crédito, Efectivo\)\. Dato cliente
	12. __O\.C\. Cliente__: Orden de Compra física o externa del cliente
	13. __Descuento %__: Aplicación de descuentos globales
	14. __Clas\. Fisc__: Clasificación fiscal del pedido
	15. __Oficina de ventas__: Ej: D190
- __Insight PRD__:
	1. RN: El campo "Tipo Documento" tiene 5 valores posibles que determinan el comportamiento fiscal del pedido
	2. RN: El "Vendedor" se asigna automáticamente según el login o se selecciona manualmente
	3. RN: La "Cond\. Pago" es un dato que viene del maestro de clientes
	4. RN: El "Nro\. Pedido" es generado automáticamente \(correlativo del sistema\)
	5. RN: La "Oficina de ventas" probablemente se determina por la sucursal del usuario
	6. *\[Inferencia\]* Los campos "Destinatario" y "Retira" son interlocutores comerciales \(partners\) en terminología SAP SD
	7. *\[Inferencia\]* "Tipo de Compra = 1 → Compras del giro" sugiere un catálogo de tipos de compra relevantes para el SII \(Chile\)

__Slide 5 — Pedidos \(Logística, Detalle de Artículos, Resumen\)__

- __Tipo de pantalla__: Documentación de campos — Especificación funcional \(continuación\)
- __Funcionalidad principal__: Documenta tres secciones adicionales del pedido
- __Sección A — Datos de Logística y Entrega__:
	- __Patente__: Placa del vehículo de retiro
	- __Despacho__: Modalidad de entrega \(Ej: Retiro en Tienda\)
	- __Zona transporte__ *\(resaltado en amarillo — campo pendiente/por definir\)*
	- __Recargo Flete__ *\(resaltado en amarillo — campo pendiente/por definir\)*
- __Sección B — Detalle de Artículos \(Grilla Central\)__:
	- __Artículo / Descripción__: Código y nombre del producto
	- __Centro / Almacén__: Lugar físico de donde sale el stock
	- __Ruta / Cantidad / UM__: Unidades de medida y cantidades
	- __Precio unitario / Precio Proveedor__: Costos y precios base
	- __Subtotal / Recargo / Valor flete__: Desglose económico por línea
- __Sección C — Paneles Inferiores \(Resumen y Notas\)__:
	- __Stock por centro__: Disponibilidad en diferentes bodegas \(B000, B001, B002, G000\)
	- __Montos__: Resumen financiero: SUBTOTAL, Flete, IVA, Imp\. Específico, TOTAL
	- __Observaciones de Factura__: Texto que aparecerá en el documento legal
	- __Ubicación Predio__: Información geográfica del lugar de destino
- __Insight PRD__:
	- RN: Los campos "Zona transporte" y "Recargo Flete" están marcados con highlight amarillo, lo que indica que están __pendientes de definición__ o requieren revisión
	- RN: El stock se consulta en tiempo real por centro/almacén \(bodegas B000, B001, B002, G000\)
	- RN: El desglose de montos incluye impuestos chilenos: IVA e Impuesto Específico
	- RN: Las "Observaciones de Factura" se imprimen en el documento tributario electrónico \(DTE\)
	- *\[Inferencia\]* El Precio Proveedor se muestra como referencia de costo para el vendedor \(margen\)
	- *\[Inferencia\]* Cada línea del pedido puede tener un recargo de flete individual

__Slide 6 — "Caja" \(Grilla de Pedidos Creados\)__

- __Tipo de pantalla__: Captura de pantalla — Listado/Grilla de pedidos
- __Funcionalidad principal__: Muestra la bandeja de entrada del módulo Caja con los pedidos pendientes de pago
- __Subtítulo__: *"Pago de pedido\. El pedido llega a la grilla principal\. \(Pedido Creado\)"*
- __Componentes UI identificados__:
	- __Header__: "COOP \- Test \- Osorno" \+ Usuario logueado: "MARIELA ALEJANDRA OYARZUN GUERRERO"
	- __Menú lateral izquierdo__: Navegación con opciones \(Usuario, Sucursal, Sociedad\)
	- __Grilla principal__: Lista de pedidos en estado "Creado" listos para cobro
	- __Área de mensajes__: Panel inferior derecho \(vacío en la captura\)
- __Insight PRD__:
	- RN: Solo los pedidos con estado "Pedido Creado" aparecen en la bandeja de Caja
	- RN: El cajero puede identificar al usuario logueado \(nombre completo visible en header\)
	- RN: La Caja está asociada a una sucursal y sociedad específica
	- *\[Inferencia\]* El flujo es asíncrono: el vendedor crea el pedido → aparece en la cola del cajero

__Slide 7 — "Caja" \(Detalle de Pago\)__

- __Tipo de pantalla__: Captura de pantalla — Formulario de detalle de pago
- __Funcionalidad principal__: Pantalla de detalle al hacer doble click en un pedido de la grilla
- __Subtítulo__: *"Al hacer doble click en el pago\. Aparecerá la pantalla con el siguiente detalle\."*
- __Componentes UI identificados__:
	- __Sección "Información de Cliente"__: Datos del comprador
	- __Tabla "Documentos a Cancelar"__: Lista de documentos/líneas del pedido con montos
	- __Sección "Medios de Pago"__: Selector de formas de pago
	- __Tabla "Medios de Pagos Seleccionados"__: Grilla con los pagos aplicados \(celdas con highlight amarillo\)
	- __Columna "Monto"__: Valores monetarios \(ej: 232,001\)
- __Insight PRD__:
	- RN: El acceso al detalle es mediante doble click en la fila del pedido
	- RN: Se muestra información del cliente para verificación antes del cobro
	- RN: Los documentos a cancelar pueden ser múltiples líneas \(parcialización\)
	- RN: Los medios de pago seleccionados se acumulan en una tabla resumen
	- *\[Inferencia\]* El sistema soportará múltiples medios de pago combinados en el futuro \(split payment\)

__Slide 8 — "Caja" \(Modal Forma de Pago Efectivo\)__

- __Tipo de pantalla__: Captura de pantalla — Modal/Popup de pago
- __Funcionalidad principal__: Formulario modal para registrar el pago en efectivo
- __Subtítulo__: *"Al hacer doble click en el pago\. Aparecerá la pantalla con el siguiente detalle\."*
- __Componentes UI identificados__:
	- __Modal "Forma de pago Efectivo"__: Ventana superpuesta sobre la pantalla de detalle
	- __Campos del cliente visibles detrás del modal__: Rut, Nombres, Dirección, Población, Distrito, Segmento
	- __Tabla "Documentos a Cancelar"__: Parcialmente visible detrás del modal
	- __Campos del modal__: Monto a pagar, desglose
	- __Etiquetas visibles__: "TOTAL A DEVOLV\.\.\." \(Total a devolver — vuelto\), "TOTAL A CTA CTE\.\.\." \(Total a Cuenta Corriente\)
- __Insight PRD__:
	- RN: El pago en efectivo abre un modal que muestra el monto a pagar y calcula el vuelto
	- RN: Existe un campo "TOTAL A DEVOLVER" \(cálculo del cambio/vuelto\)
	- RN: Existe un campo "TOTAL A CTA CTE" \(saldo que puede ir a cuenta corriente del cliente\)
	- RN: Se muestran datos del cliente \(Rut, Nombre, Dirección\) para validación visual
	- *\[Inferencia\]* El Rut es el identificador tributario chileno \(RUN/RUT\)
	- *\[Inferencia\]* La funcionalidad de "CTA CTE" implica que un pago puede ser parcial y el resto quedar como crédito

__Slide 9 — "Diseño Fiori" \(Referencias de diseño\)__

- __Tipo de pantalla__: Referencia visual — Diseño de UI/UX
- __Funcionalidad principal__: Muestra el estándar de diseño SAP Fiori como referencia para el desarrollo
- __Componentes UI identificados__:
	- __Captura izquierda__: Dashboard SAP Fiori — Tiles de Human Capital Management, Logistics \(MM\) con opciones "Approve Requisitions", "Order from Requisitions"
	- __Captura derecha__: Dashboard de datos de proveedor con gráficos y KPIs
	- __URL de referencia__: Link a SAP Community sobre "Fiori Fundamental React\-based web application development for beginners"
- __Insight PRD__:
	- RN: La interfaz debe seguir las guías de diseño __SAP Fiori__ \(tiles, navegación lateral, diseño responsivo\)
	- RN: La tecnología base es __React__ con las librerías Fiori Fundamental
	- *\[Inferencia\]* El sistema se construirá como aplicación web React independiente que consume APIs SAP

__Slide 10 — "Diseño Fiori" \(Ejemplo de listado/reporte\)__

- __Tipo de pantalla__: Referencia visual — Ejemplo de grilla/reporte estilo Fiori
- __Funcionalidad principal__: Muestra un ejemplo de vista tipo listado/reporte en estilo Fiori
- __Componentes UI identificados__:
	- __Tabla/Grilla__: Listado de reportes con columnas \(Report ID, fechas, estados\)
	- __Barra de filtros__: Standard, Unit: All, Generator, Report Type, Creation Date
	- __Botones de acción__: Search, Create, Delete
	- __Indicadores de navegación__: Flechas \(→\) para expandir/navegar al detalle
	- __Columnas abreviadas__: UA, UB \(posiblemente unidades\)
- __Insight PRD__:
	- RN: Las grillas deben incluir filtros en la cabecera \(filtrado por tipo, fecha, unidad\)
	- RN: Las acciones CRUD \(Buscar, Crear, Eliminar\) deben estar en la barra de herramientas
	- RN: La navegación maestro\-detalle usa flechas de drill\-down en cada fila
	- *\[Inferencia\]* Esta vista sirve como template para las grillas de Pedidos y Caja

__Sección 5 — Entidades / Modelo de Datos__

__5\.1 Entidad: Usuario__

Campo

Tipo

Descripción

Id\_Usu

Integer \(PK\)

Identificador único del usuario

Nom\_Usu

String

Nombre completo del usuario

Emi\_Usu

String \(Email\)

Correo electrónico del usuario

Est\_Usu

Integer \(1/2\)

Estado del usuario \(1=Activo, 2=Inactivo\)

Rol\_Usu

Integer \(FK\)

Rol asignado \(1\-4\)

Suc\_Usu

String \(FK\)

Sucursal asignada

__5\.2 Entidad: Rol__

Campo

Tipo

Descripción

Id\_Rol

Integer \(PK\)

Identificador del rol

Nom\_Rol

String

Nombre: Administrador, Ventas, Caja, Consultas

Permisos

JSON/Array

Módulos habilitados

__5\.3 Entidad: Sucursal__

Campo

Tipo

Descripción

Cod\_Suc

String \(PK\)

Código de la sucursal

Nom\_Suc

String

Nombre \(ej: Osorno\)

Sociedad

String

Código de sociedad SAP

Oficina\_Ventas

String

Código oficina de ventas \(ej: D190\)

__5\.4 Entidad: Cliente__

Campo

Tipo

Descripción

Cod\_Cli

String \(PK\)

Código del cliente

Rut

String

RUT del cliente \(identificador tributario Chile\)

Nombres

String

Nombre del cliente

Dirección

String

Dirección fiscal

Población

String

Localidad/Comuna

Distrito

String

Distrito/Región

Segmento

String

Segmento comercial

Grupo\_Credito

String

Grupo de crédito financiero

Cond\_Pago

String

Condición de pago por defecto

Clas\_Fiscal

String

Clasificación fiscal

Tipo\_Compra

Integer

Tipo de compra \(1=Compras del giro\)

__5\.5 Entidad: Artículo \(Material\)__

Campo

Tipo

Descripción

Cod\_Art

String \(PK\)

Código del artículo/material

Descripcion

String

Nombre del producto

UM

String

Unidad de medida

Precio\_Unitario

Decimal

Precio de venta unitario

Precio\_Proveedor

Decimal

Precio de costo/proveedor

__5\.6 Entidad: Pedido \(Cabecera\)__

Campo

Tipo

Descripción

Nro\_Pedido

Integer \(PK\)

Número correlativo auto\-generado

Canal\_Dist

String

Canal de distribución \(Venta Mesón/Industrial\)

Tipo\_Documento

String

Tipo de doc\. tributario

Cod\_Cliente

String \(FK\)

Código del cliente comprador

Cod\_Destinatario

String \(FK\)

Código del destinatario de mercadería

Retira

String

Persona autorizada para retiro

Cod\_Planta

String \(FK\)

Planta asociada

Cod\_Vendedor

String \(FK\)

Código del vendedor/ejecutivo

Tipo\_Compra

Integer

Tipo de compra

Grupo\_Credito

String

Grupo de crédito del cliente

Segmento

String

Segmento del cliente

Cond\_Pago

String

Condición de pago aplicada

OC\_Cliente

String

Orden de compra externa del cliente

Descuento\_Pct

Decimal

Porcentaje de descuento global

Clas\_Fiscal

String

Clasificación fiscal

Oficina\_Ventas

String

Código oficina de ventas

Patente

String

Placa del vehículo de retiro

Despacho

String

Modalidad \(Retiro en Tienda, Despacho\)

Zona\_Transporte

String

Zona de transporte

Recargo\_Flete

Decimal

Recargo por flete

Subtotal

Decimal

Subtotal neto

Flete

Decimal

Valor del flete

IVA

Decimal

Impuesto al Valor Agregado

Imp\_Especifico

Decimal

Impuesto específico

Total

Decimal

Total del pedido

Obs\_Factura

Text

Observaciones para el documento tributario

Ubicacion\_Predio

String

Ubicación geográfica de destino

Estado

String

Estado del pedido

Fecha\_Creacion

DateTime

Fecha y hora de creación

__5\.7 Entidad: Pedido\_Detalle \(Líneas\)__

Campo

Tipo

Descripción

Id\_Linea

Integer \(PK\)

Identificador de línea

Nro\_Pedido

Integer \(FK\)

Pedido padre

Cod\_Articulo

String \(FK\)

Código del artículo

Centro

String

Centro logístico \(planta\)

Almacen

String

Almacén/Bodega \(B000, B001, B002, G000\)

Ruta

String

Ruta de entrega

Cantidad

Decimal

Cantidad solicitada

UM

String

Unidad de medida

Precio\_Unitario

Decimal

Precio unitario de venta

Precio\_Proveedor

Decimal

Precio de referencia del proveedor

Subtotal

Decimal

Subtotal de la línea

Recargo

Decimal

Recargo aplicado a la línea

Valor\_Flete

Decimal

Valor del flete de la línea

__5\.8 Entidad: Pago__

Campo

Tipo

Descripción

Id\_Pago

Integer \(PK\)

Identificador del pago

Nro\_Pedido

Integer \(FK\)

Pedido asociado

Medio\_Pago

String

Forma de pago \(Efectivo\)

Monto\_Total

Decimal

Monto total a pagar

Monto\_Recibido

Decimal

Monto entregado por el cliente

Total\_Devolver

Decimal

Vuelto/cambio a devolver

Total\_Cta\_Cte

Decimal

Monto a cuenta corriente

Cajero

String \(FK\)

Usuario cajero que procesa

Fecha\_Pago

DateTime

Fecha/hora del cobro

__5\.9 Catálogos/Maestros Referenciados__

Catálogo

Valores Conocidos

Canal de Distribución

Venta Mesón, Venta Industrial

Tipo de Documento

Venta Normal, Venta Boleta, V\. Puesto Fundo, V\. Calzada, Venta Anticipada

Tipo de Compra

1 = Compras del giro

Condición de Pago

Contado, Crédito, Efectivo

Modalidad Despacho

Retiro en Tienda, \(otros por definir\)

Roles

1=Administrador, 2=Ventas, 3=Caja, 4=Consultas

Estado Usuario

1=Activo, 2=Inactivo

Almacenes

B000, B001, B002, G000

Oficina de Ventas

D190 \(otros por definir\)

__Sección 6 — Reglas de Negocio__

ID

Regla

Tipo

Fuente

__RN\-01__

El Nro\. de Pedido se genera automáticamente como correlativo del sistema

Explícita

Slide 4

__RN\-02__

La Condición de Pago se hereda del maestro de clientes al seleccionar el cliente

Explícita

Slide 4 \("Dato cliente"\)

__RN\-03__

Los Tipos de Documento válidos son: Venta Normal, Venta Boleta, V\. Puesto Fundo, V\. Calzada, Venta Anticipada

Explícita

Slide 4

__RN\-04__

Los Canales de Distribución válidos son: Venta Mesón y Venta Industrial

Explícita

Slide 4

__RN\-05__

El Tipo de Compra "1" corresponde a "Compras del giro"

Explícita

Slide 4

__RN\-06__

La Oficina de Ventas se asigna según la sucursal \(ej: D190\)

Explícita

Slide 4

__RN\-07__

El stock se consulta en tiempo real por centro y almacén \(B000, B001, B002, G000\)

Explícita

Slide 5

__RN\-08__

El desglose de montos incluye: Subtotal \+ Flete \+ IVA \+ Impuesto Específico = TOTAL

Explícita

Slide 5

__RN\-09__

Las Observaciones de Factura se imprimen en el documento tributario legal

Explícita

Slide 5

__RN\-10__

Los campos "Zona Transporte" y "Recargo Flete" están pendientes de definición \(resaltados en amarillo\)

Explícita

Slide 5

__RN\-11__

Los pedidos creados aparecen automáticamente en la grilla de Caja con estado "Pedido Creado"

Explícita

Slide 6

__RN\-12__

Para acceder al detalle de pago, el cajero hace doble click en el pedido de la grilla

Explícita

Slide 7

__RN\-13__

El pago en Efectivo muestra modal con cálculo de "Total a Devolver" \(vuelto\)

Explícita

Slide 8

__RN\-14__

Existe la posibilidad de enviar un monto a "Cuenta Corriente" del cliente \(Total a Cta\. Cte\.\)

Explícita

Slide 8

__RN\-15__

El sistema tiene 4 roles: Administrador, Ventas, Caja, Consultas

Explícita

Slide 2

__RN\-16__

El estado del usuario puede ser 1 \(Activo\) o 2 \(Inactivo\)

Explícita

Slide 2

__RN\-17__

La interfaz debe seguir el estándar de diseño SAP Fiori \(React Fundamental\)

Explícita

Slides 9\-10

__RN\-18__

*\[Inferencia\]* El vendedor se asigna automáticamente basado en el usuario logueado, con posibilidad de cambio manual

Inferida

Slide 4

__RN\-19__

*\[Inferencia\]* Los descuentos globales \(%\) se aplican al subtotal antes de impuestos

Inferida

Slide 4

__RN\-20__

*\[Inferencia\]* Un pedido no puede pasar a Caja sin tener al menos una línea de detalle con artículo

Inferida

Flujo general

__RN\-21__

*\[Inferencia\]* El usuario con rol "Consultas" solo puede ver pedidos y pagos sin modificarlos

Inferida

Slide 2

__RN\-22__

*\[Inferencia\]* La Caja está vinculada a una sucursal y sociedad específica; no puede operar multi\-sucursal

Inferida

Slide 6

__RN\-23__

*\[Inferencia\]* El precio del proveedor se muestra para referencia de margen pero no afecta el precio de venta al cliente

Inferida

Slide 5

__RN\-24__

*\[Inferencia\]* El IVA en Chile es del 19% y se calcula automáticamente sobre el neto

Inferida

Slide 5

__Sección 7 — Roles y Permisos__

Rol

ID

Módulo Administración

Módulo Pedidos

Módulo Caja

Descripción

__Administrador__

1

✅ CRUD completo

✅ CRUD completo

✅ CRUD completo

Acceso total al sistema, gestión de maestros y seguridad

__Ventas__

2

❌ Sin acceso

✅ Crear, Editar, Ver pedidos

❌ Sin acceso directo

Vendedor de mesón, crea y gestiona pedidos

__Caja__

3

❌ Sin acceso

👁️ Solo lectura

✅ Procesar pagos, ver grilla

Cajero, procesa cobros de pedidos creados

__Consultas__

4

❌ Sin acceso

👁️ Solo lectura

👁️ Solo lectura

Acceso de solo lectura para supervisión

__Sección 8 — Flujos de Usuario__

__Flujo 1: Vendedor — Crear Pedido \(Venta Mesón\)__

INICIO │ ├── 1\. Login al sistema con credenciales │ ├── SI credenciales válidas Y estado\_usuario = 1 \(Activo\) │ │ └── Acceder al menú principal │ └── NO → Mostrar error de autenticación │ ├── 2\. Seleccionar módulo "Pedidos" │ └── Verificar rol = Ventas o Administrador │ ├── SI → Abrir pantalla de Pedidos │ └── NO → Bloquear acceso │ ├── 3\. Crear Nuevo Pedido │ ├── 3\.1 Completar CABECERA: │ │ ├── Seleccionar Canal de Distribución → "Venta Mesón" │ │ ├── Seleccionar Tipo Documento → \(Venta Normal/Boleta/etc\.\) │ │ ├── Buscar y seleccionar Cliente \(por código o RUT\) │ │ │ └── Sistema carga: Destinatario, Cond\. Pago, Grupo Crédito, │ │ │ Segmento, Clas\. Fiscal \(datos del maestro del cliente\) │ │ ├── Ingresar Retira \(persona que retira mercadería\) │ │ ├── Verificar/Modificar Vendedor \(auto\-asignado por login\) │ │ ├── Ingresar O\.C\. Cliente \(opcional\) │ │ └── Ingresar Descuento % global \(opcional\) │ │ │ ├── 3\.2 Completar LOGÍSTICA: │ │ ├── Seleccionar Despacho → "Retiro en Tienda" │ │ ├── Ingresar Patente del vehículo \(si aplica\) │ │ └── Zona Transporte / Recargo Flete \(pendiente definición\) │ │ │ ├── 3\.3 Agregar LÍNEAS DE ARTÍCULOS: │ │ ├── LOOP \(para cada producto\): │ │ │ ├── Buscar Artículo \(por código o descripción\) │ │ │ ├── Sistema muestra: Centro, Almacén, Precio Unitario │ │ │ ├── Sistema muestra: Stock por bodega \(B000, B001, B002, G000\) │ │ │ │ ├── SI hay stock → Ingresar Cantidad y UM │ │ │ │ └── NO hay stock → Alerta al vendedor │ │ │ ├── Sistema calcula: Subtotal, Recargo, Valor Flete por línea │ │ │ └── Agregar línea a la grilla │ │ └── FIN LOOP │ │ │ ├── 3\.4 Revisar RESUMEN: │ │ ├── Verificar montos: Subtotal \+ Flete \+ IVA \+ Imp\. Específico = TOTAL │ │ ├── Ingresar Observaciones de Factura \(opcional\) │ │ └── Ingresar Ubicación Predio \(si aplica\) │ │ │ └── 3\.5 GRABAR Pedido │ ├── Sistema genera Nro\. Pedido \(correlativo\) │ ├── Estado del pedido → "Pedido Creado" │ └── Pedido disponible en la grilla de Caja │ FIN

__Flujo 2: Cajero — Procesar Pago en Efectivo__

INICIO │ ├── 1\. Login al sistema con credenciales │ └── Verificar rol = Caja o Administrador │ ├── 2\. Seleccionar módulo "Caja" │ └── Sistema muestra grilla de pedidos con estado "Pedido Creado" │ ├── 3\. Seleccionar Pedido │ └── Doble click en fila del pedido de la grilla │ └── Sistema abre pantalla de DETALLE DE PAGO: │ ├── Sección: Información del Cliente \(Rut, Nombres, Dirección, │ │ Población, Distrito, Segmento\) │ ├── Tabla: Documentos a Cancelar \(líneas y montos\) │ └── Sección: Medios de Pago │ ├── 4\. Registrar Medio de Pago │ ├── Seleccionar "Efectivo" │ │ └── Sistema abre MODAL "Forma de pago Efectivo": │ │ ├── Muestra monto total a cobrar │ │ ├── Cajero ingresa monto recibido del cliente │ │ ├── Sistema calcula: │ │ │ ├── TOTAL A DEVOLVER \(vuelto\) │ │ │ └── TOTAL A CTA CTE \(si pago parcial → saldo a crédito\) │ │ ├── SI monto\_recibido >= total │ │ │ └── Confirmar pago → Cerrar modal │ │ └── SI monto\_recibido < total │ │ ├── Registrar diferencia en Cuenta Corriente │ │ └── O → solicitar monto adicional │ │ │ └── Medio de pago aparece en tabla "Medios de Pagos Seleccionados" │ ├── 5\. Confirmar Transacción │ ├── Verificar que el total pagado cubre el monto del pedido │ ├── Estado del pedido → "Pagado" \(inferido\) │ └── Generar documento tributario \(Factura/Boleta según Tipo Documento\) │ FIN

__Flujo 3: Administrador — Gestión de Maestros__

INICIO │ ├── 1\. Login → Verificar rol = Administrador ├── 2\. Acceder a módulo "Administración" ├── 3\. CRUD sobre maestros: │ ├── Gestionar Usuarios \(crear, editar, activar/desactivar\) │ ├── Gestionar Roles \(asignar permisos\) │ ├── Gestionar Sucursales \(crear, configurar\) │ ├── Gestionar Clientes \(crear, editar datos fiscales\) │ └── Gestionar Artículos \(crear, editar precios, stock\) │ FIN

__Sección 9 — Integraciones__

\#

Sistema Externo

Tipo de Integración

Descripción

INT\-01

__SAP SD__ \(Sales & Distribution\)

API / RFC / OData

Creación de pedidos de venta, gestión de interlocutores comerciales \(cliente, destinatario\), condiciones de precio, flujo de documentos

INT\-02

__SAP FI__ \(Financial Accounting\)

API / RFC / OData

Registro de cobros, cuentas por cobrar, datos de cuenta corriente del cliente, grupo de crédito

INT\-03

__SAP MM__ \(Materials Management\)

API / RFC / OData

Consulta de stock por centro/almacén en tiempo real, maestro de materiales, precios de proveedor

INT\-04

__SAP Maestro Clientes__ \(BP/KNA1\)

Lectura

Datos del cliente: RUT, dirección, condiciones de pago, clasificación fiscal, segmento

INT\-05

__SII Chile__ \(Servicio de Impuestos Internos\)

*\[Inferencia\]* Web Service

Emisión de Documentos Tributarios Electrónicos \(DTE\): facturas, boletas\. Cálculo de IVA e Impuesto Específico

INT\-06

__SAP Fiori Launchpad__

Frontend

Capa de presentación basada en SAP Fiori Fundamental React para la aplicación web

__Sección 10 — Pantallas / Wireframes Requeridos__

ID

Pantalla

Actor

Plataforma

Descripción

__P\-01__

Login

Todos

Web

Formulario de autenticación con usuario y contraseña

__P\-02__

Menú Principal / Dashboard

Todos

Web

Tiles de navegación: Administración, Pedidos, Caja \(según rol\)

__P\-03__

Administración — Listado de Usuarios

Administrador

Web

Grilla CRUD con filtros para gestión de usuarios

__P\-04__

Administración — Listado de Roles

Administrador

Web

Grilla CRUD para gestión de roles y permisos

__P\-05__

Administración — Listado de Sucursales

Administrador

Web

Grilla CRUD para gestión de sucursales

__P\-06__

Administración — Listado de Clientes

Administrador

Web

Grilla CRUD para gestión de clientes

__P\-07__

Administración — Listado de Artículos

Administrador

Web

Grilla CRUD para gestión de artículos/materiales

__P\-08__

Pedidos — Formulario de Creación/Edición

Ventas

Web

Formulario completo: cabecera \+ grilla artículos \+ logística \+ resumen

__P\-09__

Pedidos — Listado de Pedidos

Ventas

Web

Grilla con filtros, búsqueda y estados de pedidos

__P\-10__

Caja — Grilla de Pedidos Pendientes

Caja

Web

Listado de pedidos en estado "Creado" listos para cobro

__P\-11__

Caja — Detalle de Pago

Caja

Web

Info cliente \+ Documentos a cancelar \+ Medios de pago

__P\-12__

Caja — Modal Pago Efectivo

Caja

Web

Modal: monto recibido, cálculo de vuelto, saldo a Cta\. Cte\.

__P\-13__

Consultas — Vista de Pedidos \(solo lectura\)

Consultas

Web

Misma grilla de pedidos pero sin opciones de edición

__P\-14__

Consultas — Vista de Pagos \(solo lectura\)

Consultas

Web

Historial de pagos procesados

__Sección 11 — Campos de Formularios__

__F\-01: Login__

Campo

Tipo

Obligatorio

Descripción

Email/Usuario

String \(email\)

Sí

Correo electrónico del usuario

Contraseña

Password

Sí

Contraseña de acceso

__F\-02: Pedido — Cabecera \(Datos Generales\)__

Campo

Tipo

Obligatorio

Descripción

Canal Distribución

Select \(catálogo\)

Sí

Venta Mesón / Venta Industrial

Tipo Documento

Select \(catálogo\)

Sí

Venta Normal / Boleta / Puesto Fundo / Calzada / Anticipada

Cliente

Search \+ Select

Sí

Código del cliente comprador

Destinatario

Search \+ Select

Sí

Quien recibe la mercadería

Retira

String

No

Persona autorizada para retiro

Cliente / Planta

Select

Sí

Relación cliente\-planta

Vendedor

Auto \+ Select

Sí

Código y nombre del ejecutivo

Tipo de Compra

Select

Sí

1 = Compras del giro

Nro\. Pedido

Integer \(auto\)

Auto

Generado por el sistema

Grupo Crédito

String \(auto\)

Auto

Cargado desde maestro del cliente

Segmento

String \(auto\)

Auto

Cargado desde maestro del cliente

Cond\. Pago

Select

Sí

Heredado del cliente, editable

O\.C\. Cliente

String

No

Número de Orden de Compra del cliente

Descuento %

Decimal

No

Porcentaje de descuento global

Clas\. Fiscal

Select

Sí

Clasificación fiscal del pedido

Oficina Ventas

String \(auto\)

Auto

Determinada por sucursal \(ej: D190\)

__F\-03: Pedido — Datos de Logística y Entrega__

Campo

Tipo

Obligatorio

Descripción

Patente

String

No

Placa del vehículo de retiro

Despacho

Select \(catálogo\)

Sí

Retiro en Tienda / otros

Zona Transporte

Select

Pendiente

*Por definir*

Recargo Flete

Decimal

Pendiente

*Por definir*

__F\-04: Pedido — Línea de Artículo \(por cada producto\)__

Campo

Tipo

Obligatorio

Descripción

Artículo

Search \+ Select

Sí

Código del producto

Descripción

String \(auto\)

Auto

Nombre del producto

Centro

Select

Sí

Centro logístico/planta

Almacén

Select

Sí

Bodega \(B000, B001, B002, G000\)

Ruta

String

No

Ruta de entrega

Cantidad

Decimal

Sí

Unidades solicitadas

UM

String \(auto\)

Auto

Unidad de medida

Precio Unitario

Decimal \(auto\)

Auto

Precio de venta

Precio Proveedor

Decimal \(auto/read\-only\)

Auto

Referencia de costo

Subtotal

Decimal \(calculado\)

Auto

Cantidad × Precio Unitario

Recargo

Decimal

No

Recargo por línea

Valor Flete

Decimal

No

Flete por línea

__F\-05: Pedido — Resumen__

Campo

Tipo

Obligatorio

Descripción

Stock por centro

Tabla \(read\-only\)

Auto

Disponibilidad por bodega

Subtotal

Decimal \(calculado\)

Auto

Suma de subtotales de líneas

Flete

Decimal \(calculado\)

Auto

Total de flete

IVA

Decimal \(calculado\)

Auto

19% sobre neto gravado

Imp\. Específico

Decimal \(calculado\)

Auto

Según tipo de producto

Total

Decimal \(calculado\)

Auto

Subtotal \+ Flete \+ IVA \+ Imp\. Esp\.

Observaciones de Factura

TextArea

No

Texto para documento tributario

Ubicación Predio

String

No

Lugar geográfico de destino

__F\-06: Caja — Modal Pago Efectivo__

Campo

Tipo

Obligatorio

Descripción

Monto Total

Decimal \(read\-only\)

Auto

Total del pedido a cobrar

Monto Recibido

Decimal

Sí

Efectivo entregado por el cliente

Total a Devolver

Decimal \(calculado\)

Auto

Vuelto = Monto Recibido \- Monto Total

Total a Cta\. Cte\.

Decimal \(calculado\)

Auto

Saldo a cuenta corriente del cliente

__Sección 12 — Estructura de Reportes__

__R\-01: Documento Tributario \(Factura / Boleta\)__

Sección

Contenido

__Encabezado__

Nombre empresa COOP, RUT empresa, Dirección sucursal, Oficina ventas, Nro\. Pedido, Tipo Documento, Fecha, Datos del Cliente \(Rut, Nombre, Dirección\), Vendedor

__Detalle \(tabla\)__

Artículo, Descripción, Cantidad, UM, Precio Unitario, Subtotal, Recargo, Valor Flete

__Resumen__

Subtotal, Flete, IVA, Impuesto Específico, TOTAL

__Pie de página__

Observaciones de Factura, Condición de Pago, O\.C\. Cliente, Clasificación Fiscal

__R\-02: Reporte de Caja / Cierre__

Sección

Contenido

__Encabezado__

Sucursal, Cajero, Fecha, Sociedad

__Detalle \(tabla\)__

Nro\. Pedido, Cliente, Monto Total, Medio de Pago, Vuelto, Saldo Cta\. Cte\.

__Resumen__

Total cobrado, Total en efectivo, Total vueltos entregados

__Sección 13 — Estados del Sistema__

__13\.1 Estados del Pedido__

┌─────────────┐ │ BORRADOR │ \(Inferido: pedido en edición\) └──────┬──────┘ │ Grabar ▼ ┌──────────────┐ │PEDIDO CREADO │ \(Estado explícito — Slide 6\) └──────┬───────┘ │ Cajero procesa pago ▼ ┌──────────────┐ │ PAGADO │ \(Inferido: pago completado\) └──────┬───────┘ │ Emisión documento ▼ ┌──────────────┐ │ FACTURADO │ \(Inferido: DTE emitido\) └──────┬───────┘ │ Entrega mercadería ▼ ┌──────────────┐ │ ENTREGADO │ \(Inferido: retiro completado\) └──────────────┘ Caminos alternativos: PEDIDO CREADO ──► ANULADO \(Inferido: cancelación antes de pago\) PAGADO ──► ANULADO \(Inferido: reversa de pago\)

__13\.2 Estados del Usuario__

┌────────┐ ┌────────────┐ │ ACTIVO │ ◄──────► │ INACTIVO │ │ \(1\) │ │ \(2\) │ └────────┘ └────────────┘

__13\.3 Estados del Pago__

┌───────────┐ ┌─────────────┐ ┌────────────┐ │ PENDIENTE │ ───► │ PROCESADO │ ───► │ CONFIRMADO │ └───────────┘ └─────────────┘ └────────────┘ │ │ └──────────── ANULADO ◄──────────────────┘

__Sección 14 — Requisitos No Funcionales__

ID

Categoría

Requisito

__RNF\-01__

Tecnología

Frontend desarrollado en React con SAP Fiori Fundamental Library

__RNF\-02__

Tecnología

Integración con backend SAP vía OData Services o RFC

__RNF\-03__

Rendimiento

La consulta de stock por centro/almacén debe responder en < 3 segundos

__RNF\-04__

Rendimiento

La creación de pedidos debe completarse en < 5 segundos

__RNF\-05__

Disponibilidad

El sistema debe operar en horario comercial de la sucursal \(ej: 8

\- 20

\)

__RNF\-06__

Seguridad

Autenticación de usuarios con credenciales únicas \(email \+ contraseña\)

__RNF\-07__

Seguridad

Control de acceso basado en roles \(RBAC\) con 4 niveles

__RNF\-08__

Seguridad

Los usuarios inactivos \(estado=2\) no pueden acceder al sistema

__RNF\-09__

Compatibilidad

Aplicación web compatible con navegadores modernos \(Chrome, Edge, Firefox\)

__RNF\-10__

Usabilidad

Interfaz debe cumplir lineamientos de diseño SAP Fiori \(consistencia, tiles, drill\-down\)

__RNF\-11__

Tributario

Cumplimiento con normativa SII Chile para emisión de DTE \(IVA 19%, Imp\. Específico\)

__RNF\-12__

Auditoría

Registro de fecha, hora y usuario para cada operación \(creación de pedido, pago\)

__RNF\-13__

Escalabilidad

La arquitectura debe permitir agregar nuevos medios de pago y tipos de venta sin refactorización mayor

__RNF\-14__

Idioma

Interfaz en español \(Chile\)

__Sección 15 — Supuestos y Dependencias__

ID

Tipo

Descripción

__S\-01__

Supuesto

Los maestros de Clientes, Artículos y Sucursales ya existen en SAP y se sincronizan con la aplicación

__S\-02__

Supuesto

El cálculo de IVA utiliza la tasa vigente en Chile \(actualmente 19%\)

__S\-03__

Supuesto

El Impuesto Específico aplica solo a ciertos productos \(ej: bebidas alcohólicas, combustibles\) según normativa SII

__S\-04__

Supuesto

La "Cuenta Corriente" del cliente es un concepto financiero gestionado en SAP FI

__S\-05__

Supuesto

El POC se limita a una sola sucursal \(Osorno\) en el entorno de prueba

__S\-06__

Supuesto

El único medio de pago en el POC es Efectivo; tarjeta/crédito/transferencia se implementarán en fases posteriores

__S\-07__

Dependencia

Disponibilidad de APIs SAP \(OData/RFC\) para consultar maestros y crear documentos SD/FI

__S\-08__

Dependencia

Infraestructura de SAP Fiori Launchpad o servidor web para desplegar la aplicación React

__S\-09__

Dependencia

Acceso a módulo SAP SD para la gestión de pedidos de venta

__S\-10__

Dependencia

Acceso a módulo SAP MM para consulta de stock en tiempo real

__S\-11__

Dependencia

Definición pendiente de los campos "Zona Transporte" y "Recargo Flete" por parte del negocio

__S\-12__

Supuesto

El proveedor de desarrollo es LASYS \(basado en emails @lasys\.d\.\.\. visibles en los maestros\)

__Sección 16 — Riesgos Identificados__

\#

Riesgo

Impacto

Mitigación Propuesta

__R\-01__

Campos "Zona Transporte" y "Recargo Flete" sin definición — pueden bloquear el flujo de logística

__Alto__

Agendar sesión de definición con área de Logística antes de iniciar desarrollo de esos campos

__R\-02__

Integración con SAP puede tener latencia alta en consultas de stock en tiempo real

__Alto__

Implementar caché local con TTL corto \(ej: 30 seg\) para consultas de stock repetidas

__R\-03__

El POC solo cubre pago Efectivo; los cajeros pueden rechazar el sistema si no soporta tarjeta

__Medio__

Comunicar claramente el alcance del POC y tener roadmap visible para los siguientes medios de pago

__R\-04__

Dependencia de APIs SAP que podrían no estar disponibles o requerir desarrollo custom

__Alto__

Hacer un spike técnico temprano para validar la disponibilidad de todas las APIs necesarias \(SD, FI, MM\)

__R\-05__

Datos de prueba insuficientes en el entorno "COOP \- Test \- Osorno"

__Medio__

Preparar set de datos de prueba completo \(clientes, artículos, precios, stock\) antes de las pruebas de usuario

__R\-06__

El diseño Fiori podría tener limitaciones para funcionalidades específicas del POS \(ej: lectura de código de barras\)

__Medio__

Evaluar extensiones de Fiori o componentes custom React para funcionalidades POS específicas

__R\-07__

Cumplimiento tributario chileno \(DTE al SII\) no está documentado explícitamente en el POC

__Alto__

Incluir módulo de facturación electrónica en el alcance o integrar con proveedor de facturación existente

__R\-08__

El typo "par" en lugar de "para" en la slide de alcance sugiere documentación no revisada formalmente

__Bajo__

Realizar revisión formal de toda la documentación antes de la firma del alcance

__Sección 17 — Glosario__

Término

Definición

__POC__

Proof of Concept / Prueba de Concepto — versión inicial del sistema para validar viabilidad

__Venta Mesón__

Tipo de venta directa en mostrador/mesón de la sucursal, donde el cliente se acerca físicamente

__DTE__

Documento Tributario Electrónico — factura o boleta electrónica según normativa SII Chile

__SII__

Servicio de Impuestos Internos — entidad tributaria de Chile

__RUT__

Rol Único Tributario — identificador fiscal de personas y empresas en Chile

__SAP SD__

Sales & Distribution — módulo SAP para ventas y distribución

__SAP FI__

Financial Accounting — módulo SAP para contabilidad financiera

__SAP MM__

Materials Management — módulo SAP para gestión de materiales

__SAP Fiori__

Framework de diseño de interfaz de usuario de SAP, basado en principios de UX modernos

__Fiori Fundamental__

Librería de componentes React para construir aplicaciones con estilo SAP Fiori

__OData__

Open Data Protocol — protocolo estándar para APIs RESTful, usado por SAP

__RFC__

Remote Function Call — protocolo de comunicación SAP para llamadas remotas

__IVA__

Impuesto al Valor Agregado — 19% en Chile

__Imp\. Específico__

Impuesto aplicado a productos específicos \(alcohol, tabaco, combustibles\)

__O\.C\.__

Orden de Compra — documento del cliente autorizando la compra

__Cond\. Pago__

Condición de Pago — acuerdo comercial sobre plazos y forma de pago

__Clas\. Fiscal__

Clasificación Fiscal — categoría tributaria del documento

__Cta\. Cte\.__

Cuenta Corriente — saldo a favor/en contra del cliente en el sistema financiero

__UM__

Unidad de Medida — kg, lt, un, etc\.

__Centro__

Centro logístico en SAP — planta o sucursal donde se gestiona el stock

__Almacén__

Subdivisión del centro — bodega específica \(B000, B001, B002, G000\)

__Canal de Distribución__

Vía por la cual se comercializan los productos \(Mesón, Industrial\)

__Oficina de Ventas__

Unidad organizativa de SAP SD que representa el punto de venta \(ej: D190\)

__Grupo Crédito__

Clasificación del cliente según su nivel de riesgo crediticio

__Segmento__

Categoría comercial del cliente para segmentación de mercado

__LASYS__

Proveedor de desarrollo de la aplicación \(inferido de los emails del sistema\)

__COOP__

Cooperativa — empresa dueña del sistema / cliente del proyecto

Este PRD cubre exhaustivamente las 10 diapositivas de la presentación __POC\_260223\.pptx__\. Los elementos marcados como *\[Inferencia\]* son deducciones basadas en el contexto visual y funcional, no textos explícitos de las slides\. Los campos resaltados en amarillo \(Zona Transporte, Recargo Flete\) requieren definición por parte del negocio antes de proceder al desarrollo

