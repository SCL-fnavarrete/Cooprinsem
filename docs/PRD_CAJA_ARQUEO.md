__PRD — Módulo: Recaudación POS de Caja – Arqueo de Caja__

__1\. Información General del Módulo__

Campo

Detalle

__Nombre del módulo__

Recaudación POS de Caja: Arqueo de Caja

__Sistema origen__

SAP \(transacciones ZFI26, FBL5N\) \+ Aplicación Web POS

__Empresa__

Cooprinsem Ltda\.

__Usuarios principales__

Cajeros de sucursal, Jefe Administrativo de sucursal

__Documento fuente__

Presentación "CAJA POS ARQUEO\.pptx" \(19 diapositivas\)

__Idioma__

Español \(es\-MX\)

__2\. Objetivo del Módulo__

Permitir a los cajeros de cada sucursal realizar el __arqueo de caja diario__ \(declaración de los montos recaudados por cada medio de pago\) y al jefe administrativo ejecutar el __cierre de caja__ que compara lo declarado en el arqueo contra lo recaudado por el sistema, identificando diferencias y generando el documento contable correspondiente en SAP\.

__3\. Resumen Ejecutivo del Flujo \(End\-to\-End\)__

\[1\. Cierre Caja Día Anterior\] → \[2\. Apertura Caja del Día\] → \[3\. Arqueo de Caja \(Cajero\)\] → \[4\. Cierre de Caja \(Jefe Adm\.\)\] │ │ ▼ ▼ \[Grabado del Arqueo\] \[Impresión / Documento SAP\]

__4\. Análisis Detallado por Pantalla \(Slide\-by\-Slide\)__

__4\.1\. Pantalla de Portada / Inicio \(Slide 1\)__

- __Tipo__: Pantalla de título / portada del módulo\.
- __Contexto visual__: Imagen corporativa de Cooprinsem con logo y eslogan "Liderazgo y Confiabilidad"\.
- __Título del módulo__: "RECAUDACIÓN POS DE CAJA: ARQUEO DE CAJA"\.
- __Insight PRD__: Esta es la pantalla de entrada al módulo\. Debe mostrar el nombre del módulo, la identidad corporativa y opcionalmente un acceso directo o menú de navegación\.

__4\.2\. Pre\-condición: Cierre de Caja del Día Anterior \(Slide 2\)__

- __Tipo__: Validación / Pre\-condición obligatoria\.
- __Regla de negocio crítica__: __"Antes de abrir la caja del día se debe cerrar la caja del día anterior\."__
- __Pantalla__: Aplicación web POS muestra un cuadro de diálogo/error tipo modal indicando que la caja anterior no ha sido cerrada\.
- __Componentes UI__:
	- Formulario de "Arqueo de Caja" visible en segundo plano\.
	- Sección "Arqueo Ingresado" \(tabla\) debajo del formulario\.
	- Cuadro de diálogo de error bloqueante superpuesto\.
- __Insight PRD__:
	- __Validación obligatoria__: El sistema debe verificar que la caja del día anterior esté cerrada antes de permitir la apertura de una nueva caja\.
	- __Tipo de bloqueo__: Modal bloqueante — el usuario no puede continuar hasta resolver\.
	- __Acción requerida__: El jefe administrativo debe cerrar la caja pendiente antes de que el cajero pueda operar\.

__4\.3\. Selección de Concepto para Arqueo — Match Code \(Slide 3\)__

- __Tipo__: Pantalla de ingreso de datos al arqueo\.
- __Funcionalidad principal__: Selección del tipo de pago a ingresar al arqueo mediante __Match Code__ \(búsqueda asistida\)\.
- __Componentes UI__:
	- Campo de selección con Match Code que despliega lista de conceptos/tipos de pago\.
	- Tabla de tipos de pago con columnas: __Código__, __Denominación Tipo Pago__\.
	- Resaltado visual \(highlight azul\) de la opción seleccionada\.
