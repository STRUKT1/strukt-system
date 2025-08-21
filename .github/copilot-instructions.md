# STRUKT-SYSTEM: Copilot Agent Instructions

You are maintaining the **backend + service layer** for STRUKT.

## Current Backend
- **Primary datastore**: Supabase
- **Optional dual-write**: Airtable (controlled by env flags)

## Environment
- Node.js/Express backend
- Env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATA_BACKEND_PRIMARY` = "supabase" | "airtable"
  - `DUAL_WRITE` = true | false

## Responsibilities
- Always default to **Supabase** for reads/writes.
- Dual-write to Airtable only when explicitly flagged.
- Use `src/lib/supabaseServer.js` for Supabase admin client.
- Use `src/services/*` modules for CRUD:
  - `userProfiles.js` (authoritative profile service)
  - workouts, meals, sleep, supplements, mood, chat interactions
- ETL migration tool: `tools/etl_airtable_to_supabase.js`
  - Handles Airtable → Supabase backfill
  - Always map fields according to `/docs/airtable_to_supabase_map.md`

## Goals
- Supabase is the **single source of truth**.
- Maintain compatibility for fallback/dual-write.
- Keep CI/CD schema validation green.
- Ensure error handling and telemetry remain strong.
