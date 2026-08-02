-- Lets specific accounts (the owner) bypass the monthly Must Watch cap
-- entirely, rather than just giving them a very large remaining count.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unlimited_must_watch boolean NOT NULL DEFAULT false;

UPDATE public.profiles
SET unlimited_must_watch = true
WHERE id = 'fe32a59e-84dc-423f-87a7-eaeefeb633ed';
