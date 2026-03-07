__PRD — Módulo de Recaudación POS de Caja__

__Sección 1 — Información General del Módulo__

Campo

Detalle

__Nombre del Módulo__

Recaudación POS de Caja

__Sistema Origen__

SAP NetWeaver \(aplicación web POS integrada con SAP FI\)

__Empresa__

Cooprinsem

__Usuarios Principales__

Cajero/a, Jefe Administrativo

__Documento Fuente__

Presentación "CAJA POS\.pptx" \(29 diapositivas\)

__Idioma__

Español \(Chile / México\)

__Plataforma de Acceso__

Navegador Internet Explorer — Aplicación Web SAP

__Ambiente Identificado__

Servidor Desarrollo \(según captura de login SAP NetWeaver\)

__Sección 2 — Objetivo del Módulo__

El módulo de __Recaudación POS de Caja__ permite a los cajeros de Cooprinsem gestionar el cobro de documentos comerciales \(boletas y facturas\) emitidos a clientes, directamente desde un punto de venta \(POS\) conectado a SAP\. El sistema soporta tres flujos principales de recaudación:

1. __Recaudación del Día \(Contado\)__: Cobro de boletas y facturas de venta al contado emitidas en el día actual\.
2. __Recaudación de Cuenta Corriente__: Cobro de facturas pendientes asociadas a clientes con cuenta corriente, buscados por RUT\.
3. __Anticipo de Cliente__: Registro de pagos anticipados \(abonos\) que no están directamente asociados a una factura emitida, requiriendo una solicitud previa del Jefe Administrativo en SAP \(transacción F\-37\)\.

El módulo acepta múltiples vías de pago \(Efectivo, Cheque, Tarjeta de Débito, Tarjeta de Crédito, Transferencia Bancaria, Depósito, Cuenta Corriente, Saldo a Favor\) y genera automáticamente documentos contables en SAP al ejecutar cada pago\.

__Sección 3 — Resumen Ejecutivo del Flujo__

┌──────────────────────────────────────────────────────────────────────┐ │ FLUJO END\-TO\-END POS DE CAJA │ └──────────────────────────────────────────────────────────────────────┘ \[1\] LOGIN SAP NetWeaver │ \(Mandante \+ Usuario \+ Clave\) ▼ \[2\] PANTALLA PRINCIPAL POS │ \(Lista de documentos del día \+ Datos cajero\) │ ├──────────────────────┬──────────────────────┐ ▼ ▼ ▼ \[A\] RECAUDACIÓN \[B\] RECAUDACIÓN \[C\] ANTICIPO DEL DÍA CTA\. CORRIENTE CLIENTE │ │ │ ▼ ▼ ▼ Seleccionar Buscar cliente Jefe Admin crea documentos por RUT Solicitud \(F\-37\) \(Boleta/Factura\) │ │ │ Seleccionar ▼ ▼ facturas Cajero ingresa: Botón "Pago" pendientes \- Código SAP cliente │ │ \- Nº comprobante SAP ▼ Botón "Pagos" │ Pantalla de Pago │ ▼ \- Datos cliente ▼ Procesar pago \- Docs seleccionados Seleccionar anticipo \- Vías de pago medio de pago │ │ │ ▼ ▼ ▼ Documento SAP Seleccionar vía Ejecutar pago de pago │ \(EF/CH/TD/TC/TR/etc\.\) ▼ │ Detalle pago ▼ \+ Total pagado Ingresar monto │ ├─── Monto = Total ──► Aceptar │ └─── Monto > Total ──► Opciones: 1\. Vuelto 2\. Cta\. Corriente │ ▼ Resumen del pago \+ Medios seleccionados │ ▼ Ejecutar pago │ ▼ Documento contable SAP \+ Comprobante impreso

__Sección 4 — Análisis Detallado por Pantalla \(Slide\-by\-Slide\)__

__Slide 1 — Portada__

- __Título__: "RECAUDACION EN POS DE CAJA"
- __Tipo de pantalla__: Portada / Carátula
- __Funcionalidad__: Identificación del módulo
- __Componentes UI__: Imagen de fondo \(paisaje ganadero\), logo Cooprinsem, banner decorativo rojo
- __Insight PRD__: Contexto de empresa — Cooprinsem es una cooperativa del sector agropecuario\. El sistema POS se utiliza en sucursales con atención presencial a clientes\.

__Slide 2 — Login SAP NetWeaver__

- __Título__: "Recaudación POS de caja"
- __Tipo de pantalla__: Formulario de autenticación
- __Funcionalidad__: Acceso al sistema POS
- __Componentes UI__: Navegador Internet Explorer, pantalla de login SAP NetWeaver con campos: Mandante, Usuario, Contraseña
- __Textos literales__:
	- "Para ingresar a la caja POS tenemos que ingresar al navegador Internet Explorer\."
	- "Se ingresa al link que se nos entrega\."
	- "Luego se debe ingresar el mandante, usuario y clave de acceso\."
- __Insight PRD__:
	- __RN__: El acceso es vía navegador Internet Explorer \(requisito de compatibilidad\)\.
	- __RN__: Se requiere un link específico proporcionado al usuario\.
	- __RN__: La autenticación se realiza mediante tres campos: Mandante, Usuario y Clave\.
	- *\[Inferido\]* El mandante SAP determina el ambiente \(desarrollo/producción\) y la empresa\.

__Slide 3 — Pantalla post\-login__

- __Título__: "Recaudación POS de caja"
- __Tipo de pantalla__: Pantalla de transición / carga
- __Funcionalidad__: Visualización del sistema posterior al login
- __Componentes UI__: Captura de pantalla del entorno SAP web
- __Insight PRD__: *\[Inferido\]* Después del login exitoso, el sistema carga la interfaz principal del POS\.

__Slide 4 — Pantalla Principal del POS__

- __Título__: "Recaudación POS de caja"
- __Tipo de pantalla__: Dashboard / Listado principal
- __Funcionalidad__: Vista principal del cajero con documentos del día
- __Componentes UI__:
	- Panel izquierdo: __Datos del cajero__ \(nombre, sucursal\)
	- Tabla central: Listado de documentos \(boletas y facturas contado del día\)
	- Botones laterales derecho: Cuenta corriente, Anular Docto, Egreso de Caja, Deposito Ch\., Ant\. Cliente, E° de cuenta
	- Sección "Mensajes" inferior
- __Callouts__:
	- "Datos del cajero"
	- "Ventas al contado del día — Boletas y Facturas contado"
- __Insight PRD__:
	- __RN__: La pantalla principal muestra automáticamente las ventas al contado del día \(boletas y facturas\)\.
	- __RN__: Se identifican los siguientes módulos accesibles: Cuenta Corriente, Anular Documento, Egreso de Caja, Depósito Cheque, Anticipo Cliente, Estado de Cuenta\.
	- *\[Inferido\]* El cajero está asociado a una sucursal específica\.

__Slide 5 — Recaudación del Día: Selección de documentos__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Subtítulo__: "RECAUDACION DEL DIA"
- __Tipo de pantalla__: Listado interactivo con selección
- __Funcionalidad__: Selección de documentos para cobro
- __Componentes UI__: Tabla con columnas \(checkbox, Tipo documento, Folio, Rut, Cliente, Monto, Cuota, Fecha vencimiento, Vendedor\), botón "Pago", botón "Actualizar"
- __Textos literales__:
	- "1° Se debe marcar con el mouse sobre el recuadro de la izquierda la Boleta o Factura que cancelará el cliente\. Para seleccionar más de un documento usar la tecla Shift junto con el mouse"
	- "2° Se elige el botón Pago"
	- "Nota: Si el documento que el cliente desea cancelar no aparece en pantalla se debe Actualizar\. El sistema actualiza automáticamente cada 30 segundos"
