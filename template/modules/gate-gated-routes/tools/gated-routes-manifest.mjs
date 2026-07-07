// Gated-route manifest (OPT-IN — enable the 'gated-routes' step in tools/harness.config.mjs
// once your role-check helpers exist). Every role-gated route family must render a designed
// restricted state — either by importing a RestrictedState primitive (route-level gate) or by
// branching an AccessResult discriminant from its DAL. check-gated-routes.mjs verifies each
// entry's file union AND discovers unlisted role-gated pages, so the canonical
// `notFound()`-on-role-check shapes fail validate. (A regex gate, not a proof: a sufficiently
// creative lying 404 can still evade it — review holds the rest of the line.)
// `via`: 'route-gate' = the page/layout checks roles itself and renders RestrictedState;
// 'access-result' = the page branches `reason === 'forbidden'` from its DAL.
// SOURCE: docs/harness/README.md (gated-route restricted-state gate);
// tools/aliveness-manifest.mjs (the manifest + checker pattern this mirrors).

// Convention regexes — RENAME to your role-check helpers. GATE_CALL is the discovery signal:
// any app/** page/layout whose source matches it must be listed below (or exempted with a
// reason). If your DAL exposes e.g. `requireRole(` / `assertMember(`, put those here.
export const GATE_CALL = /hasAnyRole\(|requireClientScope\(/

// RENAME to your restricted-state primitive / AccessResult discriminant. A manifest entry's
// file union must match this — proof the route renders a designed restricted state.
export const RESTRICTED_SIGNAL = /components\/ui\/access-state|reason === 'forbidden'/

// Entry shape: { files: [page/layout paths], label, via: 'route-gate' | 'access-result' }.
// Example entry (uncomment and adapt when your first gated route ships):
// {
//   files: ['app/(member)/layout.tsx'],
//   label: '/member — authenticated shell',
//   via: 'route-gate',
// },
export const GATED_ROUTES = []

// Role checks that gate only a WRITE affordance inside an open page, aggregate widgets that
// legitimately degrade, or reads whose notFound() is a genuinely-missing-id path. Each entry
// carries its reason; remove the line when the surface converts.
// Example entry:
// ['app/dashboard/page.tsx', 'role check gates a widget on an open page'],
export const GATED_ROUTE_EXEMPTIONS = new Map()
