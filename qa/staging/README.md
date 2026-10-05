# Matchrim staging SQL

The SQL files in this directory provision the isolated `matchrim_qa` schema used by the synthetic cohort and staging QA.

- Run them only against the dedicated Matchrim staging project.
- Do not copy them into `supabase/migrations` or apply them to production.
- Production-facing schema changes must remain separate and pass their own deployment gate.
