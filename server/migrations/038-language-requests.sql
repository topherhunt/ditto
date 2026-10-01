-- Anonymous requests for a language (shared/api.ts REQUEST_LANGUAGES): a count per UTC day and language pair, never who asked.
CREATE TABLE language_requests (
  day TEXT NOT NULL,
  spoken TEXT NOT NULL,
  wanted TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (day, spoken, wanted)
) STRICT;