- __Tipos de pago identificados en el listado__:
	- EF — EFECTIVO
	- SF — SALDO A FAVOR
	- TC — TARJETA DE CRÉDITO
	- TD — TARJETA DE DÉBITO
	- \(Posiblemente también: CHEQUE AL DÍA, según slides posteriores\)
- __Insight PRD__:
	- El sistema debe proveer un __selector tipo combo/autocomplete \(Match Code\)__ con todos los tipos de pago configurados\.
	- La lista debe ser configurable/mantenible desde un maestro de tipos de pago\.
	- Se selecciona __un concepto a la vez__ para ingresar su monto al arqueo\.
	- Ejemplo mostrado: selección de "EFECTIVO"\.

__4\.4\. Ingreso de Monto por Tipo de Pago \(Slide 4\)__

- __Tipo__: Pantalla de ingreso de monto\.
- __Funcionalidad__: El cajero ingresa el __monto total del efectivo recaudado__ \(o del tipo de pago seleccionado\)\.
- __Componentes UI__:
	- Campo de texto para ingresar el monto\.
	- Botón "Agregar al arqueo"\.
- __Insight PRD__:
	- Campo numérico con validación de formato monetario\.
	- Botón de acción para agregar la línea al arqueo\.
	- Debe soportar montos decimales según la moneda del país \(CLP típicamente sin decimales\)\.

__4\.5\. Confirmación de Agregado — Efectivo \(Slide 5\)__

- __Tipo__: Pantalla de confirmación / estado post\-ingreso\.
- __Funcionalidad__: Muestra la confirmación de que el monto en efectivo ha sido __agregado al arqueo__\.
- __Componentes UI__:
	- Tabla "Arqueo Ingresado" con la línea de EFECTIVO ya registrada\.
	- Callout: "Queda agregado al arqueo el monto en efectivo"\.
- __Insight PRD__:
	- Feedback visual inmediato al usuario tras agregar un tipo de pago\.
	- La tabla de "Arqueo Ingresado" se actualiza en tiempo real\.
	- Se muestra: tipo de pago, denominación, monto ingresado\.

__4\.6\. Agregado de Tarjeta de Crédito \+ Repetición del Proceso \(Slide 6\)__

- __Tipo__: Repetición del flujo para otro medio de pago\.
- __Funcionalidad__: Se repite el mismo proceso para __Tarjeta de Crédito__\.
- __Nota adicional textual__: *"Los conceptos restantes del arqueo se van agregando con el proceso ya explicado\."*
- __Insight PRD__:
	- El flujo de agregar concepto es __iterativo__: se repite N veces, una por cada medio de pago que el cajero necesite declarar\.
	- No hay un orden obligatorio de ingreso\.
	- El mismo formulario se reutiliza para cada tipo de pago\.

__4\.7\. Agregado de Tarjeta de Débito \(Slide 7\)__

- __Tipo__: Continuación del flujo iterativo\.
- __Funcionalidad__: Confirmación del agregado del monto de __Tarjeta de Débito__ al arqueo\.
- __Callout__: "Queda agregado al arqueo el monto en tarjeta de débito\."
- __Insight PRD__: Mismo patrón UI/UX que efectivo y tarjeta de crédito\.

__4\.8\. Agregado de Cheques al Día \(Slide 8\)__

- __Tipo__: Continuación del flujo iterativo\.
- __Funcionalidad__: Confirmación del agregado del monto de __Cheques al Día__ al arqueo\.
- __Callout__: "Queda agregado al arqueo el monto en cheques al día\."
- __Insight PRD__:
	- Confirma que "Cheque al Día" es un tipo de pago válido en el sistema\.
	- Mismo patrón de ingreso que los anteriores\.

__4\.9\. Grabar Arqueo \+ Eliminar Tipo de Pago \(Slide 9\)__

