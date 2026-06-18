# Execution Form — Implementation Summary

This document discusses design decisions for a complex form that lets the user create, update and delete `ExecutionItem` objects for a selected `System`.
The form has been implemented and its design is described below.

## Context

Each `System` of a `Score` can contain one or more execution items. These contain playback instructions, such as tempo, dynamics, repeats and playback sequence. The editor contains a form that can be used to add, delete and modify execution items.
 
## The Problem

`ExecutionItem` is a union type that contains 7 or more subtypes (to be precise: interfaces). Each of these interface has a different set of attributes. The challenge is to develop a form that enables the user to add and edit these different item types.

## Execution Items

There are four categories of execution items: `FlowItem`, `ExpressionItem`,  `SuppressItem` and `KempliItem`
See the `Terminology` section in CLAUDE.md  for a description of each type.

## The Execution Form

Files `/CLAUDE/Execution-form-x.png` (x = 1, 2, 3) contain snapshots of the form. The form consists of two parts. The top part contains a list of execution items, `ExecutionForm`. Items can be selected or deleted and new items can be added here. When an item is selected, the item's details appear in a form below the list, the `ExecutionItemForm`. This form enables to edit the item's attributes. The number and type of fields of the second form can vary, depending on the selected item type.

## Where the code resides

| module | content |
|---|---|
| `src/typing/execution.ts` | The type definitions of the execution item types. |
| `src/typing/score.ts` | The definition of the `System` type, which has the attribute `execution` containing the execution items. |
| `src/components/editor/ExecutionForm.tsx` | Generates the `ExecutionForm` that contains a list of all execution items of the selected `System`. | 
| `src/components/editor/ExecutionItemForm.tsx` | Generates the `ExecutionItemForm` that lets the user fill in the attributes of the selected execution item. | 

## Design concepts

The execution form is built around a **per-type descriptor registry** so that adding a new item type is a localized, low-risk change.

### Files

| File | Responsibility |
|------|----------------|
| `ExecutionItemForm.tsx` | The registry, the flat form-value type, the validation schema, generic field components, and the detail form that renders one item's fields. |
| `ExecutionForm.tsx` | The Drawer container: the editable item list (`FlowElementList`) + the detail form, plus the load/save (`toForm`/`fromForm`) orchestration. |
| `SequenceEditor.tsx` | A custom two-pane drag-and-drop widget used only by the `sequence` item type (dnd-kit). |
| `executionFormContext.ts` | React context exposing `(open: boolean) => void`, used to make the editor inert while the Drawer is open. |
| `utils/executionItems.ts` | `executionItemTooltip` (long/short) and `executionItemSeqId` — the human-readable text for each item. |

### Core idea: the descriptor registry

`executionItemRegistry: Record<ExecutionItemType, ItemDescriptor>` holds one object per type. Each descriptor fully encapsulates that type's behavior:

```ts
interface ItemDescriptor {
    type: ExecutionItemType
    label: string                              // shown in the "add type" picker
    hasIterations: boolean                     // supports per-iteration condition?
    createDefault: () => ExecutionItemDraft    // fresh blank item
    toForm: (item) => Partial<FormValueType>   // item  -> flat form values
    fromForm: (form, base, ctx) => ExecutionItem // form -> item
    Fields: (props: FieldsProps) => ReactNode  // the type-specific subform JSX
}
```

Current types: `goto`, `loop`, `wait`, `tempo`, `dynamics`, `sequence`, `suppress`, `kempli` (order defined by `EXECUTION_TYPES`).

### The flat form value

All types share one **flat superset** value object, `FormValueType`. Each descriptor reads/writes only the fields relevant to its type (e.g. `tempo` uses `fromBPM`/`toBPM`; `dynamics` uses `fromDynamics`/`toDynamics`/`dynamicsPositions`). The rest of the machinery never needs to know which field belongs to which type.

`ExecutionItemDraft` (the list item) is a deliberately loose interface with an `[field: string]: any` index signature plus `type?`, `seqId`, `tooltip`, `tooltipshort`. This decouples drafts from the discriminated `ExecutionItem` union and avoids cross-type property conflicts while an item is half-filled.

### Validation