- __Insight PRD__:
	- __RN__: Se pueden seleccionar múltiples documentos usando Shift \+ Click\.
	- __RN__: El sistema se auto\-actualiza cada 30 segundos\.
	- __RN__: Existe botón manual de "Actualizar" para refrescar la lista\.
	- __RN__: Los tipos de documento incluyen CONTADO \(boletas y facturas\)\.

__Slide 6 — Pantalla de Pago: Vista general__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Formulario de pago complejo
- __Funcionalidad__: Procesamiento del pago de documentos seleccionados
- __Componentes UI__:
	- Panel izquierdo: __Datos del Cliente__ \(Rut, Nombres, Dirección, Población, Distrito, Segmento\)
	- Tabla central: __Documentos seleccionados para ser cancelados__
	- Panel derecho superior: __Vías de Pago__ \(lista de medios\)
	- Panel derecho inferior: Monto \(Total a Pagar, Total Pagado, Total a Devolver\)
	- Tabla inferior: __Medios de Pagos Seleccionados__ \(Tipo Pago, Numero, Fecha, Cuota, Monto, Nro\. Tarjeta, Numero de Operación, N° Teléfono\)
- __Callouts__:
	- "Datos del Cliente"
	- "Documentos seleccionados para ser cancelados"
	- "Vías de Pago"
- __Insight PRD__:
	- __RN__: Los datos del cliente se cargan automáticamente al seleccionar documentos\.
	- __RN__: Los medios de pago disponibles son: Efectivo \(EF\), Tarjeta de Crédito \(TC\), Tarjeta de Débito \(TD\), Cheque Cliente, Transferencia Bancaria, Depósito Cliente, Cuenta Corriente, Saldo a Favor\.
	- __RN__: La tabla "Medios de Pagos Seleccionados" registra el detalle de cada medio utilizado\.
	- __RN__: Se calcula automáticamente: Total a Pagar, Total Pagado, Total a Devolver\.

__Slide 7 — Selección de Vía de Pago: Efectivo__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Formulario de pago — selección de medio
- __Funcionalidad__: Selección de la vía de pago específica
- __Callout__: "Seleccionar vía de Pago\. Para el ejemplo EFECTIVO"
- __Insight PRD__:
	- __RN__: El cajero debe seleccionar explícitamente la vía de pago de la lista antes de proceder\.
	- *\[Inferido\]* Cada vía de pago tiene un formulario/modal diferente asociado\.

__Slide 8 — Modal de Pago: Efectivo__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Modal / Diálogo de pago
- __Funcionalidad__: Ingreso de monto en efectivo
- __Componentes UI__: Modal "Pos Cooprinsem" — Forma de pago Efectivo, campo Monto, botones Aceptar/Cancelar
- __Callout__:
	- "Por defecto el monto corresponde al total de los documentos seleccionados\."
	- "Se puede recibir el pago por el mismo monto o por un monto mayor\."
	- "Luego Aceptar\. \(o Cancelar si hay algún error\)"
- __Insight PRD__:
	- __RN__: El monto por defecto es el total de documentos seleccionados\.
	- __RN__: Se permite recibir un monto mayor al total \(sobrepago\)\.
	- __RN__: El botón "Cancelar" permite revertir la operación en caso de error\.

__Slide 9 — Modal de Sobrepago: Opciones__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Modal / Diálogo de decisión
- __Funcionalidad__: Gestión de sobrepago \(monto superior al total\)
- __Componentes UI__: Modal "Pos Cooprinsem" — Tipo de Operación con opciones radio: Vuelto / Cta\. Corriente, botón Aceptar
- __Callout__:
	- "Al escribir un monto superior se elige 1 de 2 opciones:"
	- "1\. Vuelto"
	- "2\. Cta\. Corriente \(El sobre pago se ingresa a la cuenta del cliente para clientes cuenta corriente\)"
	- "Luego Aceptar\."
- __Insight PRD__:
	- __RN__: Cuando el monto recibido es mayor al total, el sistema ofrece exactamente 2 opciones: Vuelto o Abono a Cuenta Corriente\.
	- __RN__: La opción "Cta\. Corriente" solo aplica para clientes que tienen cuenta corriente activa\.
	- __RN__: El sobrepago a cuenta corriente se registra como abono/saldo a favor del cliente\.

__Slide 10 — Resumen de Pago__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Pantalla de resumen / confirmación
- __Funcionalidad__: Visualización del resumen antes de ejecutar el pago
- __Componentes UI__:
	- Sección "Opciones de Pago" con botón "Ejecutar Pago"
	- Panel derecho: Resumen del Pago \(Total a Pagar, Total Pagado, Total a Devolver\)
	- Tabla inferior: Resumen de medios de pago seleccionados
- __Callouts__:
	- "Resumen del Pago"
	- "Resumen medios de pago seleccionados"
- __Insight PRD__:
	- __RN__: Antes de ejecutar, el sistema muestra un resumen completo con todos los medios de pago seleccionados\.
	- __RN__: El botón "Ejecutar Pago" confirma y procesa la transacción\.
	- *\[Inferido\]* El Total a Devolver se calcula como: Total Pagado \- Total a Pagar\.

__Slide 11 — Confirmación: Documento Contable SAP__

- __Título__: "Recaudación POS de caja: Recaudación del día"
- __Tipo de pantalla__: Confirmación \+ Comprobante
- __Funcionalidad__: Generación de documento contable en SAP y emisión de comprobante
- __Componentes UI__:
	- Mensaje de confirmación: "Documento contable creado por SAP"
	- Sección "Mensajes" con número de documento
	- Comprobante/voucher impreso \(imagen derecha\) con: RUT, Nombre, N°SAP, Detalle Documentos \(tabla\)
- __Callout__: "Documento contable creado por SAP"
- __Insight PRD__:
	- __RN__: SAP genera automáticamente un documento contable al ejecutar el pago\.
	- __RN__: Se emite un comprobante impreso con detalle de documentos cancelados\.
	- __RN__: El comprobante incluye: RUT cliente, Nombre, N° SAP, tabla de detalle de documentos pagados\.

__Slide 12 — Ejemplo: Cancelación con múltiples vías de pago__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Subtítulo__: "CANCELACIÓN DE DOCUMENTOS CONTADO CON MAS DE UNA VÍA DE PAGO"
- __Tipo de pantalla__: Listado con selección múltiple \(ejemplo\)
- __Funcionalidad__: Demostración de pago con múltiples medios
- __Componentes UI__: Tabla de documentos con filas resaltadas en amarillo \(documentos seleccionados\)
- __Insight PRD__:
	- __RN__: El sistema permite combinar múltiples vías de pago para cancelar uno o más documentos\.
	- *\[Inferido\]* Los documentos seleccionados se resaltan visualmente en amarillo\.

__Slide 13 — Ejemplo: Selección de Cheque Cliente__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Formulario de pago — Selección de vía Cheque
- __Funcionalidad__: Selección de "Cheque Cliente" como primer medio de pago
- __Callout__: "Seleccionar Cheque Cliente"
- __Insight PRD__:
	- __RN__: "Cheque Cliente" es una de las vías de pago seleccionables\.

