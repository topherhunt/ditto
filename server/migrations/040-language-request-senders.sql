-- One row per signed-in sender and language pair, so repeats aren't counted twice. `sender` is a SHA-256 of the sender's users.public_id, never the id itself.
CREATE TABLE language_request_senders (
  sender TEXT NOT NULL,
  spoken TEXT NOT NULL,
  wanted TEXT NOT NULL,
  PRIMARY KEY (sender, spoken, wanted)
) STRICT;
