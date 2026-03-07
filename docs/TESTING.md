# TESTING.md — Estrategia de Testing

## 1. Stack de Testing

| Herramienta | Versión | Uso |
|-------------|---------|-----|
| **Vitest** | latest | Test runner (compatible con Vite, rápido, zero-config) |
| **React Testing Library (RTL)** | latest | Tests de componentes React (centrado en comportamiento) |
| **MSW (Mock Service Worker)** | v2 | Interceptar llamadas OData SAP para tests y desarrollo |
| **@testing-library/user-event** | latest | Simular interacciones de usuario realistas (tipo, click, etc.) |
| **@testing-library/jest-dom** | latest | Matchers DOM adicionales (toBeInTheDocument, etc.) |
| **jsdom** | latest | DOM virtual para tests unitarios |

### Instalación
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
```

---

## 2. Configuración

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/config/**',        // Constantes SAP — no lógica que testear
        'src/services/mock/**', // MSW handlers — testeados implícitamente
      ],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### src/test/setup.ts
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from '@/services/mock/server';

// MSW lifecycle para tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server.resetHandlers(); // Resetear overrides de handlers por test
});
afterAll(() => server.close());
```

### src/services/mock/server.ts (MSW para Node.js — tests)
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### src/services/mock/browser.ts (MSW para navegador — desarrollo)
```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

---

## 3. Pirámide de Testing

```
         /\
        /  \          E2E: Manual en POC
       /    \         Playwright en Fase 1 completa
      /──────\
     /        \       Integración (20-30%)
    / 20-30%   \      Flujos completos: crear pedido, cobrar factura
   /────────────\
  /              \    Componente + Unit (60-70%)
 /    60-70%      \   Cada componente .test.tsx + hooks + utils