`formModel = SchemaModel({...})` lists every field once. Conditional requirements use the `If(...)` helper, which builds a `when` validator that only enforces a rule when other fields hold given value(s) — e.g. `seconds` is required only when `type === 'wait'`, `isGradual` fields apply only to `tempo`/`dynamics`. `isValid()` merges the value onto `emptyForm` first, because `check` expects all schema keys present.

### Generic field components

Reusable, registry-agnostic field wrappers (consistent label width / layout): `PickerField`, `InputField`, `ToggleField`, `RangeField`, plus `numberOptions(max)` for 1..n multi-selects (beats / passes / iterations). Descriptors compose these inside their `Fields`.

### Data flow

```
select item ──> ExecutionForm.updateFieldsFromSelected()
                  └─ registry[type].toForm(item) ──> setFormValue (flat)
                                                          │
user edits ──> Form onChange ──> setValueChanged ──> setFormValue
              (custom widgets call onPatch(...) instead)     │
                                                     if valid -> setDirty(true)
dirty flag ──> ExecutionForm.updateSelectedFromFields()
                  └─ registry[type].fromForm(form, base, ctx)
                     + recompute tooltip / tooltipshort
                     -> splice back into itemList
Confirm ──> handleSave(): filter typed items -> systemData.execution -> onSave()
```

`onPatch` is the bridge for widgets that aren't rsuite `Form.Control`s (currently the `SequenceEditor`): it merges a partial patch into the form value exactly as an rsuite change would.

### Shared condition subform

`ConditionForm` renders the flow conditions common to most items: **pass(es) nr…**, **every nth pass**, and (only when `hasIterations` and a `loop` item exists) **iteration(s) nr…**. The "after/on" preposition is chosen per type. It is appended after every descriptor's `Fields`.

### Per-type field notes

- **tempo / dynamics** — `isGradual` toggle switches between a single value (+ start beat) and a from→to range (+ beat range). `dynamics` additionally has a **Positions** `CheckPicker` (empty = all positions; stored as `DynamicsItem.positions`), mirroring `suppress`.
- **suppress** — optional **Positions** and **On beats** check-pickers; empty means "all" (stored as `undefined`).
- **kempli** — `double`/`off` value + optional **On beats**.
- **sequence** — uses the custom `SequenceEditor` (see below); stores ordered `uuids` + derived `labels`.
- **goto / loop / wait** — single field each.

### SequenceEditor (sequence type only)

Two-pane dnd-kit editor: a **palette** of available systems and an ordered **Sequence** pane. Drag palette → sequence to append (duplicates allowed); drag within the sequence to reorder; × to remove. Key points:

- `collisionDetection={pointerWithin}` (not `closestCenter`) so a drop back onto "Available" is correctly ignored.
- Both panes are droppables (`DROP_ZONE_ID`, `PALETTE_ZONE_ID`); `handleDragEnd` returns early on a palette-zone drop.
- `DragOverlay` is portaled to `document.body` with `zIndex 2000` so the ghost label isn't hidden by the Drawer's portal/transform/z-index.
- An insertion line marks where a palette item will land.
- Pane height is controlled by `RELATIVE_SIZE` (currently `min-h-20 max-h-[30vh]`).

### Non-modal Drawer + inert editor

The Drawer is non-modal (`backdrop={false}`, `enforceFocus={false}`) so the user can scroll the score while building a sequence. To prevent editing the underlying `SystemNode`s, `EditorWindow` keeps an `openFormCount` and wraps content in `<div inert={openFormCount > 0}>`. `SummaryItem` toggles the count via `ExecutionFormContext` when an execution item is being edited. Inert content is skipped in hit-testing but still scrollable.

### Adding a new execution-item type

1. Add the type to the `ExecutionItem` union (`typing/execution.ts`) and to `EXECUTION_TYPES`.
2. Add a descriptor to `executionItemRegistry` (`label`, `createDefault`, `toForm`, `fromForm`, `Fields`, `hasIterations`).
3. Add any new type-specific fields to `FormValueType`, `formModel`, and `emptyForm`.
4. Add a `case` to `executionItemTooltip` in `utils/executionItems.ts`.

