-- Admin triage: decision, admin_note and triaged_at are set together; a dismissal also closes the report (resolved_at, resolution).
-- review and review_note are the admin's verdict on a proposed fix, recorded on a dev DB that mirrors production's reports.
ALTER TABLE reports ADD COLUMN decision TEXT CHECK (decision IN ('dismiss', 'fix_audio', 'fix_text', 'fix_translation', 'accept_answer', 'discuss'));
ALTER TABLE reports ADD COLUMN admin_note TEXT;
ALTER TABLE reports ADD COLUMN triaged_at TEXT;
ALTER TABLE reports ADD COLUMN resolution TEXT;
ALTER TABLE reports ADD COLUMN review TEXT CHECK (review IN ('approved', 'rejected'));
ALTER TABLE reports ADD COLUMN review_note TEXT;