__Slide 14 — Modal de Cheque: Ingreso de datos__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Modal / Diálogo de ingreso de cheque
- __Funcionalidad__: Registro de datos del cheque
- __Componentes UI__:
	- Modal "Proceso de Cheque" con botones: Lector Cheques, Ingreso Manual, Cancelar
	- Formulario de datos del cheque: Código bancario, Plaza, Cuenta corriente, Fecha cheque, Monto, Número de Teléfono
	- Flecha indicando flujo de "Lector Cheques" a formulario de datos
	- Botón Aceptar
- __Textos literales__:
	- "CHEQUE"
	- "Con el lector de Cheques se ingresará en forma manual: Fecha del cheque, Monto y Número de Teléfono"
	- "Ingresados los datos Aceptar"
- __Insight PRD__:
	- __RN__: El cheque puede ingresarse mediante lector de cheques o manualmente\.
	- __RN__: Con el lector de cheques, se leen automáticamente: Código bancario, Plaza, Cuenta corriente\. Se ingresan manualmente: Fecha del cheque, Monto, Número de Teléfono\.
	- __RN__: El campo "Número de Teléfono" es obligatorio para el registro de cheques \(contacto del cliente\)\.

__Slide 15 — Modal de Tarjeta de Débito__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Modal / Diálogo de tarjeta de débito
- __Funcionalidad__: Ingreso de datos de pago con tarjeta de débito
- __Componentes UI__: Formulario con campos de tarjeta de débito, botón Aceptar
- __Textos literales__:
	- "TARJETA DE DÉBITO"
	- "Ingresados los datos Aceptar"
- __Callout__: "Ingresados los datos Aceptar"
- __Insight PRD__:
	- __RN__: La tarjeta de débito es una vía de pago independiente con su propio formulario\.
	- *\[Inferido\]* Los datos requeridos incluyen: Monto, Número de tarjeta, Número de operación\.

__Slide 16 — Pago con Efectivo \(ejemplo multi\-pago\)__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Modal de Efectivo \(segundo medio de pago\)
- __Funcionalidad__: Ingreso del monto restante en efectivo
- __Componentes UI__: Dos pantallas \(modal efectivo → modal opción vuelto\)
- __Textos literales__:
	- "EFECTIVO"
	- "Ingresados el monto: Aceptar"
	- "Marcada la opción: Aceptar"
- __Insight PRD__:
	- __RN__: En un pago múltiple, cada vía de pago se ingresa secuencialmente\.
	- __RN__: Si el monto en efectivo genera sobrepago, se presenta la misma opción de Vuelto/Cta\. Corriente\.

__Slide 17 — Resumen de Pago Múltiple: Ejecutar__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Pantalla de resumen final con múltiples medios
- __Funcionalidad__: Resumen previo a ejecución con detalle de cada medio
- __Componentes UI__: Tabla resumen con: Cheque, Tarjeta Débito, Efectivo; botón "Ejecutar Pago"
- __Callouts__:
	- "Resumen del pago ingresado y vuelto a entregar"
	- "Detalle del pago recibido"
	- "Finalmente Ejecutar el pago"
- __Insight PRD__:
	- __RN__: El resumen muestra cada medio de pago utilizado con su monto individual\.
	- __RN__: Se muestra el vuelto a entregar al cliente\.
	- __RN__: El botón "Ejecutar el pago" es la acción final irreversible\.
	- *\[Inferido\]* Se muestra Total a Devolver calculado automáticamente\.

__Slide 18 — Documento SAP generado \(ejemplo multi\-pago\)__

- __Título__: "Recaudación POS de caja: Recaudación del día ejemplo"
- __Tipo de pantalla__: Confirmación
- __Funcionalidad__: Documento contable generado para pago múltiple
- __Componentes UI__: Mensaje SAP de documento creado, comprobante impreso
- __Insight PRD__:
	- __RN__: Independientemente del número de vías de pago, se genera un único documento contable SAP\.
	- *\[Inferido\]* El comprobante impreso detalla todas las vías de pago utilizadas\.

__Slide 19 — Recaudación Cuenta Corriente: Inicio__

- __Título__: "Recaudación POS de caja: Recaudación Cuenta Corriente"
- __Subtítulo__: "RECAUDACION DE CUENTA CORRIENTE"
- __Tipo de pantalla__: Pantalla principal con acción de navegación
- __Funcionalidad__: Acceso al módulo de cuenta corriente
- __Componentes UI__: Botón "Cuenta corriente" en el panel lateral derecho, pantalla desplegada
- __Textos literales__:
	- "Se elige el botón Cuenta Corriente\."
	- "Se despliega la siguiente pantalla"
- __Callout__: "Se elige el botón Cuenta Corriente\."
- __Insight PRD__:
	- __RN__: El módulo de Cuenta Corriente se accede desde la pantalla principal mediante botón dedicado\.
	- *\[Inferido\]* La pantalla de cuenta corriente es diferente a la de recaudación del día\.

__Slide 20 — Cuenta Corriente: Búsqueda y selección__

- __Título__: "Recaudación POS de caja: Recaudación Cuenta Corriente"
- __Tipo de pantalla__: Búsqueda \+ Listado \+ Acción
- __Funcionalidad__: Búsqueda de cliente por RUT y selección de facturas pendientes
- __Componentes UI__: Campo de búsqueda por RUT, tabla de facturas pendientes con selección, botón "Pagos"
- __Callouts__:
	- "Buscar por Rut"
	- "Seleccionar facturas a pagar"
	- "Pagos"
- __Insight PRD__:
	- __RN__: La búsqueda de cliente en Cuenta Corriente se realiza por RUT\.
	- __RN__: El sistema muestra las facturas pendientes del cliente encontrado\.
	- __RN__: Se pueden seleccionar una o más facturas para pagar\.
	- __RN__: El botón "Pagos" inicia el proceso de cobro\.

__Slide 21 — Cuenta Corriente: Selección de medio de pago__

- __Título__: "Recaudación POS de caja: Recaudación Cuenta Corriente"
- __Tipo de pantalla__: Formulario de selección de pago
- __Funcionalidad__: Selección del medio de pago e ingreso de datos
- __Callout__: "Seleccionar Medio de pago e ingresar los datos requeridos"
- __Insight PRD__:
	- __RN__: El proceso de selección de medio de pago es el mismo que en Recaudación del Día\.
	- *\[Inferido\]* Se reutilizan los mismos modales de pago \(Efectivo, Cheque, TD, TC, etc\.\)\.

__Slide 22 — Cuenta Corriente: Ejecución y confirmación__

- __Título__: "Recaudación POS de caja: Recaudación Cuenta Corriente"
- __Tipo de pantalla__: Resumen \+ Ejecución \+ Confirmación
- __Funcionalidad__: Ejecución del pago y visualización de resultados
- __Componentes UI__: Resumen de pago, botón "Ejecutar pago", detalle de pago, total pagado
- __Callouts__:
	- "Ejecutar pago"
	- "Detalle de pago"
	- "Total pagado"
- __Insight PRD__:
	- __RN__: El flujo final de ejecución es idéntico al de Recaudación del Día\.
	- __RN__: Se muestra el total pagado como confirmación\.

__Slide 23 — Anticipo Cliente: Introducción__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Subtítulo__: "ANTICIPO CLIENTE"
- __Tipo de pantalla__: Pantalla informativa / flujo del proceso
- __Funcionalidad__: Descripción del proceso de anticipo
- __Textos literales__:
	- "Para ingresar pagos anticipados \(Abonos\) que clientes realicen directamente en cajas de Cooprinsem y que no estén directamente asociados a una factura emitida\."
	- "Consta de 2 pasos:"
	- "1° Solicitud de Anticipo: Jefe Administrativo"
	- "2° Ingreso de Anticipo: Cajero"
