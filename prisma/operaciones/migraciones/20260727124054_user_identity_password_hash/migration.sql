-- Nullable password hash for local (non-federated) identities.
ALTER TABLE "UserIdentity" ADD COLUMN "passwordHash" TEXT;
