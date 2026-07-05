-- 027: Ajouter le role 'driver' dans la table users
-- Le CHECK constraint existant ne permet pas 'driver', on le modifie.

DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
    END LOOP;
END $$;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('merchant', 'admin', 'driver'));
