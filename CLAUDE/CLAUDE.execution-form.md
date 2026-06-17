# Execution Form — Refactoring discussion

## Context

Each `System` of a `Score` can contain one or more execution items. These contain playback instructions, such as tempo, dynamics, repeats and playback sequence. The editor contains a form that can be used to add, delete and modify execution items.
 
---

## The Problem

The layout of the form user friendly. However I have the feeling that the implementation is somewhat unpractical. The form currently can only handle a subset of the possible execution item types. Due to the current implementation choices, adding more item types might not be straightforward.

## My Question

I am looking for a second opinion about the current approach. How would you implement this form? Is there a better way to achieve the same functionality? 'Better' meaning: easier to maintain and expand. Perhaps with less code.

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
| `src/components/editor/ExecutionForm.tsx` | Generates the `ExecutionForm` | 
| `src/components/editor/ExecutionItemForm.tsx` | Generates the `ExecutionForm` | 
