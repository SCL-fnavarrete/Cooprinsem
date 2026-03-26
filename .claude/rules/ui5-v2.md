# Breaking Changes UI5 Web Components React v2

Resumen condensado de ADR-010, ADR-011 y ADR-016.
Aplica a TODOS los componentes que usen `@ui5/webcomponents-react`.

## Eventos de seleccion en Input con sugerencias (ADR-010)

```tsx
// INCORRECTO (v1 — obsoleto)
<Input onSuggestionItemSelect={(e) => {
  const text = e.detail.item.textContent; // retorna "" en v2
}} />

// CORRECTO (v2)
<Input onSelectionChange={(e) => {
  const text = e.detail.item.getAttribute('text'); // funciona en v2
}} />
```

## MessageBox callback (ADR-010)

```tsx
// INCORRECTO (v1)
MessageBox.confirm("texto", { onClose: (event) => event.detail.action });

// CORRECTO (v2) — action es string directo
MessageBox.confirm("texto", { onClose: (action: string) => action });
```

## Badge renombrado a Tag (ADR-010)

```tsx
// INCORRECTO
import { Badge } from '@ui5/webcomponents-react';

// CORRECTO
import { Tag } from '@ui5/webcomponents-react';
```

## FormItem con Label (ADR-010)

```tsx
// INCORRECTO (v1)
<FormItem label="Nombre">

// CORRECTO (v2)
<FormItem>
  <Label>Nombre</Label>
  <Input />
</FormItem>
```

## Table headerRow slot (Memory)

```tsx
// INCORRECTO — TableHeaderRow como hijo directo
<Table>
  <TableHeaderRow>...</TableHeaderRow>
  {rows}
</Table>

// CORRECTO — headerRow como prop
<Table headerRow={<TableHeaderRow>...</TableHeaderRow>}>
  {rows}
</Table>
```

## Refs de componentes UI5 (ADR-016)

```tsx
// INCORRECTO — causa TS2322
const inputRef = useRef<HTMLInputElement>(null);

// CORRECTO — usar el tipo DomRef del componente
import { InputDomRef } from '@ui5/webcomponents-react';
const inputRef = useRef<InputDomRef>(null);
```

Tipos DomRef disponibles: `InputDomRef`, `SelectDomRef`, `DialogDomRef`, `TableDomRef`.

## No deshabilitar Input durante busqueda async (ADR-011)

UI5 Input cierra su popover de sugerencias si pasa a `disabled=true`.

```tsx
// INCORRECTO — mata las sugerencias
disabled={disabled || !!seleccionado || isLoading}

// CORRECTO — loading es solo indicador visual, no bloquea input
disabled={disabled || !!seleccionado}
```

## Referencia completa
https://sap.github.io/ui5-webcomponents-react/v2/?path=/docs/migration-guide--docs
