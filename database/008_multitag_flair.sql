-- Multi-tag support and flair (sub-classification) on incidents.
-- Matches reference TVK Files which tags each incident with multiple
-- categories (e.g. "Honour killing of youth" -> [honour_killing, murders,
-- crime_law, dalits]) and uses flairs like "Speech vs Reality" /
-- "TVK Law & Order" for narrative grouping.

alter table incidents
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists flair text,
  add column if not exists external_source_type text,
    -- 'reddit' | 'twitter' | 'facebook' | 'rss' | 'tv_news' | 'admin' | 'citizen'
  add column if not exists upvotes int default 0,
  add column if not exists comment_count int default 0;

create index if not exists idx_incidents_tags on incidents using gin(tags);
create index if not exists idx_incidents_flair on incidents(flair);
create index if not exists idx_incidents_external_type on incidents(external_source_type);

-- Backfill: copy the existing single `category` into the tags array
-- for incidents that don't have any tags yet.
update incidents
   set tags = array[category]
 where (tags is null or tags = '{}'::text[])
   and category is not null;
