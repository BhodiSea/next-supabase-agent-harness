import { describe, expect, it } from 'vitest'
import { type NoteDTO, toNoteDTO } from '@/lib/dal/notes'
import type { Tables } from '@/lib/supabase/database.types'

// Pins the DAL's row -> DTO contract: storage fields (user_id, body, created_at) never leak past
// the DAL boundary, and the mapper is pure. SOURCE: docs/harness/README.md (DAL returns DTOs, never raw rows)

const row: Tables<'notes'> = {
  body: 'The body never leaves the DAL.',
  created_at: '2026-07-07T00:00:00+00:00',
  id: '5f7a1c9e-0000-4000-8000-000000000001',
  title: 'First note',
  updated_at: '2026-07-07T01:02:03+00:00',
  user_id: '5f7a1c9e-0000-4000-8000-0000000000aa',
}

describe('toNoteDTO', () => {
  it('maps a notes row to the DTO shape (and only that shape)', () => {
    const dto = toNoteDTO(row)
    const expected: NoteDTO = {
      id: '5f7a1c9e-0000-4000-8000-000000000001',
      title: 'First note',
      updatedAt: '2026-07-07T01:02:03+00:00',
    }
    expect(dto).toStrictEqual(expected)
    // toStrictEqual above also proves no extra keys (user_id/body/created_at) leaked through.
    expect(Object.keys(dto).sort()).toEqual(['id', 'title', 'updatedAt'])
  })

  it('is pure — it does not mutate its input row', () => {
    const snapshot = structuredClone(row)
    toNoteDTO(row)
    expect(row).toStrictEqual(snapshot)
  })
})
