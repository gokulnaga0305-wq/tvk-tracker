-- Add `press_verified` to the incidents.verification_status enum.
--
-- The check constraint was originally defined with only the old set:
--   pending_verification | multi_source_verified | admin_verified | retracted
-- We now need press_verified for single-source-from-press incidents
-- (Hindu / SunNewsTamil / News18Tamil / Vikatan / Spark+ / etc.).

-- Drop the existing check constraint if present and recreate with new set
alter table incidents
  drop constraint if exists incidents_verification_status_check;

alter table incidents
  add constraint incidents_verification_status_check
  check (verification_status in (
    'pending_verification',
    'press_verified',
    'multi_source_verified',
    'admin_verified',
    'retracted'
  ));
