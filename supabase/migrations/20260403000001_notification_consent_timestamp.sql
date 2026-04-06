-- Record when the user granted push notification consent (Art. 6(1)(a) GDPR).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_consent_given_at TIMESTAMPTZ;