- __Tipo__: Pantalla de acciones sobre el arqueo \(Grabar / Eliminar\)\.
- __Funcionalidades clave__:
	1. __Grabar el arqueo__: Permite guardar el estado actual del arqueo\.
		- *"El arqueo se puede ir grabando a medida que se agregan o eliminan tipos de pago\."*
	2. __Eliminar Tipo de Pago__: Permite remover un tipo de pago previamente ingresado\.
		- *"Se puede eliminar en cualquier momento del arqueo \(antes o después de Grabar\)\."*
- __Insight PRD__:
	1. __Grabado parcial__: El arqueo no requiere estar completo para ser grabado\. Se puede guardar progreso\.
	2. __Eliminación flexible__: Cualquier línea del arqueo puede ser eliminada en cualquier momento \(antes y después del grabado\)\.
	3. __No hay concepto de "envío definitivo" en esta etapa__ — el arqueo es un borrador editable hasta que el jefe administrativo ejecute el cierre\.
	4. Botón "Grabar" debe estar siempre visible\.
	5. Botón/acción "Eliminar" por cada línea de la tabla de arqueo ingresado\.

__4\.10\. Confirmación de Grabado \+ Monto Total \(Slide 10\)__

- __Tipo__: Pantalla de confirmación post\-grabado\.
- __Componentes UI__:
	- Mensaje de confirmación: "Mensaje que el arqueo está Grabado"\.
	- Visualización del __Monto total del Arqueo__ \(suma de todos los conceptos ingresados\)\.
- __Insight PRD__:
	- Tras grabar, mostrar un __toast/snackbar o mensaje__ de confirmación\.
	- Mostrar el __total acumulado__ del arqueo de forma prominente\.
	- El total es la sumatoria de todos los tipos de pago ingresados\.

__4\.11\. Visualización de Deuda del Cajero en SAP \(Slide 11\)__

- __Tipo__: Pantalla de consulta SAP \(transacción FBL5N\)\.
- __Funcionalidad__: Visualización de la __deuda del cajero__ en la transacción SAP FBL5N — "Lista part\.indiv\.deudores"\.
- __Componentes UI__:
	- Tabla SAP con columnas: Cajero, Nombre, Sociedad, Centro, Fecha, Montos, Estado\.
	- Filas resaltadas en amarillo para subtotales\.
	- Indicadores de estado rojo/verde\.
- __Insight PRD__:
	- __Integración con SAP FBL5N__: El sistema debe permitir consultar o visualizar la posición deudora del cajero\.
	- Datos mostrados: sociedad, centro \(sucursal\), montos recaudados vs\. deuda\.
	- Esta consulta es informativa / de auditoría\.
	- Posible requerimiento: enlace directo desde la app POS hacia esta transacción SAP, o réplica de la información en la interfaz web\.

__4\.12\. Cierre de Caja — Proceso del Jefe Administrativo \(Slide 12\)__

- __Tipo__: Pantalla de inicio del cierre de caja\.
- __Actor__: __Jefe Administrativo__ \(no el cajero\)\.
- __Funcionalidad__: *"Cierre de caja: Se realiza en SAP por el jefe administrativo\."*
- __Contexto__: Esta es una operación en SAP, no en la app web POS\.
- __Insight PRD__:
	- El cierre de caja es una __función exclusiva del jefe administrativo__\.
	- Se ejecuta desde SAP \(transacción ZFI26 u otra dedicada\)\.
	- __Segregación de funciones__: El cajero hace el arqueo; el jefe administrativo hace el cierre\.

__4\.13\. Cierre de Caja — Datos Requeridos \(Slide 13\)__

- __Tipo__: Formulario de parámetros de entrada para el cierre\.
- __Funcionalidad__: *"Cierre de caja: Se ingresan los datos requeridos\."*
- __Campos identificados__:
	1. __Fecha de la caja__ — Fecha del día que se está cerrando\.
	2. __Sucursal__ — Centro/sucursal a cerrar\.
	3. __Código del cajero__ — Identificador del cajero cuyo arqueo se va a cerrar\.
