import { createContext } from 'react'

// Lets a deeply nested ExecutionForm signal the EditorWindow when it opens or
// closes. While any form is open the EditorWindow makes its content `inert`
// (no editing) but still scrollable, since the (non-modal) Drawer no longer
// blocks the page behind it.
//
// The value is a setter called with `true` when a form opens and `false` when it
// closes; the EditorWindow keeps an open-count so multiple/!overlapping forms
// behave correctly.
export const ExecutionFormContext = createContext<(open: boolean) => void>(() => {})
