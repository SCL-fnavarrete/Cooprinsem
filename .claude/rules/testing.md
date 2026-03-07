# Convenciones de Testing — Cooprinsem POS

## Stack de Testing
- **Runner:** Vitest
- **Componentes:** React Testing Library (@testing-library/react)
- **Mocks HTTP:** MSW v2 (Mock Service Worker)
- **Matchers:** @testing-library/jest-dom
- **User events:** @testing-library/user-event

## Regla de Oro
Los tests documentan el **contrato OData esperado con el equipo ABAP**.
Un test que falla porque el endpoint no existe todavía = reminder visual de dependencia pendiente.

## Nomenclatura de Tests
- Archivos: `ComponenteOFuncion.test.tsx` o `ComponenteOFuncion.test.ts`
- Descripciones en **español** (reglas de negocio son en español)
- Patrón: `describe('nombreComponente') → it('debería [acción] cuando [condición]')`

```typescript
// CORRECTO
describe('validarRUT', () => {
  it('debería retornar true para un RUT válido', () => { ... });
  it('debería retornar false para un RUT con dígito verificador incorrecto', () => { ... });
  it('debería aceptar K como dígito verificador', () => { ... });
});

// INCORRECTO
describe('RUT validation', () => {
  it('should return true for valid RUT', () => { ... }); // en inglés — no
});
```

## Helper renderWithProviders
Siempre usar este helper en lugar de `render()` directo:

```typescript
// src/test/helpers.tsx
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@ui5/webcomponents-react';
import { UserProvider } from '@/stores/userContext';

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export const renderWithProviders = (
  ui: React.ReactElement,
  options?: RenderOptions
) => render(ui, { wrapper: AllProviders, ...options });
```

## Factories de Mock Data
Crear en `src/test/factories.ts`:

```typescript
// Usar funciones factory, no objetos estáticos — permiten variaciones
export const crearClienteMock = (overrides?: Partial<ICliente>): ICliente => ({
  codigoCliente: 'K0001',
  nombreCliente: 'Agrícola El Roble Ltda.',
  rut: '76.123.456-7',
  condicionPago: 'CONT',
  estadoCredito: 'AL_DIA',
  creditoAsignado: 5000000,
  creditoUtilizado: 1200000,
  ...overrides,
});

export const CLIENTE_BOLETA_MOCK: ICliente = {
  codigoCliente: '999999',
  nombreCliente: 'Consumidor Final',
  rut: '',
  condicionPago: 'CONT',
  estadoCredito: 'AL_DIA',
  creditoAsignado: 0,
  creditoUtilizado: 0,
};

export const crearArticuloMock = (overrides?: Partial<IArticulo>): IArticulo => ({
  codigoMaterial: 'MAT-001',
  descripcion: 'Fertilizante NPK 15-15-15 x 25kg',
  precioUnitario: 18500,
  stockDisponible: 45,
  unidadMedida: 'UN',
  centro: 'D190',
  almacen: 'B000',
  ...overrides,
});

export const crearFacturaPendienteMock = (overrides?: Partial<IPartidaAbierta>): IPartidaAbierta => ({
  nroDocumento: '1900001234',
  claseDocumento: 'RV',
  fechaDocumento: new Date('2025-10-15'),
  fechaVencimiento: new Date('2025-11-15'),
  importe: 450000,
  moneda: 'CLP',
  diasMora: 0,
  estado: 'ABIERTO',
  ...overrides,
});

export const crearFacturaVencidaMock = (diasMora: number): IPartidaAbierta =>
  crearFacturaPendienteMock({
    fechaVencimiento: new Date(Date.now() - diasMora * 86400000),
    diasMora,
    estado: 'VENCIDO',
  });
```

## MSW Handlers — Documentan el contrato OData
```typescript
// src/services/mock/handlers.ts
import { http, HttpResponse } from 'msw';

const SAP_BASE = import.meta.env.VITE_SAP_ODATA_BASE_URL;

export const handlers = [
  // GET clientes
  http.get(`${SAP_BASE}/ZPOSCustomerService/CustomerSet`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('$filter') ?? '';
    // Simular case-insensitive search
    return HttpResponse.json({ d: { results: CLIENTES_MOCK } });
  }),

  // GET estado crediticio — PENDIENTE confirmar con ABAP
  http.get(`${SAP_BASE}/ZPOSCustomerService/CreditStatusSet`, () => {
    return HttpResponse.json({ d: CREDIT_STATUS_MOCK });
  }),

  // GET materiales
  http.get(`${SAP_BASE}/ZPOSMaterialService/MaterialSet`, () => {
    return HttpResponse.json({ d: { results: MATERIALES_MOCK } });
  }),

  // GET partidas abiertas (FBL5N)
  http.get(`${SAP_BASE}/ZPOSPaymentService/OpenItemSet`, () => {
    return HttpResponse.json({ d: { results: PARTIDAS_MOCK } });
  }),

  // POST crear pedido
  http.post(`${SAP_BASE}/ZPOSSalesService/SalesOrderSet`, () => {
    return HttpResponse.json({ d: { VBELN: '0000012345' } }, { status: 201 });
  }),

  // POST registrar cobro efectivo
  http.post(`${SAP_BASE}/ZPOSPaymentService/PaymentSet`, () => {
    return HttpResponse.json({ d: { BELNR: '1400000099', BUKRS: 'COOP' } }, { status: 201 });
  }),

  // CSRF token
  http.get(`${SAP_BASE}/`, ({ request }) => {
    if (request.headers.get('x-csrf-token') === 'fetch') {
      return new HttpResponse(null, {
        headers: { 'x-csrf-token': 'mock-csrf-token-dev' },
      });
    }
    return new HttpResponse(null, { status: 200 });
  }),
];
```

## Cobertura Mínima POC
| Tipo | Mínimo |
|------|--------|
| Líneas | 70% |
| Branches | 60% |
| Funciones | 75% |

## Qué testear primero
1. `validarRUT` — lógica de negocio crítica, sin dependencias
2. `formatCLP` — utilidad crítica, sin dependencias
3. `ClienteSearch` — componente más complejo del POC
4. `usePedido` — hook central del módulo de pedidos
5. `PagoEfectivo` — flujo completo del cobro
