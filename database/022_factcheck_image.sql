-- 022 — allow image uploads in the fact-check copilot.
--
-- The copilot can now ingest a screenshot/poster (e.g. a "BREAKING NEWS"
-- propaganda card): Gemini Vision OCRs the text + main claim, then the
-- existing date-gated, source-checking pipeline runs on the transcription.
-- This widens the input_type CHECK to accept 'image'. The base64 data: URL
-- is stored transiently in input_content and overwritten with '[image upload]'
-- once OCR'd, so the table stays lean.
--
-- Run in the Supabase SQL editor.

alter table factchecks
  drop constraint if exists factchecks_input_type_check;

alter table factchecks
  add constraint factchecks_input_type_check
  check (input_type in ('text', 'url', 'image'));