- __Insight PRD__:
	1. Formulario de selección con 3 parámetros obligatorios:
		- fecha\_caja \(date picker\)
		- sucursal \(selector de centros/sucursales\)
		- codigo\_cajero \(selector de cajeros, posiblemente filtrado por sucursal\)
	2. Estos parámetros determinan qué arqueo se va a comparar con la recaudación del sistema\.

__4\.14\. Cierre de Caja — Borrador con Comparación \(Slide 14\)__

- __Tipo__: Pantalla de resultado del cierre \(borrador\)\.
- __Funcionalidad__: *"El cierre de caja toma los datos ingresados por el cajero en el arqueo y lo compara con lo recaudado\."*
- __Estado__: __Borrador del cierre de caja__\.
- __Componentes UI__:
	- Tabla de comparación SAP con columnas:
		- __Denominación__ \(tipo de pago\)
		- __Arqueo Caja__ \(monto declarado por el cajero\)
		- __Recaudado Sistema__ \(monto registrado por el POS/sistema\)
		- __Diferencia__ \(discrepancia entre ambos\)
		- __Moneda__ \(CLP u otra\)
	- Tipos de pago en la tabla: EFECTIVO, TARJETA DE DÉBITO, TARJETA DE CRÉDITO, CHEQUE AL DÍA\.
	- Fila de __TOTAL GENERAL CIERRE__ con la sumatoria\.
- __Insight PRD__:
	- __Lógica de comparación__: Diferencia = Arqueo Caja \- Recaudado Sistema
	- Diferencia positiva = el cajero declaró más de lo que el sistema registró \(sobrante\)\.
	- Diferencia negativa = el cajero declaró menos de lo que el sistema registró \(faltante\)\.
	- El estado __borrador__ permite revisar antes de confirmar\.
	- La tabla debe mostrar todos los medios de pago con sus tres columnas de montos\.

__4\.15\. Cierre de Caja — Impresión \(Slide 15\)__

- __Tipo__: Pantalla de impresión / generación de documento\.
- __Funcionalidad__: Diálogo de impresión SAP superpuesto sobre la tabla de cierre\.
- __Componentes UI__:
	- Cuadro de diálogo "Imprimir" de SAP con opciones de dispositivo de salida y permanencia en spool\.
	- Tabla de cierre visible en segundo plano\.
- __Insight PRD__:
	- El cierre de caja genera un __documento imprimible__\.
	- Integración con el spool de impresión de SAP\.
	- El documento debe contener: fecha, sucursal, cajero, tabla comparativa, diferencias, totales\.

__4\.16\. Borrador del Cierre de Caja — Vista Detallada \(Slide 16\)__

- __Tipo__: Vista de detalle del borrador\.
- __Funcionalidad__: *"Borrador del Cierre de Caja\."*
- __Insight PRD__:
	- El jefe administrativo puede revisar el borrador antes de hacerlo definitivo\.
	- Posibilidad de ajustes o correcciones antes del cierre definitivo\.

__4\.17\. Cierre de Caja Definitivo \(Slide 17\)__

- __Tipo__: Confirmación de cierre definitivo\.
- __Funcionalidad__: *"Cierre de caja definitivo\."*
- __Componentes UI__:
	- Tabla de cierre con estado definitivo\.
	- Indicadores visuales de cierre \(posiblemente iconos o colores de estado\)\.
- __Insight PRD__:
	- __Acción irreversible__: Una vez confirmado el cierre definitivo, no se puede modificar\.
	- Genera el asiento contable en SAP\.
	- Cambia el estado de la caja a "Cerrada"\.
	- Habilita la apertura de la caja del día siguiente\.

__4\.18\. Documento/Reporte Post\-Cierre \(Slide 18\)__

