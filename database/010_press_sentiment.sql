-- Press sentiment classification on incidents sourced from press-tier outlets.
--
-- Powers the press_sentiment_pressure component of the incumbency meter:
-- we tally how many press-tier articles in the last 14 days lean positive
-- vs negative toward the TVK government, and feed the ratio into the meter
-- as an additional pressure/boost component (cap +/- 10 pts).
--
-- Three values:
--   'positive_for_govt' — article reads as praise / favourable to TVK
--   'negative_for_govt' — article reads as criticism / unfavourable
--   'neutral'           — factual reporting with no clear lean
--
-- NULL means we haven't classified (legacy rows + non-press sources).

alter table incidents add column if not exists press_sentiment text
  check (press_sentiment in ('positive_for_govt', 'negative_for_govt', 'neutral'));

-- Composite index that supports the meter's "last N days press sentiment"
-- aggregate. Filter is incident_date + press_sentiment NOT NULL.
create index if not exists idx_incidents_press_sentiment_date
  on incidents (incident_date desc, press_sentiment)
  where press_sentiment is not null;