/──────────────────\
```

**Regla práctica para el POC:**
- Toda función pública en `src/utils/` → test unitario
- Todo hook en `src/hooks/` y `src/features/*/use*.ts` → test de hook
- Todo componente en `src/components/pos/` → test de componente
- Flujo completo Crear Pedido → test de integración
- Flujo completo Cobro Efectivo → test de integración

---

## 4. Convenciones

### 4.1 Ubicación de Archivos
```
src/
├── components/
│   └── pos/
│       ├── ArticuloGrid.tsx
│       └── ArticuloGrid.test.tsx       # Junto al componente
├── features/
│   └── pedidos/
│       ├── PedidoPage.tsx
│       ├── PedidoPage.test.tsx         # Test de integración
│       ├── usePedido.ts
│       └── usePedido.test.ts
├── utils/
│   ├── format.ts
│   └── format.test.ts
└── test/
    ├── setup.ts                        # Setup global MSW + jest-dom
    ├── helpers.tsx                     # renderWithProviders, etc.
    └── factories/
        ├── articulo.factory.ts
        ├── cliente.factory.ts
        └── factura.factory.ts
```

### 4.2 Nomenclatura de Tests
```typescript
// Patrón: ComponentName.test.tsx
describe('NombreComponente', () => {
  describe('cuando [condición o estado inicial]', () => {
    it('[comportamiento esperado]', () => {});
    it('[otro comportamiento]', () => {});
  });

  describe('cuando el usuario [acción]', () => {
    it('[resultado esperado]', async () => {});
  });
});
```

### 4.3 Idioma de Descripciones
Los `describe` e `it` se escriben en **español** para alinearse con las reglas de negocio chilenas/SAP:
```typescript
describe('ArticuloGrid', () => {
  describe('cuando la grilla está vacía', () => {
    it('muestra el mensaje "Busque y agregue artículos al pedido"', () => {});
  });

  describe('cuando el usuario agrega un artículo', () => {
    it('asigna la posición 10 al primer artículo', () => {});
    it('calcula el subtotal multiplicando cantidad por precio', () => {});
  });

  describe('cuando el usuario edita la cantidad', () => {
    it('recalcula el subtotal automáticamente', () => {});
    it('muestra warning si la cantidad supera el stock', () => {});
  });
});
```

---

## 5. Patrones de Test

### 5.1 Tests de Utilidades (más simples — empezar aquí)
```typescript
// format.test.ts
import { formatCLP, formatRUT, formatFecha } from './format';

describe('formatCLP', () => {
  it('formatea enteros como pesos chilenos con punto de miles', () => {
    expect(formatCLP(1234567)).toBe('$1.234.567');
  });

  it('formatea cero', () => {
    expect(formatCLP(0)).toBe('$0');
  });

  it('formatea negativos para mostrar vuelto', () => {
    expect(formatCLP(-5000)).toBe('-$5.000');
  });

  it('no agrega decimales (CLP no tiene centavos)', () => {
    expect(formatCLP(10000)).toBe('$10.000');
    expect(formatCLP(10000)).not.toContain(',');
  });
});

describe('formatRUT', () => {
  it('formatea RUT con puntos y guión', () => {
    expect(formatRUT('123456789')).toBe('12.345.678-9');
  });

  it('formatea RUT con dígito verificador K', () => {
    expect(formatRUT('12345678K')).toBe('12.345.678-K');
  });

  it('acepta RUT ya formateado y lo normaliza', () => {
    expect(formatRUT('12.345.678-9')).toBe('12.345.678-9');
  });
});

describe('formatFecha', () => {
  it('convierte formato SAP (YYYYMMDD) a DD/MM/YYYY', () => {
    expect(formatFecha('20250325')).toBe('25/03/2025');
  });
});
```

### 5.2 Tests de Validaciones
```typescript
// validations.test.ts
import { validarRUT, limpiarRUT } from './validations';

describe('validarRUT', () => {
  it('valida RUT válido con dígito numérico', () => {
    expect(validarRUT('12.345.678-9')).toBe(true);
  });

  it('valida RUT válido con dígito K', () => {
    expect(validarRUT('12.345.678-K')).toBe(true);
  });

  it('rechaza RUT con dígito verificador incorrecto', () => {
    expect(validarRUT('12.345.678-0')).toBe(false);
  });

  it('rechaza RUT vacío', () => {
    expect(validarRUT('')).toBe(false);
  });

  it('no valida RUT de Cliente Boleta (999999 es caso especial)', () => {
    // Cliente boleta no tiene RUT — no debe validarse
    expect(validarRUT('999999')).toBe(false);
  });
});
```

### 5.3 Tests de Componente UI
```typescript
// ArticuloGrid.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArticuloGrid } from './ArticuloGrid';
import { crearArticuloMock } from '@/test/factories/articulo.factory';

describe('ArticuloGrid', () => {
  describe('cuando la grilla está vacía', () => {
    it('muestra mensaje de estado vacío', () => {
      render(<ArticuloGrid lineas={[]} onChange={vi.fn()} />);
      expect(
        screen.getByText(/busque y agregue artículos al pedido/i)
      ).toBeInTheDocument();
    });
  });

  describe('cuando tiene artículos', () => {
    const lineas = [
      crearArticuloMock({ descripcion: 'Martillo Carpintero', precio: 5990, cantidad: 2 }),
      crearArticuloMock({ descripcion: 'Clavo 3"', precio: 1200, cantidad: 10 }),
    ];

    it('muestra todas las líneas de artículos', () => {
      render(<ArticuloGrid lineas={lineas} onChange={vi.fn()} />);
      expect(screen.getByText('Martillo Carpintero')).toBeInTheDocument();
      expect(screen.getByText('Clavo 3"')).toBeInTheDocument();
    });

    it('asigna posición 10 al primero y 20 al segundo', () => {
      render(<ArticuloGrid lineas={lineas} onChange={vi.fn()} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('muestra el subtotal correcto por línea (cantidad × precio)', () => {
      render(<ArticuloGrid lineas={lineas} onChange={vi.fn()} />);
      expect(screen.getByText('$11.980')).toBeInTheDocument(); // 5990 * 2
      expect(screen.getByText('$12.000')).toBeInTheDocument(); // 1200 * 10
    });

    it('llama a onChange al eliminar una línea', async () => {
      const onChange = vi.fn();
      render(<ArticuloGrid lineas={lineas} onChange={onChange} />);
      const [primerBtnEliminar] = screen.getAllByRole('button', { name: /eliminar/i });
      await userEvent.click(primerBtnEliminar);
      expect(onChange).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ descripcion: 'Martillo Carpintero' })
        ])
      );
    });
  });
});
```

### 5.4 Tests de Hook
```typescript
// usePedido.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePedido } from './usePedido';
import { crearArticuloMock } from '@/test/factories/articulo.factory';

describe('usePedido', () => {
  it('inicia con estado vacío', () => {
    const { result } = renderHook(() => usePedido());
    expect(result.current.lineas).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.totalIVA).toBe(0);
    expect(result.current.total).toBe(0);
  });

  describe('al agregar artículos', () => {
    it('calcula el subtotal correctamente', () => {
      const { result } = renderHook(() => usePedido());
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precio: 10000, cantidad: 2 }));
      });
      expect(result.current.subtotal).toBe(20000);
    });

    it('calcula el IVA 19% sobre el subtotal', () => {
      const { result } = renderHook(() => usePedido());
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precio: 10000, cantidad: 1 }));
      });
      expect(result.current.totalIVA).toBe(1900); // 19% de 10000
      expect(result.current.total).toBe(11900);
    });

    it('asigna posiciones correlativas en múltiplos de 10', () => {
      const { result } = renderHook(() => usePedido());
      act(() => {
        result.current.agregarArticulo(crearArticuloMock());
        result.current.agregarArticulo(crearArticuloMock());
        result.current.agregarArticulo(crearArticuloMock());
      });
      const posiciones = result.current.lineas.map(l => l.posicion);
      expect(posiciones).toEqual(['10', '20', '30']);
    });
  });

  describe('limpiar', () => {
    it('resetea el pedido a estado vacío', () => {
      const { result } = renderHook(() => usePedido());
      act(() => {
        result.current.agregarArticulo(crearArticuloMock({ precio: 5000, cantidad: 1 }));
        result.current.limpiar();
      });
      expect(result.current.lineas).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });
});
```

### 5.5 Test de Modal Pago Efectivo
```typescript
// PagoEfectivo.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PagoEfectivo } from './PagoEfectivo';
import { renderWithProviders } from '@/test/helpers';

const defaultProps = {
  totalACobrar: 150000,
  onConfirmar: vi.fn(),
  onCancelar: vi.fn(),
};

describe('PagoEfectivo', () => {
  describe('cálculo de vuelto', () => {
    it('calcula vuelto positivo cuando recibe más del total', async () => {
      renderWithProviders(<PagoEfectivo {...defaultProps} />);
      await userEvent.type(screen.getByLabelText(/monto recibido/i), '200000');
      expect(screen.getByText('$50.000')).toBeInTheDocument(); // vuelto
    });

    it('muestra vuelto cero cuando el monto es exacto', async () => {
      renderWithProviders(<PagoEfectivo {...defaultProps} />);
      await userEvent.type(screen.getByLabelText(/monto recibido/i), '150000');
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('validaciones', () => {
    it('deshabilita el botón confirmar si el monto es insuficiente', async () => {
      renderWithProviders(<PagoEfectivo {...defaultProps} />);
      await userEvent.type(screen.getByLabelText(/monto recibido/i), '100000');
      expect(screen.getByRole('button', { name: /confirmar cobro/i })).toBeDisabled();
    });

    it('habilita el botón confirmar con monto suficiente', async () => {
      renderWithProviders(<PagoEfectivo {...defaultProps} />);
      await userEvent.type(screen.getByLabelText(/monto recibido/i), '150000');
      expect(screen.getByRole('button', { name: /confirmar cobro/i })).toBeEnabled();
    });
  });

  it('llama a onCancelar al presionar Cancelar', async () => {
    renderWithProviders(<PagoEfectivo {...defaultProps} />);
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(defaultProps.onCancelar).toHaveBeenCalledTimes(1);
  });
});
```

### 5.6 Tests de Integración (Flujo Completo)
```typescript
// PedidoPage.test.tsx — test de integración con MSW
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PedidoPage } from './PedidoPage';
import { renderWithProviders } from '@/test/helpers';

describe('PedidoPage — flujo completo crear pedido', () => {
  it('permite crear un pedido de punta a punta', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PedidoPage />);

    // 1. Buscar y seleccionar cliente
    await user.type(screen.getByPlaceholderText(/buscar cliente/i), 'González');
    await waitFor(() =>
      expect(screen.getByText('Juan González')).toBeInTheDocument()
    );
    await user.click(screen.getByText('Juan González'));

    // 2. Buscar y agregar artículo
    await user.type(screen.getByPlaceholderText(/buscar artículo/i), 'martillo');
    await waitFor(() =>
      expect(screen.getByText('Martillo Carpintero')).toBeInTheDocument()
    );
    await user.click(screen.getByText('Martillo Carpintero'));

    // 3. Verificar que aparece en la grilla
    expect(screen.getAllByText('Martillo Carpintero')).toHaveLength(1);

    // 4. Grabar pedido (F9 o clic en botón)
    await user.click(screen.getByRole('button', { name: /grabar/i }));

    // 5. Verificar mensaje de éxito con número de pedido SAP
    await waitFor(() => {
      expect(screen.getByText(/pedido n°/i)).toBeInTheDocument();
    });
  });
});
```

---

## 6. Fábricas de Datos (Factories)

### src/test/factories/articulo.factory.ts
```typescript
import type { IArticulo } from '@/types/articulo';

let counter = 0;

export function crearArticuloMock(overrides: Partial<IArticulo> = {}): IArticulo {
  counter++;
  return {
    codigoMaterial: `MAT${String(counter).padStart(6, '0')}`,
    descripcion: `Artículo de prueba ${counter}`,
    precio: 10000,
    cantidad: 1,
    unidadMedida: 'UN',
    stockB000: 100,
    stockB001: 50,
    stockB002: 25,
    stockG000: 0,
    descuento: 0,
    ...overrides,
  };
}
```

### src/test/factories/cliente.factory.ts
```typescript
import type { ICliente } from '@/types/cliente';
import { CLIENTE_BOLETA } from '@/config/sap';

export function crearClienteMock(overrides: Partial<ICliente> = {}): ICliente {
  return {
    codigoCliente: '0001000001',
    nombreCliente: 'Cliente de Prueba S.A.',
    rut: '12.345.678-9',
    condicionPago: 'contado',
    direccion: 'Av. Siempre Viva 742, Santiago',
    limiteCredito: 1000000,
    ...overrides,
  };
}

// Mock predefinido del cliente boleta (999999)
export const CLIENTE_BOLETA_MOCK = crearClienteMock({
  codigoCliente: CLIENTE_BOLETA,
  nombreCliente: 'Cliente Boleta',
  rut: '',
  condicionPago: 'contado',
  limiteCredito: 0,
});
```

### src/test/factories/factura.factory.ts
```typescript
import type { IPartidaAbierta } from '@/types/factura';

let docCounter = 1500000000;

export function crearFacturaMock(overrides: Partial<IPartidaAbierta> = {}): IPartidaAbierta {
  docCounter++;
  return {
    belnr: String(docCounter),
    blart: 'FV',
    fechaDocumento: '20250101',
    fechaVencimiento: '20250201',
    diasMora: 0,
    monto: 500000,
    estado: 'vigente',
    referencia: '',
    asignacion: '',
    ...overrides,
  };
}

// Helpers para casos específicos
export function crearFacturaVencidaMock(diasMora = 15): IPartidaAbierta {
  const hoy = new Date();
  const vencimiento = new Date(hoy);
  vencimiento.setDate(vencimiento.getDate() - diasMora);
  return crearFacturaMock({
    diasMora,
    estado: 'vencida',
    fechaVencimiento: vencimiento.toISOString().slice(0, 10).replace(/-/g, ''),
  });
}
```

---

## 7. MSW Handlers OData

### src/services/mock/handlers.ts
```typescript
import { http, HttpResponse } from 'msw';
import materialesData from './data/materiales.json';
import clientesData from './data/clientes.json';
import facturasData from './data/facturas.json';

const BASE = import.meta.env?.VITE_SAP_ODATA_BASE_URL ?? 'https://mock-sap/odata';

export const handlers = [
  // CSRF Token (requerido para POST en SAP on-premise)
  http.get(`${BASE}`, () => {
    return new HttpResponse(null, {
      headers: { 'x-csrf-token': 'mock-csrf-token-12345' },
    });
  }),

  // GET Materiales
  http.get(`${BASE}/MaterialSet`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('$filter')?.toLowerCase() ?? '';
    const results = filter
      ? materialesData.filter(m =>
          m.descripcion.toLowerCase().includes(filter) ||
          m.codigoMaterial.includes(filter)
        )
      : materialesData.slice(0, 10);
    return HttpResponse.json({ d: { results } });
  }),

  // GET Clientes
  http.get(`${BASE}/CustomerSet`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('$filter')?.toLowerCase() ?? '';
    const results = filter
      ? clientesData.filter(c =>
          c.nombreCliente.toLowerCase().includes(filter) ||
          c.rut.includes(filter) ||
          c.codigoCliente.includes(filter)
        )
      : clientesData.slice(0, 5);
    return HttpResponse.json({ d: { results } });
  }),

  // GET Partidas Abiertas (FBL5N equiv.)
  http.get(`${BASE}/OpenItemSet`, ({ request }) => {
    const url = new URL(request.url);
    const filter = url.searchParams.get('$filter') ?? '';
    // Extraer KUNNR del filter para devolver facturas del cliente correcto
    const kunnrMatch = filter.match(/KUNNR eq '([^']+)'/);
    const kunnr = kunnrMatch?.[1];
    const results = kunnr
      ? facturasData.filter(f => f.kunnr === kunnr)
      : facturasData;
    return HttpResponse.json({ d: { results } });
  }),

  // POST Crear Pedido → retorna VBELN (número de pedido SAP)
  http.post(`${BASE}/SalesOrderSet`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      d: {
        VBELN: '0080012345',
        BLART: 'ZPOS',
        BUKRS: 'COOP',
        ...body,
      },
    }, { status: 201 });
  }),

  // POST Registrar Cobro Efectivo → retorna BELNR (doc. clase W)
  http.post(`${BASE}/PaymentSet`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      d: {
        BELNR: '1500012345',
        BLART: 'W',
        BUKRS: 'COOP',
        status: 'OK',
        ...body,
      },
    }, { status: 201 });
  }),
];
```

---

## 8. Test Helpers

### src/test/helpers.tsx
```typescript
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@ui5/webcomponents-react';
import type { ReactElement } from 'react';
import { UserProvider } from '@/features/auth/UserContext'; // Context de usuario

// Usuario mock para tests
const USUARIO_MOCK = {
  id: 'cajero.test',
  nombre: 'Cajero Test',
  rol: 3, // Caja
  sucursal: 'D190',
};

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider initialUser={USUARIO_MOCK}>
          {children}
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}
```

---

## 9. Qué Testear — Reglas Claras

### ✅ OBLIGATORIO testear
| Categoría | Ejemplo |
|-----------|---------|
| Todas las utilidades en `src/utils/` | `formatCLP`, `formatRUT`, `validarRUT`, `formatFecha` |
| Todos los hooks de features | `usePedido`, `useCaja` |
| Componentes `src/components/pos/` | `ArticuloGrid`, `ClienteSearch`, `PagoEfectivo`, `CajaFacturaList` |
| Flujos de integración (con MSW) | Crear pedido completo, Cobro efectivo completo |
| Reglas de negocio críticas | Sobrepago efectivo, cálculo IVA 19%, posiciones de pedido |

### ❌ NO testear
| Categoría | Razón |
|-----------|-------|
| Componentes internos de UI5 (Button, Input, etc.) | Ya testeados por SAP |
| Configuración de Vite/ESLint/TypeScript | No son lógica de la app |
| Estilos CSS | No aportan valor en tests unitarios |
| MSW handlers en sí mismos | Se testean implícitamente en los tests de integración |
| `src/config/sap.ts` (constantes) | No hay lógica que testear |

---

## 10. Cobertura Esperada

| Métrica | POC | Fase 1 Completa |
|---------|-----|-----------------|
| Líneas | ≥ 70% | ≥ 80% |
| Branches | ≥ 60% | ≥ 70% |
| Funciones | ≥ 75% | ≥ 85% |

---

## 11. Comandos

```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch (desarrollo activo)
npm run test:watch

# Tests con reporte de cobertura
npm run test:coverage

# Tests de un archivo específico
npx vitest ArticuloGrid

# Tests de todos los hooks
npx vitest --testPathPattern="hooks"

# Tests de integración (features)
npx vitest --testPathPattern="features"

# Tests de utilidades
npx vitest --testPathPattern="utils"
```

---

## 12. CI/CD (Post-POC)

```yaml
# .github/workflows/test.yml
name: Tests Cooprinsem POS
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test -- --reporter=verbose
      - run: npm run test:coverage
```

---

## 13. Notas para Claude Code

- **MSW es la fuente de verdad para contratos OData:** Los handlers en `handlers.ts` documentan la forma exacta de los requests/responses que se esperan de SAP. Si el equipo ABAP cambia algo, se actualiza aquí primero.
- **Usar `userEvent` sobre `fireEvent`:** `userEvent` simula interacciones reales del usuario (incluyendo eventos intermedios). Es más realista y detecta más bugs.
- **No mockear módulos enteros:** Preferir MSW para mockear OData. Solo usar `vi.mock()` para dependencias que no tienen sentido en tests (ej: `window.print()`).
- **Tests de integración primero si el tiempo es limitado:** Un buen test del flujo completo (crear pedido + cobro) da más confianza que 10 tests unitarios de componentes aislados.