- __Componentes UI__: Capturas de SAP Easy Access \(transacción F\-37\) y botón "Ant\. Cliente" del POS
- __Insight PRD__:
	- __RN__: El anticipo es un pago no asociado directamente a una factura emitida\.
	- __RN__: El proceso requiere 2 pasos con 2 actores diferentes\.
	- __RN__: Paso 1: El Jefe Administrativo crea la solicitud en SAP \(transacción F\-37\)\.
	- __RN__: Paso 2: El Cajero registra el ingreso del anticipo en el POS\.
	- __RN__: Existe segregación de funciones entre quien autoriza y quien recauda\.

__Slide 24 — Anticipo: Solicitud en SAP \(F\-37\)__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Formulario SAP \(transacción F\-37\)
- __Funcionalidad__: Creación de solicitud de anticipo por Jefe Administrativo
- __Componentes UI__: Pantalla SAP con campos: Fecha documento, Fecha contabilización, Cuenta \(cliente SAP\), Glosa
- __Textos literales__:
	- "Jefe administrativo crea Solicitud de anticipo cliente\."
	- "Con transacción F\-37"
	- "Se Ingresa la fecha\."
	- "Se ingresa Glosa"
	- "Código SAP cliente"
- __Insight PRD__:
	- __RN__: La transacción SAP F\-37 se utiliza para crear solicitudes de anticipo\.
	- __RN__: Campos obligatorios: Fecha documento, Fecha contabilización, Cuenta \(Código SAP del cliente\), Glosa\.

__Slide 25 — Anticipo: Datos adicionales en SAP__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Formulario SAP \(continuación\)
- __Funcionalidad__: Ingreso de datos adicionales de la solicitud
- __Textos literales__:
	- "Se ingresa: Valor, Lugar comercial, Centro beneficio, Glosa"
- __Insight PRD__:
	- __RN__: Campos adicionales obligatorios: Valor \(monto del anticipo\), Lugar comercial, Centro de beneficio, Glosa\.
	- *\[Inferido\]* El lugar comercial y centro de beneficio determinan la imputación contable\.

__Slide 26 — Anticipo: Otros datos en SAP__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Formulario SAP \(pestaña Otros Datos\)
- __Funcionalidad__: Ingreso de área de control de créditos
- __Textos literales__:
	- "En Otros Datos"
	- "Se Ingresa Área de control de créditos"
- __Insight PRD__:
	- __RN__: Se debe ingresar el Área de control de créditos en la pestaña "Otros Datos"\.
	- *\[Inferido\]* Este campo es necesario para la gestión de crédito del cliente\.

__Slide 27 — Anticipo: Fin de comprobante SAP__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Confirmación SAP
- __Funcionalidad__: Finalización de la solicitud y generación del número de comprobante
- __Textos literales__:
	- "Fin del Comprobante"
	- "Numero de comprobante a registrar por cajera\."
- __Insight PRD__:
	- __RN__: Al guardar la solicitud en SAP, se genera un número de comprobante\.
	- __RN__: Este número debe ser comunicado al cajero para el registro del pago\.
	- __RN__: El número de comprobante SAP vincula la solicitud del Jefe con el cobro del Cajero\.

__Slide 28 — Anticipo: Registro por Cajero en POS__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Formulario POS \+ Modal Anticipos
- __Funcionalidad__: Registro del anticipo por el cajero
- __Componentes UI__: Pantalla POS principal, modal "Anticipos" con campos: Código SAP cliente, Número comprobante SAP
- __Textos literales__:
	- "La cajera registra los siguientes datos: Código SAP cliente, Numero comprobante SAP"
- __Insight PRD__:
	- __RN__: El cajero accede al módulo de anticipos desde el botón "Ant\. Cliente" en la pantalla principal\.
	- __RN__: El cajero ingresa: Código SAP del cliente y Número de comprobante SAP \(proporcionado por el Jefe\)\.
	- __RN__: El sistema valida que el comprobante exista y esté pendiente de pago\.

__Slide 29 — Anticipo: Procesamiento del pago__

- __Título__: "Recaudación POS de caja: Anticipo"
- __Tipo de pantalla__: Pantalla de procesamiento de pago
- __Funcionalidad__: Ejecución final del pago del anticipo
- __Textos literales__: "\* Procesa pago del anticipo"
- __Componentes UI__: Pantalla POS con medios de pago disponibles \(Tarjeta Débito, Tarjeta Crédito, Cheque al Día, Cuenta Corriente, Saldo a Favor, etc\.\)
- __Insight PRD__:
	- __RN__: El procesamiento del pago de anticipo utiliza las mismas vías de pago que los otros flujos\.
	- *\[Inferido\]* La pantalla de procesamiento muestra los datos del anticipo y permite seleccionar el medio de pago\.

__Sección 5 — Entidades / Modelo de Datos__

__5\.1 Documento Comercial \(Boleta/Factura\)__

Campo

Tipo

Descripción

Tipo documento

Catálogo

Tipo: BOLETA, FACTURA, CONTADO, etc\.

Folio

Numérico

Número de folio del documento

Rut

Alfanumérico

RUT del cliente \(formato chileno XX\.XXX\.XXX\-X\)

Cliente

Texto

Nombre del cliente

Monto

Moneda \(CLP\)

Monto total del documento

Cuota

Numérico

Número de cuota \(si aplica\)

Fecha vencimiento

Fecha

Fecha de vencimiento del documento

Vendedor

Texto

Nombre del vendedor asociado

Sucursal

Catálogo

Sucursal de origen

Estado

Catálogo

Pendiente / Cancelado / Anulado

__5\.2 Pago__

Campo

Tipo

Descripción

ID Pago

Numérico

Identificador interno

Documento SAP

Numérico

Número de documento contable SAP generado

Fecha pago

Fecha

Fecha de la transacción

Total a Pagar

Moneda \(CLP\)

Suma de documentos seleccionados

Total Pagado

Moneda \(CLP\)

Monto total recibido

Total a Devolver

Moneda \(CLP\)

Diferencia \(vuelto\)

Tipo operación sobrepago

Catálogo

Vuelto / Cta\. Corriente

Cajero

Texto

Usuario cajero que procesó

Sucursal

Catálogo

Sucursal donde se realizó

__5\.3 Detalle Medio de Pago__

Campo

Tipo

Descripción

Tipo Pago

Catálogo

EF, TC, TD, CH, TR, DEP, CC, SF

Numero

Alfanumérico

Número de referencia

Fecha

Fecha

Fecha del medio \(ej: fecha cheque\)

Cuota

Numérico

Número de cuotas \(para TC\)

Monto

Moneda \(CLP\)

Monto del medio de pago

Nro\. Tarjeta

Alfanumérico

Número de tarjeta \(TC/TD\)

Numero de Operación

Alfanumérico

Código de operación

N° Teléfono

Alfanumérico

Teléfono de contacto

__5\.4 Cheque__

Campo

Tipo

Descripción

Código bancario

Numérico

Código del banco emisor

Plaza

Numérico

Código de plaza bancaria

Cuenta corriente

Alfanumérico

Número de cuenta corriente

Fecha cheque

Fecha

Fecha del cheque

Monto

Moneda \(CLP\)

Monto del cheque

N° Teléfono

Alfanumérico

Teléfono de contacto del cliente

__5\.5 Cliente__

Campo

Tipo

Descripción

Código SAP

Numérico

Código de cliente en SAP

Rut

Alfanumérico

RUT del cliente

Nombres

Texto

Nombre completo

Dirección

Texto

Dirección del cliente

Población

Texto

Población/localidad

Distrito

Texto

Distrito geográfico

