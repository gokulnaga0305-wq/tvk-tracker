-- 017_single_source_status.sql
-- Adds a 'single_source' verification_status for pending items that, after
-- the 24h/48h auto-recheck window, still have no press corroboration. These
-- auto-publish to the dashboard but carry a visible "single source" tag so
-- the reader knows they're reported-but-not-cross-verified.
--
-- Run this on Supabase (SQL editor) before deploying the pending-escalation
-- cron. Idempotent.

alter table incidents
  drop constraint if exists incidents_verification_status_check;

alter table incidents
  add constraint incidents_verification_status_check
  check (verification_status in (
    'pending_verification',
    'press_verified',
    'multi_source_verified',
    'admin_verified',
    'single_source',
    'retracted'
  ));
