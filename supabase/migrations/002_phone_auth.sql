-- Make username nullable so profiles can be created without it
-- (phone OTP users set display_name + username on the create-profile screen)
alter table public.profiles
  alter column username drop not null;

-- Add a partial unique index that ignores nulls (Postgres handles this natively)
-- The existing unique constraint on username still applies for non-null values
