-- District tagging for incidents — powers the District Mood page.
--
-- TN has 38 administrative districts.  The `location` column is free-text
-- (can be city/area/state/blank).  This column is the NORMALIZED district
-- that the location resolves to, set by the ingestion pipeline via
-- app/ingestion/district_mapper.py.

alter table incidents add column if not exists district text;

-- Composite index supporting "all incidents in district X in last N days"
-- which is the core query of /api/stats/districts.
create index if not exists idx_incidents_district_date
  on incidents (district, incident_date desc)
  where district is not null;