- __Tipo__: Reporte/documento generado\.
- __Insight PRD__: Posible pantalla de confirmación final o visualización del comprobante generado\.

__4\.19\. Reporte Consolidado de Cierre de Caja \(Slide 19\)__

- __Tipo__: Reporte impreso / documento final\.
- __Componentes UI__:
	- Documento "CIERRE DE CAJA" con encabezado corporativo de COOPRINSEM LTDA\.
	- Datos del reporte: Sucursal \(D190 Osorno\), Cajero \(MOYARZUN \- 40000001\)\.
	- Tabla con: Denominación, Arqueo Caja, Recaudado Sistema, Diferencia, Moneda\.
	- Fila de TOTAL GENERAL CIERRE\.
- __Insight PRD__:
	- __Reporte final imprimible__ que sirve como comprobante físico del cierre\.
	- Debe incluir: logo empresa, datos de sucursal, datos del cajero, fecha, tabla comparativa completa, total general\.
	- Este es el documento de auditoría principal\.

__5\. Entidades / Modelo de Datos__

__5\.1\. Entidad: ArqueoCaja__

Campo

Tipo

Descripción

id

UUID / INT

Identificador único del arqueo

fecha\_caja

DATE

Fecha del día de caja

sucursal\_id

VARCHAR

Código de sucursal / centro SAP

cajero\_id

VARCHAR

Código del cajero

estado

ENUM

ABIERTO, GRABADO, CERRADO

monto\_total

DECIMAL

Suma total de todos los tipos de pago

fecha\_creacion

TIMESTAMP

Fecha/hora de creación

fecha\_grabado

TIMESTAMP

Fecha/hora del último grabado

__5\.2\. Entidad: ArqueoDetalle \(Líneas del Arqueo\)__

Campo

Tipo

Descripción

id

UUID / INT

Identificador único de la línea

arqueo\_id

FK → ArqueoCaja

Referencia al arqueo padre

tipo\_pago\_codigo

VARCHAR

Código del tipo de pago \(EF, TC, TD, SF, CH\)

tipo\_pago\_denominacion

VARCHAR

Nombre del tipo de pago

monto

DECIMAL

Monto declarado por el cajero

moneda

VARCHAR

Código de moneda \(CLP\)

__5\.3\. Entidad: CierreCaja__

Campo

Tipo

Descripción

id

UUID / INT

Identificador único del cierre

arqueo\_id

FK → ArqueoCaja

Arqueo asociado

fecha\_caja

DATE

Fecha de la caja

sucursal\_id

VARCHAR

Sucursal

cajero\_id

VARCHAR

Cajero

jefe\_admin\_id

VARCHAR

Jefe administrativo que ejecuta el cierre

estado

ENUM

BORRADOR, DEFINITIVO

fecha\_cierre

TIMESTAMP

Fecha/hora del cierre definitivo

__5\.4\. Entidad: CierreDetalle \(Comparación\)__

Campo

Tipo

Descripción

id

UUID / INT

Identificador único

cierre\_id

FK → CierreCaja

Referencia al cierre padre

tipo\_pago\_codigo

VARCHAR

Código del tipo de pago

denominacion

VARCHAR

Nombre del tipo de pago

monto\_arqueo

DECIMAL

Monto declarado en el arqueo \(cajero\)

monto\_recaudado

DECIMAL

Monto registrado por el sistema POS

diferencia

DECIMAL

monto\_arqueo \- monto\_recaudado

moneda

VARCHAR

Código de moneda

__5\.5\. Catálogo: TipoPago__

Código

Denominación

EF

EFECTIVO

TC

TARJETA DE CRÉDITO

TD

TARJETA DE DÉBITO

CH

CHEQUE AL DÍA

SF

SALDO A FAVOR

__6\. Reglas de Negocio__

\#

Regla

Descripción

RN\-01

__Cierre previo obligatorio__

No se puede abrir la caja del día si la caja del día anterior no ha sido cerrada \(cierre definitivo\)\.