Segmento

Catálogo

Segmento comercial

Condición de pago

Catálogo

Condiciones comerciales

Límite cheque cliente

Moneda \(CLP\)

Límite de cheque permitido

Área control créditos

Catálogo

Área de control crediticio

Cuenta corriente activa

Boolean

Si tiene cuenta corriente

__5\.6 Anticipo__

Campo

Tipo

Descripción

Número comprobante SAP

Numérico

Generado con transacción F\-37

Código SAP cliente

Numérico

Cliente beneficiario

Fecha documento

Fecha

Fecha del documento

Fecha contabilización

Fecha

Fecha de contabilización

Valor

Moneda \(CLP\)

Monto del anticipo

Lugar comercial

Catálogo

Sucursal/lugar comercial

Centro beneficio

Catálogo

Centro de beneficio contable

Glosa

Texto

Descripción/concepto

Área control créditos

Catálogo

Área crediticia

Estado

Catálogo

Pendiente / Pagado

__5\.7 Catálogos / Maestros Referenciados__

Catálogo

Descripción

Vías de Pago

EF \(Efectivo\), TC \(Tarjeta Crédito\), TD \(Tarjeta Débito\), CH \(Cheque Cliente\), TR \(Transferencia Bancaria\), DEP \(Depósito Cliente\), CC \(Cuenta Corriente\), SF \(Saldo a Favor\)

Tipos de Documento

Boleta, Factura, Contado

Sucursales

Osorno, Puerto Varas, y otras sucursales Cooprinsem

Bancos

Catálogo de bancos con código bancario

Plazas Bancarias

Catálogo de plazas

Segmentos de Cliente

Segmentos comerciales Cooprinsem

Centros de Beneficio

Centros contables SAP

Lugares Comerciales

Puntos de venta/sucursales

__Sección 6 — Reglas de Negocio__

ID

Regla

Origen

Tipo

__RN\-01__

El acceso al sistema POS se realiza mediante navegador Internet Explorer con mandante, usuario y clave SAP

Slide 2

Explícita

__RN\-02__

La pantalla principal muestra automáticamente las ventas al contado del día \(boletas y facturas\)

Slide 4

Explícita

__RN\-03__

El sistema se actualiza automáticamente cada 30 segundos

Slide 5

Explícita

__RN\-04__

Existe un botón manual de "Actualizar" para refrescar la lista de documentos

Slide 5

Explícita

__RN\-05__

Se pueden seleccionar múltiples documentos usando la tecla Shift junto con el mouse

Slide 5

Explícita

__RN\-06__

Al seleccionar documentos y presionar "Pago", se cargan automáticamente los datos del cliente

Slide 6

Inferida

__RN\-07__

Las vías de pago disponibles son: Efectivo, Tarjeta de Crédito, Tarjeta de Débito, Cheque Cliente, Transferencia Bancaria, Depósito Cliente, Cuenta Corriente, Saldo a Favor

Slide 6

Explícita

__RN\-08__

El cajero debe seleccionar explícitamente la vía de pago antes de ingresar el monto

Slide 7

Explícita

__RN\-09__

El monto por defecto en la ventana de pago corresponde al total de los documentos seleccionados

Slide 8

Explícita

__RN\-10__

Se permite recibir un monto mayor al total \(sobrepago\)

Slide 8

Explícita

__RN\-11__

Cuando hay sobrepago, se presentan 2 opciones: Vuelto o Abono a Cuenta Corriente

Slide 9

Explícita

__RN\-12__

La opción de abono a Cuenta Corriente solo aplica para clientes con cuenta corriente activa

Slide 9

Explícita

__RN\-13__

Se puede combinar múltiples vías de pago en una misma transacción

Slide 12

Explícita

__RN\-14__

Con el lector de cheques se leen automáticamente: Código bancario, Plaza, Cuenta corriente\. Se ingresan manualmente: Fecha, Monto, N° Teléfono

Slide 14

Explícita

__RN\-15__

El sistema permite ingreso manual de cheque como alternativa al lector

Slide 14

Explícita

__RN\-16__

El N° de Teléfono es dato obligatorio para pagos con cheque

Slide 14

Inferida

__RN\-17__

El botón "Ejecutar Pago" es la acción final que genera el documento contable en SAP

Slide 10, 17

Explícita

__RN\-18__

SAP genera automáticamente un documento contable al ejecutar el pago

Slide 11

Explícita

__RN\-19__

Se emite un comprobante impreso con detalle de documentos y medios de pago

Slide 11

Explícita

__RN\-20__

Para Cuenta Corriente, la búsqueda del cliente se realiza por RUT

Slide 20

Explícita

__RN\-21__

En Cuenta Corriente se muestran las facturas pendientes del cliente para selección

Slide 20

Explícita

__RN\-22__

El proceso de anticipo requiere 2 pasos con segregación de funciones: Jefe Administrativo \(solicitud\) y Cajero \(cobro\)

Slide 23

Explícita

__RN\-23__

La solicitud de anticipo se crea en SAP mediante transacción F\-37

Slide 24

Explícita

__RN\-24__

Campos obligatorios para solicitud de anticipo: Fecha, Glosa, Código SAP cliente, Valor, Lugar comercial, Centro de beneficio, Área de control de créditos

Slides 24\-26

Explícita

__RN\-25__

El número de comprobante SAP generado en la solicitud debe ser comunicado al cajero para el registro del cobro

Slide 27

Explícita

__RN\-26__

El cajero registra el anticipo ingresando: Código SAP cliente y Número de comprobante SAP

Slide 28

Explícita

__RN\-27__

Se genera un único documento contable SAP independientemente del número de vías de pago utilizadas

Slide 18

Inferida

__RN\-28__

Total a Devolver = Total Pagado \- Total a Pagar

Slide 10

Inferida

__RN\-29__

Cada vía de pago se ingresa secuencialmente cuando se combinan múltiples medios

Slides 13\-16

Inferida

__RN\-30__

El cajero está asociado a una sucursal específica y los documentos mostrados corresponden solo a esa sucursal

Slide 4

Inferida

__Sección 7 — Roles y Permisos__

Rol

Permisos

Módulo

__Cajero/a__

Visualizar documentos del día ∙ Seleccionar documentos para cobro ∙ Procesar pagos \(todos los medios\) ∙ Emitir comprobantes ∙ Acceder a Recaudación del Día ∙ Acceder a Cuenta Corriente ∙ Registrar anticipos \(paso 2\) ∙ Anular documentos ∙ Registrar egresos de caja ∙ Registrar depósitos de cheque ∙ Consultar estado de cuenta

POS Web

__Jefe Administrativo__

Crear solicitudes de anticipo \(transacción F\-37\) ∙ Ingresar datos contables \(lugar comercial, centro de beneficio, área de crédito\) ∙ Generar comprobante de anticipo ∙ Comunicar número de comprobante al cajero

SAP GUI / SAP Web

__Sección 8 — Flujos de Usuario__

__Flujo A: Recaudación del Día \(Cajero\)__

