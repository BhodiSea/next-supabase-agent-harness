// Route→required-kit-import adoption manifest for the "aliveness" layer. Each entry asserts
// that a shipped operational board still imports the kit primitives that make it an alive
// surface (select → bulk → inline-edit → peek → keyboard disposition → optimistic + Undo). The gate
// tools/check-aliveness-adoption.mjs fails `pnpm validate` if any listed board drops one, so a board
// can never silently regress from an alive surface back to look-and-click-only forms. APPEND-ONLY by
// convention: seeded empty; append a row when a board ships, and never delete a row without a
// deliberate decision (deleting rows is how adoption silently regresses).
// SOURCE: docs/harness/README.md (route→primitive adoption manifest)

// Entry shape: { label, files: [island source paths], requires: [import specifiers] }. `requires` is
// checked against the UNION of `files` sources (a queue/list/row split means one primitive may be
// imported in a sibling file), so a required hook holds when any listed file imports it.
//
// Example entry (uncomment and adapt when your first board ships):
// {
//   files: ['components/tasks/task-list.client.tsx'],
//   label: '/tasks — board',
//   requires: ['@/lib/ui/use-selection'],
// },
export const ALIVENESS_MANIFEST = []