RN\-02

__Grabado parcial permitido__

El arqueo se puede grabar en cualquier momento, incluso con datos parciales\.

RN\-03

__Eliminación flexible__

Se puede eliminar un tipo de pago del arqueo antes o después de grabar\.

RN\-04

__Un arqueo por cajero/día/sucursal__

Cada cajero tiene un único arqueo por día por sucursal\.

RN\-05

__Cierre por jefe administrativo__

Solo el jefe administrativo puede ejecutar el cierre de caja \(segregación de funciones\)\.

RN\-06

__Cierre en SAP__

El cierre se ejecuta en SAP \(transacción dedicada\) y genera asientos contables\.

RN\-07

__Borrador antes de definitivo__

El cierre tiene dos estados: borrador \(revisable\) y definitivo \(irreversible\)\.

RN\-08

__Comparación automática__

El cierre compara automáticamente el monto del arqueo \(declarado\) vs\. el recaudado por el sistema\.

RN\-09

__Cálculo de diferencia__

Diferencia = Monto Arqueo Caja \- Monto Recaudado Sistema para cada tipo de pago\.

RN\-10

__Cierre definitivo irreversible__

Una vez confirmado el cierre definitivo, no se puede modificar\.

RN\-11

__Generación de reporte__

El cierre definitivo genera un reporte imprimible con la comparación detallada\.

RN\-12

__Deuda de cajero__

Si la diferencia es negativa \(faltante\), se registra como deuda del cajero en SAP \(visible en FBL5N\)\.

__7\. Roles y Permisos__

Rol

Permisos

__Cajero__

Abrir arqueo, agregar tipos de pago con montos, eliminar tipos de pago, grabar arqueo\.

__Jefe Administrativo__

Todo lo del cajero \+ ejecutar cierre de caja \(borrador y definitivo\), imprimir reporte, consultar deuda de cajeros en SAP\.

__8\. Flujos de Usuario__

__8\.1\. Flujo: Arqueo de Caja \(Cajero\)__

1\. Cajero accede al módulo "Recaudación POS de Caja" 2\. Sistema valida que la caja del día anterior esté cerrada ├─ Si NO está cerrada → Mostrar error bloqueante \(RN\-01\) └─ Si SÍ está cerrada → Continuar 3\. Se muestra formulario de Arqueo de Caja 4\. Cajero selecciona tipo de pago vía Match Code \(ej: EFECTIVO\) 5\. Cajero ingresa el monto total recaudado para ese tipo de pago 6\. Cajero presiona "Agregar al arqueo" 7\. Sistema agrega la línea a la tabla "Arqueo Ingresado" 8\. Se muestra confirmación visual 9\. REPETIR pasos 4\-8 para cada tipo de pago adicional 10\. \(Opcional\) Cajero puede eliminar un tipo de pago ingresado 11\. Cajero presiona "Grabar" 12\. Sistema graba el arqueo y muestra: \- Mensaje de confirmación "Arqueo Grabado" \- Monto total del arqueo 13\. Cajero puede seguir editando \(agregar/eliminar\) y volver a grabar

__8\.2\. Flujo: Cierre de Caja \(Jefe Administrativo\)__

1\. Jefe Administrativo accede a SAP \(transacción de cierre\) 2\. Ingresa parámetros: \- Fecha de la caja \- Sucursal \- Código del cajero 3\. Sistema genera BORRADOR del cierre: \- Recupera datos del arqueo \(declarado por cajero\) \- Recupera datos de recaudación del sistema POS \- Calcula diferencias por tipo de pago \- Muestra tabla comparativa 4\. Jefe Administrativo revisa el borrador 5\. \(Opcional\) Imprime el borrador 6\. Jefe Administrativo confirma → CIERRE DEFINITIVO 7\. Sistema: \- Cambia estado a "Definitivo" \- Genera asiento contable en SAP \- Si hay diferencias negativas → registra deuda del cajero \- Genera reporte final imprimible 8\. Caja queda cerrada → habilita apertura del día siguiente