INICIO │ ├─ 1\. Abrir Internet Explorer ├─ 2\. Ingresar URL del sistema POS ├─ 3\. Ingresar Mandante, Usuario, Clave ├─ 4\. Login exitoso → Pantalla Principal POS │ └─ Sistema carga lista de documentos del día │ ├─ 5\. Verificar si documento del cliente aparece en lista │ ├─ SI → Continuar a paso 6 │ └─ NO → Presionar "Actualizar" │ └─ Esperar carga \(o sistema auto\-actualiza cada 30s\) │ └─ Verificar nuevamente │ ├─ 6\. Seleccionar documento\(s\) del cliente │ ├─ Un documento: Click en checkbox │ └─ Múltiples: Shift \+ Click en cada checkbox │ ├─ 7\. Presionar botón "Pago" │ └─ Sistema abre pantalla de Pago con: │ \- Datos del cliente \(automático\) │ \- Documentos seleccionados │ \- Lista de vías de pago │ ├─ 8\. Seleccionar vía de pago de la lista │ └─ Sistema abre modal correspondiente al medio │ ├─ 9\. SWITCH \(Vía de Pago seleccionada\): │ │ │ ├─ EFECTIVO: │ │ ├─ Monto por defecto = Total documentos │ │ ├─ Modificar monto si es necesario │ │ ├─ IF monto > total: │ │ │ ├─ Seleccionar: "Vuelto" O "Cta\. Corriente" │ │ │ └─ Presionar Aceptar │ │ └─ ELSE: Presionar Aceptar │ │ │ ├─ CHEQUE CLIENTE: │ │ ├─ Usar lector de cheques \(lectura automática: banco, plaza, cta\) │ │ │ └─ O presionar "Ingreso Manual" para todos los campos │ │ ├─ Ingresar manualmente: Fecha cheque, Monto, N° Teléfono │ │ └─ Presionar Aceptar │ │ │ ├─ TARJETA DE DÉBITO: │ │ ├─ Ingresar datos requeridos \(Monto, N° operación, N° tarjeta\) │ │ └─ Presionar Aceptar │ │ │ ├─ TARJETA DE CRÉDITO: │ │ ├─ Ingresar datos requeridos │ │ └─ Presionar Aceptar │ │ │ └─ OTROS \(Transferencia, Depósito, etc\.\): │ ├─ Ingresar datos requeridos │ └─ Presionar Aceptar │ ├─ 10\. ¿Desea agregar otro medio de pago? │ ├─ SI → Volver a paso 8 │ └─ NO → Continuar │ ├─ 11\. Verificar Resumen del Pago │ ├─ Total a Pagar │ ├─ Total Pagado │ ├─ Total a Devolver │ └─ Detalle de medios seleccionados │ ├─ 12\. Presionar "Ejecutar Pago" │ └─ Sistema genera documento contable SAP │ ├─ 13\. Verificar mensaje de confirmación │ └─ Entregar comprobante impreso al cliente │ └─ FIN

__Flujo B: Recaudación Cuenta Corriente \(Cajero\)__

INICIO │ ├─ 1\. Desde Pantalla Principal POS, presionar botón "Cuenta corriente" │ └─ Sistema despliega pantalla de Cuenta Corriente │ ├─ 2\. Ingresar RUT del cliente en campo de búsqueda │ └─ Sistema busca y muestra facturas pendientes │ ├─ 3\. Seleccionar factura\(s\) a pagar │ ├─ 4\. Presionar botón "Pagos" │ ├─ 5\. Seleccionar Medio de pago e ingresar datos requeridos │ └─ \(Mismos modales que Flujo A, paso 9\) │ ├─ 6\. Verificar resumen │ ├─ 7\. Presionar "Ejecutar pago" │ └─ Sistema genera documento contable SAP │ ├─ 8\. Verificar detalle de pago y total pagado │ └─ FIN

__Flujo C: Anticipo de Cliente \(Jefe Administrativo \+ Cajero\)__

=== PASO 1: Jefe Administrativo \(SAP\) === INICIO │ ├─ 1\. Acceder a SAP → Transacción F\-37 │ ├─ 2\. Ingresar datos principales: │ ├─ Fecha documento │ ├─ Fecha contabilización │ ├─ Código SAP del cliente \(Cuenta\) │ └─ Glosa │ ├─ 3\. Ingresar datos de posición: │ ├─ Valor \(monto del anticipo\) │ ├─ Lugar comercial │ ├─ Centro de beneficio │ └─ Glosa │ ├─ 4\. En pestaña "Otros Datos": │ └─ Ingresar Área de control de créditos │ ├─ 5\. Guardar → Sistema genera Número de comprobante │ ├─ 6\. Comunicar Número de comprobante al Cajero │ └─ FIN PASO 1 === PASO 2: Cajero \(POS\) === INICIO │ ├─ 1\. Desde Pantalla Principal POS, presionar "Ant\. Cliente" │ └─ Sistema abre modal "Anticipos" │ ├─ 2\. Ingresar: │ ├─ Código SAP del cliente │ └─ Número de comprobante SAP \(recibido del Jefe\) │ ├─ 3\. Sistema valida comprobante y muestra datos del anticipo │ ├─ 4\. Procesar pago del anticipo │ └─ Seleccionar medio de pago \(mismos que otros flujos\) │ ├─ 5\. Ejecutar pago │ └─ Sistema genera documento contable SAP │ └─ FIN

__Sección 9 — Integraciones__

\#

Sistema Externo

Tipo Integración

Descripción

1

__SAP FI \(Finanzas\)__

Tiempo real

Generación de documentos contables al ejecutar pagos\. El POS envía la transacción y SAP devuelve el número de documento\.

2

__SAP FI \- Transacción F\-37__

Manual / Proceso

Creación de solicitudes de anticipo por el Jefe Administrativo directamente en SAP\. El número de comprobante se comunica manualmente al cajero\.

3

__SAP SD \(Ventas\)__

Lectura

El POS lee los documentos de venta \(boletas y facturas\) generados por el módulo de ventas para mostrarlos en la pantalla de recaudación del día\.

4

__SAP BP \(Maestro de Clientes\)__

Lectura

Consulta de datos de cliente: RUT, nombre, dirección, segmento, condiciones de pago, límite de cheque, cuenta corriente\.

5

__Lector de Cheques__

Hardware / Periférico

Dispositivo de lectura de cheques que captura automáticamente: código bancario, plaza y cuenta corriente\.

6

__Impresora POS__

Hardware / Periférico

Emisión de comprobantes impresos con detalle de documentos pagados y medios de pago\.

7

__SAP FI \- Cuentas por Cobrar \(FBL5N\)__

Lectura

*\[Inferido\]* Consulta de partidas abiertas de clientes para el módulo de Cuenta Corriente\.

__Sección 10 — Pantallas / Wireframes Requeridos__

ID

Pantalla

Actor

Plataforma

Descripción

__P\-01__

Login SAP NetWeaver

Cajero

Web \(IE\)

Formulario de autenticación: Mandante, Usuario, Clave

__P\-02__

Pantalla Principal POS

Cajero

Web \(IE\)

Dashboard con lista de documentos del día, datos cajero, botones de módulos

__P\-03__

Recaudación del Día \- Listado

Cajero

Web \(IE\)

Tabla de documentos contado con checkboxes, botones Pago y Actualizar

__P\-04__

Pantalla de Pago

Cajero

Web \(IE\)

Datos cliente, docs seleccionados, vías de pago, resumen de montos, tabla medios seleccionados

__P\-05__

Modal Pago Efectivo

Cajero

Web \(IE\)

Campo monto, botones Aceptar/Cancelar

__P\-06__

Modal Sobrepago \(Vuelto/Cta\.Cte\)

Cajero

Web \(IE\)

Opciones radio: Vuelto, Cta\. Corriente; botón Aceptar

__P\-07__

Modal Proceso de Cheque

Cajero

Web \(IE\)

Botones Lector/Manual/Cancelar; campos: banco, plaza, cta, fecha, monto, teléfono

__P\-08__

Modal Tarjeta de Débito

Cajero

Web \(IE\)

Campos de tarjeta de débito; botón Aceptar

