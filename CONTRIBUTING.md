# Contributing

## Ground rules

1. **The selftest matrix is the contract.** Any change must keep
   `node scripts/check-syntax.mjs`, `node scripts/hygiene.mjs`, and
   `node --test tests/` green, and the `bootstrap` CI job must still produce a
   project where `pnpm validate` passes out of the box.
2. **Nothing project-specific in `template/`.** The hygiene gate greps for
   leaked strings from the harness's source codebase; add to
   `scripts/hygiene.mjs` if you spot a class it misses.
3. **Zero runtime dependencies in `installer/`.** Node built-ins only — the
   installer must never itself be a supply-chain vector.
4. **Placeholder closure.** Every `{{TOKEN}}` used in `template/` must be
   registered in `installer/lib/placeholders.mjs`, and vice versa (enforced by
   hygiene).
5. **Pin everything.** GitHub Actions by full commit SHA (`@sha # vX.Y.Z`),
   npm versions by tested range. Renovate maintains the pins.
6. **Gate proposals**: open a `gate-proposal` issue first. A gate must be
   deterministic, fast, and pass on the empty/example manifest — projects grow
   into gates; gates never block a fresh install.

## Local development

```sh
node scripts/check-syntax.mjs   # syntax over installer + template (.tmpl aware)
node scripts/hygiene.mjs        # leaked-string + placeholder closure
node --test tests/              # installer lifecycle + hook contracts
node installer/cli.mjs init --dir /tmp/scratch --yes   # manual smoke test
```

## Releases

1. Add a `## [x.y.z]` section to `CHANGELOG.md`.
2. Bump `version` in `package.json`.
3. Tag `vx.y.z` and push — `release.yml` verifies the changelog, packs, attests
   provenance, and publishes the GitHub Release.