__9\. Integraciones__

Sistema

Tipo

Descripción

__SAP FI \(FBL5N\)__

Consulta

Visualización de deuda de cajeros \(partidas individuales de deudores\)

__SAP \(ZFI26 / Custom\)__

Transacción

Ejecución del cierre de caja, generación de asientos contables

__SAP Spool__

Impresión

Generación de reportes impresos del cierre de caja

__App Web POS__

CRUD

Interfaz web donde el cajero realiza el arqueo de caja

__Sistema de Recaudación POS__

Lectura

Fuente de los montos "Recaudado Sistema" para la comparación en el cierre

__10\. Pantallas / Wireframes Requeridos__

\#

Pantalla

Actor

Plataforma

P\-01

Formulario de Arqueo de Caja

Cajero

App Web POS

P\-02

Selector Match Code de Tipos de Pago

Cajero

App Web POS

P\-03

Tabla "Arqueo Ingresado" \(editable\)

Cajero

App Web POS

P\-04

Modal de error: caja anterior sin cerrar

Cajero

App Web POS

P\-05

Confirmación de grabado \+ total

Cajero

App Web POS

P\-06

Formulario de parámetros de cierre

Jefe Admin\.

SAP

P\-07

Tabla comparativa borrador de cierre

Jefe Admin\.

SAP

P\-08

Tabla comparativa cierre definitivo

Jefe Admin\.

SAP

P\-09

Reporte imprimible de cierre de caja

Jefe Admin\.

SAP / PDF

P\-10

Consulta deuda cajero \(FBL5N\)

Jefe Admin\.

SAP

__11\. Campos del Formulario de Arqueo \(App Web POS\)__

Campo

Tipo

Obligatorio

Descripción

Sociedad

Texto \(auto\)

Sí

Código de sociedad SAP \(pre\-cargado\)

Centro

Texto \(auto\)

Sí

Sucursal \(pre\-cargado según login\)

Correlativo Ordenamiento

Numérico \(auto\)

Sí

Número secuencial del arqueo

Código TransBank

Texto

No

Código de terminal TransBank asociado

Tipo de Pago

Match Code/Combo

Sí

Selector del concepto \(EF, TC, TD, etc\.\)

Monto

Numérico/Decimal

Sí

Monto total recaudado para el tipo de pago

__12\. Campos del Formulario de Cierre \(SAP\)__

Campo

Tipo

Obligatorio

Descripción

Fecha de la caja

Date

Sí

Fecha del día a cerrar

Sucursal

Selector

Sí

Centro/sucursal

Código del cajero

Selector

Sí

Identificador del cajero

__13\. Reporte: Cierre de Caja__

__Encabezado:__

- Logo y nombre de la empresa \(COOPRINSEM LTDA\.\)
- Título: "CIERRE DE CAJA"
- Sucursal \(ej: D190 Osorno\)
- Cajero \(ej: MOYARZUN \- 40000001\)
- Fecha de la caja

__Cuerpo \(Tabla\):__

Denominación

Arqueo Caja

Recaudado Sistema

Diferencia

Moneda

EFECTIVO

X\.XXX

X\.XXX

X\.XXX

CLP

TARJETA DE DÉBITO

X\.XXX

X\.XXX

X\.XXX

CLP

TARJETA DE CRÉDITO

X\.XXX

X\.XXX

X\.XXX

CLP

CHEQUE AL DÍA

X\.XXX

X\.XXX

X\.XXX

CLP

__TOTAL GENERAL CIERRE__

__X\.XXX__

__X\.XXX__

__X\.XXX__

__CLP__

__14\. Estados del Sistema__

__14\.1\. Estados de la Caja__

