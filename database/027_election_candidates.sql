-- 027: candidate affidavit profiles (MyNeta/ADR) for Election Insights.
--
-- Sourced from myneta.info/TamilNadu2026 (ADR analysis of ECI nomination
-- affidavits): per candidate — declared criminal cases (COUNT, not a flag),
-- assets, liabilities, education, age, party. Joined to our alliance buckets and
-- booth votes so each AC page can show TVK / DMK+ / ADMK+ / NTK contestants with
-- their background. NOTE: criminal cases & assets are SELF-DECLARED in the
-- affidavit — the standard caveat applies (shown as "declared").

CREATE TABLE IF NOT EXISTS election_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ac_no           SMALLINT NOT NULL REFERENCES election_constituencies(ac_no),
    name            TEXT NOT NULL,
    party           TEXT,
    bucket          TEXT,                 -- TVK | DMK+ | ADMK+ | NTK | OTHERS
    age             SMALLINT,
    education       TEXT,
    criminal_cases  SMALLINT,             -- declared count (0,1,2,...)
    assets_text     TEXT,                 -- "Rs 3,66,94,500 ~ 3 Cr"
    assets_rs       BIGINT,               -- parsed to rupees for sorting
    liabilities_rs  BIGINT,
    myneta_id       INTEGER,              -- for the candidate's photo / detail page
    photo_url       TEXT,
    is_lead         BOOLEAN DEFAULT FALSE,-- the bucket's main contestant in the AC
    result          TEXT,                 -- won | lost
    UNIQUE (ac_no, myneta_id)
);
CREATE INDEX IF NOT EXISTS idx_cand_ac     ON election_candidates (ac_no);
CREATE INDEX IF NOT EXISTS idx_cand_bucket ON election_candidates (bucket);
CREATE INDEX IF NOT EXISTS idx_cand_crime  ON election_candidates (criminal_cases DESC);

ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY elec_cand_read  ON election_candidates FOR SELECT USING (true);
CREATE POLICY elec_cand_admin ON election_candidates FOR ALL USING (auth.role() = 'service_role');
