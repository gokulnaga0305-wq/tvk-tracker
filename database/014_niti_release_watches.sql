-- Append-only addition of NITI Aayog watch URLs for users who applied
-- migration 011 before the NITI rows existed in the seed block.
-- Idempotent — on-conflict-do-nothing skips when already present.

insert into economic_release_watches (label, url, publisher, related_metrics, cadence_days, notes) values
  ('NITI Aayog division reports',
   'https://www.niti.gov.in/publications/division-reports',
   'NITI Aayog',
   ARRAY['debt_to_gsdp','fiscal_deficit_gsdp','primary_deficit_gsdp','revenue_deficit_gsdp','own_tax_revenue_gsdp','social_spend_share'],
   180,
   'NITI publishes the TN Macro & Fiscal Landscape report periodically. Watch for updated editions with TVK-era numbers.'),
  ('NITI Aayog Tamil Nadu taxonomy page',
   'https://niti.gov.in/taxonomy/term/392',
   'NITI Aayog',
   ARRAY['debt_to_gsdp','fiscal_deficit_gsdp'],
   90,
   'Aggregated index of NITI publications tagged Tamil Nadu — covers SDG India Index, EPI, governance reports.')
on conflict (url) do nothing;
