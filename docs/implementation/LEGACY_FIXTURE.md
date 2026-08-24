# Representative Legacy StudioData Fixture

[`tests/fixtures/legacy-studio-data-v5.json`](../../tests/fixtures/legacy-studio-data-v5.json)
is the reproducible migration input for WP0 and later read-through adapter work.

It was produced as a reduced, sanitized representation of the existing
`StudioData` export shape:

1. Start from the current export contract in `src/lib/studioStorage.ts`.
2. Keep one fictional project, one fabric, one linked material, one task, one
   note, one legacy lookbook page, and one yardage entry so cross-record
   relationships are exercised.
3. Set the fixture to legacy version `5` so current normalization upgrades it
   to `LOCAL_DATA_VERSION` during test import.
4. Retain only metadata for the representative hero image. Do not include a
   Base64 payload, signed URL, preview blob, user email, API key, credential,
   or personal account data.
5. Use fictional names, supplier data, notes, and storage paths beneath the
   non-production `users/example-studio/...` prefix.

The fixture is intentionally small enough to review in a code diff while still
covering the aggregate’s relationships and a legacy image metadata reference.
It is not production data and must never be replaced with a user export.