__P\-09__

Modal Tarjeta de Crédito

Cajero

Web \(IE\)

Campos de tarjeta de crédito; botón Aceptar

__P\-10__

Resumen de Pago / Confirmación

Cajero

Web \(IE\)

Resumen de medios, totales, botón Ejecutar Pago

__P\-11__

Comprobante de Pago

Cajero

Impresión

Detalle de documentos cancelados y medios de pago

__P\-12__

Cuenta Corriente \- Búsqueda

Cajero

Web \(IE\)

Campo búsqueda por RUT, tabla facturas pendientes

__P\-13__

Cuenta Corriente \- Pago

Cajero

Web \(IE\)

Selección de medio de pago, ejecución, detalle y total

__P\-14__

Anticipo \- Solicitud \(F\-37\)

Jefe Admin

SAP GUI/Web

Formulario transacción F\-37 con campos de anticipo

__P\-15__

Anticipo \- Registro Cajero

Cajero

Web \(IE\)

Modal "Anticipos": Código SAP cliente, Nº comprobante

__P\-16__

Anticipo \- Procesamiento Pago

Cajero

Web \(IE\)

Selección medio de pago y ejecución

__Sección 11 — Campos de Formularios__

__F\-01: Login SAP NetWeaver \(P\-01\)__

Campo

Tipo

Obligatorio

Descripción

Mandante

Numérico \(3 dígitos\)

Sí

Código del mandante SAP

Usuario

Alfanumérico

Sí

Nombre de usuario SAP

Contraseña

Password

Sí

Clave de acceso

__F\-02: Modal Pago Efectivo \(P\-05\)__

Campo

Tipo

Obligatorio

Descripción

Monto

Moneda \(CLP\)

Sí

Monto recibido en efectivo\. Precargado con total de docs

__F\-03: Modal Sobrepago \(P\-06\)__

Campo

Tipo

Obligatorio

Descripción

Tipo Operación

Radio button

Sí

Vuelto / Cta\. Corriente

__F\-04: Modal Proceso de Cheque \(P\-07\)__

Campo

Tipo

Obligatorio

Descripción

Código bancario

Numérico

Sí

Código del banco emisor \(lectura automática o manual\)

Plaza

Numérico

Sí

Código de plaza bancaria \(lectura automática o manual\)

Cuenta corriente

Alfanumérico

Sí

Nº cuenta corriente \(lectura automática o manual\)

Fecha cheque

Fecha

Sí

Fecha del cheque \(ingreso manual\)

Monto

Moneda \(CLP\)

Sí

Monto del cheque \(ingreso manual\)

N° Teléfono

Alfanumérico

Sí

Teléfono de contacto \(ingreso manual\)

__F\-05: Modal Tarjeta de Débito \(P\-08\)__

Campo

Tipo

Obligatorio

Descripción

Monto

Moneda \(CLP\)

Sí

Monto a cobrar

Nro\. Tarjeta

Alfanumérico

Sí\*

Número de tarjeta \(\*inferido\)

Numero de Operación

Alfanumérico

Sí\*

Código de operación \(\*inferido\)

__F\-06: Búsqueda Cuenta Corriente \(P\-12\)__

Campo

Tipo

Obligatorio

Descripción

RUT

Alfanumérico

Sí

RUT del cliente \(formato chileno\)

__F\-07: Solicitud Anticipo \- SAP F\-37 \(P\-14\)__

Campo

Tipo

Obligatorio

Descripción

Fecha documento

Fecha

Sí

Fecha del documento

Fecha contabilización

Fecha

Sí

Fecha de contabilización

Cuenta \(Código SAP cliente\)

Numérico

Sí

Código del deudor en SAP

Glosa \(cabecera\)

Texto

Sí

Descripción general

Valor

Moneda \(CLP\)

Sí

Monto del anticipo

Lugar comercial

Catálogo

Sí

Sucursal/punto de venta

Centro de beneficio

Catálogo

Sí

Centro contable

Glosa \(posición\)

Texto

Sí

Descripción de la posición

Área de control de créditos

Catálogo

Sí

Área crediticia

__F\-08: Registro Anticipo por Cajero \(P\-15\)__

Campo

Tipo

Obligatorio

Descripción

Código SAP cliente

Numérico

Sí

Código del cliente

Número comprobante SAP

Numérico

Sí

Nº de comprobante generado por el Jefe Admin

__Sección 12 — Estructura de Reportes__

__R\-01: Comprobante de Pago \(Impreso\)__

Sección

Contenido

__Encabezado__

Logo Cooprinsem, Nombre sucursal, Fecha y hora, Número de comprobante

__Datos del Cliente__

RUT, Nombre, N° SAP

__Tabla: Detalle Documentos__

Tipo documento, Folio, Monto, Fecha

__Tabla: Medios de Pago__

Tipo pago, Monto, Referencia

__Totales__

Total a Pagar, Total Pagado, Total a Devolver \(Vuelto\)

__Pie__

Nombre cajero, Firma \(espacio\), Fecha/hora impresión

__Sección 13 — Estados del Sistema__

__13\.1 Estado del Documento Comercial__

┌────────────┐ │ EMITIDO │ │ \(SAP SD\) │ └─────┬──────┘ │ ▼ ┌────────────┐ ┌─────── │ PENDIENTE │ ──────┐ │ │ DE COBRO │ │ │ └─────┬──────┘ │ │ │ │ ▼ ▼ ▼ ┌──────────┐ ┌────────────┐ ┌──────────┐ │ ANULADO │ │ CANCELADO │ │ VENCIDO │ │ │ │ \(Pagado\) │ │ │ └──────────┘ └────────────┘ └──────────┘

__13\.2 Estado del Pago__

┌──────────────┐ ┌────────────────┐ ┌─────────────┐ │ EN PROCESO │────►│ EJECUTADO │────►│ DOC\. SAP │ │ \(Selección │ │ \(Botón │ │ GENERADO │ │ de medios\) │ │ Ejecutar\) │ │ \(Confirmado\)│ └──────┬───────┘ └────────────────┘ └─────────────┘ │ ▼ ┌──────────────┐ │ CANCELADO │ │ \(Botón │ │ Cancelar\) │ └──────────────┘

__13\.3 Estado del Anticipo__

┌────────────────┐ ┌────────────────┐ ┌─────────────┐ │ SOLICITUD │────►│ PENDIENTE │────►│ PAGADO │ │ CREADA │ │ DE COBRO │ │ \(Cajero │ │ \(Jefe, F\-37\) │ │ \(Comprobante │ │ ejecuta\) │ └────────────────┘ │ generado\) │ └─────────────┘ └────────────────┘

__Sección 14 — Requisitos No Funcionales__

ID

Categoría

Requisito

__RNF\-01__

Compatibilidad

El sistema debe funcionar en Internet Explorer \(requisito SAP NetWeaver\)

__RNF\-02__

Performance

Auto\-actualización de documentos cada 30 segundos sin degradar el rendimiento

__RNF\-03__

Performance

La generación del documento contable SAP debe completarse en tiempo real \(< 5 segundos\) *\[Inferido\]*

__RNF\-04__

Disponibilidad

El sistema debe estar disponible durante el horario de atención de las sucursales *\[Inferido\]*

__RNF\-05__

Seguridad

Autenticación mediante mandante \+ usuario \+ contraseña SAP

__RNF\-06__

Seguridad

Segregación de funciones: El Jefe Administrativo autoriza anticipos; el Cajero los cobra

__RNF\-07__

Seguridad

Cada cajero solo debe ver documentos de su sucursal asignada *\[Inferido\]*

