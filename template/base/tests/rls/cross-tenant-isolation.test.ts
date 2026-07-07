// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  deleteUser,
  ISOLATION_TARGETS,
  rlsConfigured,
  type SeededUser,
  seedUser,
  signInUser,
} from './client-factory'

// User-scoped isolation: a signed-in user (A) must never SELECT/UPDATE/DELETE another
// user's (B) rows, and an INSERT smuggling B's id must be rejected by the RLS policy.
// Real JWTs minted through GoTrue, so auth runs end-to-end. The fail-closed leak detector.
// SOURCE: docs/harness/README.md (RLS testing doctrine)

// Self-skip when the stack is unconfigured (no env) or there are no targets — register one
// passing placeholder instead of failing the gate for the wrong reason.
const runnable = rlsConfigured && ISOLATION_TARGETS.length > 0

if (!runnable) {
  describe.skip('user-scoped isolation (skipped: no schema/stack)', () => {
    it('unconfigured stack — RLS suite self-skips', () => {
      expect(true).toBe(true)
    })
  })
} else {
  describe('user-scoped isolation', () => {
    const suffix = Date.now().toString(36)
    const createdIds: string[] = []
    let userA: SeededUser // the would-be attacker
    let userB: SeededUser // the victim, whose rows must stay invisible

    beforeAll(async () => {
      userA = await seedUser(`a-${suffix}`)
      userB = await seedUser(`b-${suffix}`)
      createdIds.push(userA.id, userB.id)
    })

    afterAll(async () => {
      await Promise.all(createdIds.map(deleteUser))
    })

    it.each(ISOLATION_TARGETS)('isolates user B rows in $table from user A', async ({
      table,
      ownerColumn,
      insertProbe,
      updateProbe,
      appendOnly,
    }) => {
      const asA = await signInUser(userA.email, userA.password)

      // POSITIVE CONTROL: A sees its OWN row. Without this a deny-all DB would make every
      // assertion below pass vacuously.
      const own = await asA.from(table).select('*').eq(ownerColumn, userA.id)
      expect(own.error).toBeNull()
      expect((own.data ?? []).length).toBeGreaterThanOrEqual(1)

      // SELECT another user's rows -> RLS hides them: no error, zero rows.
      const read = await asA.from(table).select('*').eq(ownerColumn, userB.id)
      expect(read.error).toBeNull()
      expect(read.data ?? []).toHaveLength(0)

      // UPDATE / DELETE across users.
      const payload = updateProbe ? updateProbe() : { updated_at: new Date().toISOString() }
      const updated = await asA.from(table).update(payload).eq(ownerColumn, userB.id).select()
      const deleted = await asA.from(table).delete().eq(ownerColumn, userB.id).select()
      if (appendOnly) {
        // Append-only tables revoke UPDATE/DELETE → a permission error, not a silent no-op.
        expect(updated.error).not.toBeNull()
        expect(deleted.error).not.toBeNull()
      } else {
        // RLS hides B's rows, so the statement matches nothing: no error, zero rows.
        expect(updated.error).toBeNull()
        expect(updated.data ?? []).toHaveLength(0)
        expect(deleted.error).toBeNull()
        expect(deleted.data ?? []).toHaveLength(0)
      }

      // An INSERT smuggling another user's id must be rejected by the RLS WITH CHECK.
      const inserted = await asA
        .from(table)
        .insert([insertProbe(userB.id)])
        .select()
      expect(inserted.error).not.toBeNull()
    })
  })
}