\[CERRADA \(día anterior\)\] → \[ABIERTA\] → \[ARQUEO EN CURSO\] → \[ARQUEO GRABADO\] → \[CIERRE BORRADOR\] → \[CIERRE DEFINITIVO / CERRADA\]

__14\.2\. Estados del Arqueo__

Estado

Descripción

EN\_CURSO

El cajero está ingresando tipos de pago

GRABADO

El cajero presionó Grabar \(puede seguir editando\)

__14\.3\. Estados del Cierre__

Estado

Descripción

BORRADOR

El jefe administrativo generó la comparación pero no confirmó

DEFINITIVO

Cierre confirmado, asiento contable generado, irreversible

__15\. Requisitos No Funcionales__

\#

Requisito

RNF\-01

La aplicación web POS debe ser accesible desde navegadores modernos \(Chrome, Edge, Firefox\)\.

RNF\-02

El Match Code de tipos de pago debe responder en < 1 segundo\.

RNF\-03

El grabado del arqueo debe ser transaccional \(todo o nada\)\.

RNF\-04

El cierre definitivo debe generar el asiento contable en SAP en tiempo real\.

RNF\-05

El reporte de cierre debe ser generado en formato imprimible \(PDF o SAP Spool\)\.

RNF\-06

Debe existir trazabilidad/auditoría de todas las operaciones \(quién, cuándo, qué\)\.

RNF\-07

La sesión del cajero debe estar vinculada a una única sucursal\.

__16\. Supuestos y Dependencias__

\#

Supuesto / Dependencia

S\-01

Existe un maestro de tipos de pago configurado y mantenido en SAP\.

S\-02

Cada cajero tiene un código único en SAP vinculado a una o más sucursales\.

S\-03

El sistema POS registra las transacciones de venta en tiempo real y proporciona los montos "Recaudado Sistema"\.

S\-04

La transacción ZFI26 \(o equivalente\) está disponible en SAP para el cierre de caja\.

S\-05

La transacción FBL5N está disponible para consulta de deuda de cajeros\.

S\-06

Existe conectividad entre la app web POS y SAP para el intercambio de datos del arqueo\.

S\-07

La moneda principal de operación es CLP \(Peso Chileno\)\.

__17\. Riesgos Identificados__

\#

Riesgo

Impacto

Mitigación

R\-01

Cajero no cierra la caja del día → bloquea operación del día siguiente

Alto

Alerta automática al jefe administrativo si hay cajas sin cerrar al fin del día

R\-02

Diferencias recurrentes en el arqueo vs\. recaudado

Medio

Dashboard de seguimiento de diferencias por cajero/sucursal

R\-03

Pérdida de datos del arqueo antes de grabar

Medio

Auto\-guardado periódico o confirmación antes de salir sin grabar

R\-04

Error en la integración SAP durante el cierre definitivo

Alto

Mecanismo de reintentos y log de errores

__18\. Glosario__

Término

Definición

__Arqueo de Caja__

Proceso mediante el cual el cajero declara los montos recaudados por cada medio de pago al final del turno/día\.

__Cierre de Caja__

Proceso ejecutado por el jefe administrativo que compara lo declarado en el arqueo con lo registrado por el sistema y genera el documento contable\.

__Match Code__

Función de búsqueda asistida \(autocompletado\) típica de SAP que permite buscar y seleccionar valores de una lista\.

__FBL5N__

Transacción SAP estándar para visualizar partidas individuales de deudores \(cuentas por cobrar\)\.

__ZFI26__

Transacción SAP customizada \(Z\) del módulo FI utilizada para el proceso de cierre de caja\.

__POS__

Point of Sale \(Punto de Venta\)\.

__TransBank__

Procesador de pagos con tarjeta en Chile\. Código TransBank identifica el terminal de pago\.

__Spool__

Cola de impresión de SAP donde se almacenan los reportes generados\.

*Documento generado a partir del análisis de la presentación "CAJA POS ARQUEO\.pptx" — 19 diapositivas\.*

