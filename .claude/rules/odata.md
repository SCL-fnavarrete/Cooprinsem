# Reglas SAP OData — Cooprinsem POS

## Patrón CSRF Token (OBLIGATORIO para POST/PATCH/DELETE)

```typescript
// 1. Obtener CSRF token antes de cualquier mutación
const fetchCsrfToken = async (baseUrl: string): Promise<string> => {
  const res = await fetch(`${baseUrl}/`, {
    headers: {
      'x-csrf-token': 'fetch',
      'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
    },
  });
  return res.headers.get('x-csrf-token') ?? '';
};

// 2. Incluirlo en la mutación
const headers = {
  'x-csrf-token': csrfToken,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
```

## Manejo de Errores OData SAP

SAP retorna errores en el body, NO siempre en el status HTTP:

```typescript
interface ISapODataError {
  error: {
    code: string;           // Ej: "/IWBEP/CM_MGW_RT/023"
    message: {
      lang: string;
      value: string;        // Mensaje legible para el usuario
    };
    innererror?: {
      errordetails: Array<{
        code: string;
        message: string;
        severity: 'error' | 'warning' | 'info';
      }>;
    };
  };
}

// Siempre verificar el body aunque el HTTP status sea 200
const parseSapError = (body: unknown): string => {
  const err = body as ISapODataError;
  return err?.error?.message?.value ?? 'Error desconocido en SAP';
};
```

## Mapeo de Nombres de Campo

Los campos OData de SAP vienen en MAYÚSCULAS (notación ABAP). Mapear en `src/types/`:

| Campo SAP (OData) | Nombre en TypeScript | Descripción |
|-------------------|---------------------|-------------|
| MATNR | codigoMaterial | Código del material |
| MAKTX | descripcion | Descripción del material |
| KUNNR | codigoCliente | Código del cliente (deudor) |
| NAME1 | nombreCliente | Nombre del cliente |
| STCD1 | rut | RUT del cliente |
| VBELN | nroPedido / nroDocumento | Número de pedido SD / documento FI |
| BELNR | nroDocumentoContable | Número documento contable SAP |
| WERKS | centro | Centro / sucursal |
| LGORT | almacen | Almacén |
| LABST | stockDisponible | Stock disponible |
| NETPR | precioUnitario | Precio neto unitario |
| KWMENG | cantidad | Cantidad |
| NETWR | subtotal | Valor neto de la posición |
| MWSBP | montoIva | Monto IVA |
| TAXKM / MWSKZ | claveImpuesto | Clave de impuesto |
| FKDAT / BLDAT | fechaDocumento | Fecha del documento |
| FAEDT | fechaVencimiento | Fecha de vencimiento |
| DMBTR | importe | Importe en moneda local (CLP) |
| SPART | sector | Sector (división) SAP |
| VTWEG | canalDistribucion | Canal de distribución |
| VKORG | orgVentas | Organización de ventas |
| AUART | tipoDocumento | Tipo de documento de venta |
| KZAWR | condicionPago | Condición de pago |

## URL Base OData
```
https://sapqas.cooprinsem:44320/sap/opu/odata/sap/{NOMBRE_SERVICIO}/
```

El nombre exacto de cada servicio lo confirma el equipo ABAP.

## Reglas de Uso
- NUNCA hardcodear credenciales SAP en el código. Usar variables de entorno.
- Siempre manejar el error `401 Unauthorized` redirigiendo a login.
- El token CSRF caduca con la sesión. Renovarlo si recibes `403 Forbidden`.
- Para desarrollo usar `VITE_USE_MOCK=true` — MSW intercepta las llamadas OData.
- Los servicios OData en SAP on-premise usan `$format=json` en la query string.
