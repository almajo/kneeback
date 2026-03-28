-- Landing page internal testing waitlist
-- Stores email addresses of users who signed up to be notified when
-- KneeBack opens for public testing on Google Play.
-- Retention: delete all rows 30 days after public Play Store launch.

CREATE TABLE waitlist (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text        NOT NULL UNIQUE,
  consent_given boolean    NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- RLS enabled — no public policies. Only service role key (used by edge function) can write.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE waitlist IS 'Landing page internal testing waitlist. Legal basis: Art. 6(1)(a) GDPR consent. Retention: delete 30 days after public Play Store launch.';