__RNF\-08__

Integridad

Los documentos contables SAP deben generarse de forma atómica — si falla, no debe quedar en estado parcial *\[Inferido\]*

__RNF\-09__

Periféricos

Soporte para lector de cheques compatible

__RNF\-10__

Periféricos

Soporte para impresora POS para emisión de comprobantes

__RNF\-11__

Usabilidad

El sistema debe calcular automáticamente totales \(a pagar, pagado, devolver\) en tiempo real

__RNF\-12__

Auditoría

Registro del cajero, fecha, hora, y número de documento SAP por cada transacción *\[Inferido\]*

__RNF\-13__

Concurrencia

Múltiples cajeros deben poder operar simultáneamente sin conflictos en la selección de documentos *\[Inferido\]*

__Sección 15 — Supuestos y Dependencias__

ID

Tipo

Descripción

__S\-01__

Supuesto

Cada cajero tiene un usuario SAP único asignado

__S\-02__

Supuesto

Las boletas y facturas se generan previamente en el módulo de ventas \(SAP SD\)

__S\-03__

Supuesto

El Jefe Administrativo tiene acceso a la transacción F\-37 en SAP

__S\-04__

Supuesto

La comunicación del número de comprobante de anticipo entre Jefe y Cajero se realiza fuera del sistema \(verbal, email, etc\.\)

__S\-05__

Supuesto

Los clientes de cuenta corriente están dados de alta en SAP con el flag/configuración correspondiente

__S\-06__

Dependencia

SAP FI debe estar operativo para la generación de documentos contables

__S\-07__

Dependencia

SAP SD debe estar operativo para la carga de documentos de venta en el POS

__S\-08__

Dependencia

Red de datos disponible entre sucursal y servidor SAP

__S\-09__

Dependencia

Internet Explorer instalado y configurado en los terminales de caja

__S\-10__

Dependencia

Lector de cheques físico conectado y configurado en los terminales que lo requieran

__S\-11__

Dependencia

Impresora POS configurada para emisión de comprobantes

__S\-12__

Supuesto

El mandante SAP está correctamente configurado para cada ambiente \(desarrollo/producción\)

__S\-13__

Supuesto

Los catálogos maestros \(bancos, plazas, sucursales, centros de beneficio, lugares comerciales\) están mantenidos en SAP

__Sección 16 — Riesgos Identificados__

ID

Riesgo

Impacto

Mitigación Propuesta

__R\-01__

Dependencia de Internet Explorer \(navegador obsoleto sin soporte de Microsoft\)

__Alto__

Evaluar migración a navegador moderno compatible con SAP NetWeaver \(Chrome, Edge Chromium\) o SAP Fiori

__R\-02__

Comunicación manual del comprobante de anticipo entre Jefe y Cajero puede generar errores de transcripción

__Medio__

Implementar notificación automática dentro del sistema POS cuando se genera un anticipo, o integrar workflow SAP

__R\-03__

La auto\-actualización cada 30 segundos puede causar que un cajero seleccione un documento ya cobrado por otro cajero

__Alto__

Implementar bloqueo optimista: al seleccionar documentos, marcarlos temporalmente como "en proceso" para otros cajeros

__R\-04__

Falla de conectividad SAP durante la ejecución del pago puede dejar transacciones incompletas

__Alto__

Implementar mecanismo de reintentos y estado de transacción local\. Notificar al cajero si el documento SAP no se genera correctamente

__R\-05__

Pérdida de datos del cheque si el lector falla y no se detecta

__Medio__

Validar campos obligatorios del cheque antes de permitir Aceptar\. Mostrar confirmación de datos leídos

__R\-06__

Falta de validación de límite de cheque podría permitir aceptar cheques por montos superiores al permitido

__Medio__

Implementar validación contra campo "Límite cheque cliente" del maestro de clientes

__R\-07__

Datos sensibles de clientes \(RUT, nombres, direcciones\) visibles en pantalla sin protección

__Medio__

Evaluar enmascaramiento parcial de datos sensibles según normativa de protección de datos personales

__R\-08__

No se evidencia un flujo de anulación de pagos ya ejecutados

__Alto__

Documentar y validar el proceso de anulación de documentos contables ya generados\. El botón "Anular Docto" existe pero no está documentado

__R\-09__

El proceso de anticipo no tiene validación de duplicados — un cajero podría intentar cobrar el mismo comprobante dos veces

__Medio__

Implementar validación de estado del comprobante: si ya fue cobrado, rechazar el intento

__Sección 17 — Glosario__

Término

Definición

__POS__

Point of Sale / Punto de Venta — Terminal de caja para cobro presencial

__Mandante__

En SAP, un mandante \(client\) es una unidad organizativa independiente dentro del sistema, con su propia configuración y datos

__Boleta__

Documento tributario chileno emitido a consumidor final \(equivalente a ticket/receipt\)

__Factura__

Documento tributario chileno emitido a empresas/personas jurídicas

__Contado__

Tipo de venta donde el pago se realiza al momento de la transacción

__Cuenta Corriente__

Modalidad de crédito comercial donde el cliente acumula saldo pendiente de pago

__RUT__

Rol Único Tributario — Identificación tributaria chilena \(formato XX\.XXX\.XXX\-X\)

__Vía de Pago / Medio de Pago__

Forma de pago utilizada: EF \(Efectivo\), TC \(Tarjeta Crédito\), TD \(Tarjeta Débito\), CH \(Cheque\), TR \(Transferencia\), DEP \(Depósito\), CC \(Cuenta Corriente\), SF \(Saldo a Favor\)

__Anticipo__

Pago anticipado \(abono\) del cliente no asociado directamente a una factura emitida

__Transacción F\-37__

Transacción SAP FI para registrar solicitudes de anticipo de deudores

__FBL5N__

Transacción SAP para consultar partidas individuales de deudores

__ZFI26__

*\[Referenciado potencialmente\]* Transacción personalizada SAP para reportes financieros

__Documento contable SAP__

Registro contable generado automáticamente al ejecutar un pago, que afecta las cuentas por cobrar y las cuentas de caja

__Sobrepago__

Monto recibido superior al total de los documentos seleccionados

__Vuelto__

Diferencia monetaria a devolver al cliente cuando hay sobrepago en efectivo

__Saldo a Favor__

Monto acumulado a favor del cliente en su cuenta corriente, utilizable para futuros pagos

__Centro de Beneficio__

Unidad organizativa SAP utilizada para fines de control de resultados

__Lugar Comercial__

Punto de venta o sucursal donde se realiza la transacción comercial

__Área de Control de Créditos__

Entidad SAP que agrupa la gestión crediticia de clientes

__Cooprinsem__

Cooperativa Agrícola y de Servicios — empresa propietaria del sistema

__Glosa__

Texto descriptivo que acompaña un registro contable

__Plaza bancaria__

Código que identifica la localidad/región de una sucursal bancaria

__Egreso de Caja__

Salida de dinero de la caja \(no documentada en esta presentación\)

__Depósito Ch\.__

Depósito de cheques recibidos \(no documentado en esta presentación\)

__E° de Cuenta__

Estado de Cuenta — Consulta del historial de transacciones de un cliente

__*Nota final*__*: Este PRD fue generado a partir de las 29 diapositivas de la presentación "CAJA POS\.pptx"\. Los módulos *__*Anular Documento*__*, *__*Egreso de Caja*__*, *__*Depósito Cheque*__* y *__*Estado de Cuenta*__* \(botones visibles en la pantalla principal, Slide 4\) no están documentados en esta presentación y requerirán documentación adicional para completar el alcance del sistema POS*

