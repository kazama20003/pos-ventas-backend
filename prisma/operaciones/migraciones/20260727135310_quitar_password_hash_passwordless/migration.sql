-- Passwordless auth: identities authenticate via Google (sujetoExterno),
-- no local password is stored anymore.
ALTER TABLE "UserIdentity" DROP COLUMN "passwordHash";
