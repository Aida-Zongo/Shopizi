-- ============================================
-- Migration: 043_promote_admin.sql
-- Description: Promeut un compte existant au role 'admin'. L'inscription
--              publique n'autorise que merchant/driver/customer (securite),
--              il n'existe donc aucun autre moyen de creer un administrateur.
--
--              Si le compte n'existe pas encore, la migration echoue
--              volontairement : le runner ne l'enregistre alors pas comme
--              appliquee et la rejoue au demarrage suivant. Il suffit de
--              s'inscrire avec cette adresse puis de redemarrer l'API.
--              La comparaison est insensible a la casse.
-- ============================================

DO $$
DECLARE
  target_email CONSTANT TEXT := 'belgehacking.444@gmail.com';
  promoted INTEGER;
BEGIN
  UPDATE users
     SET role = 'admin'
   WHERE LOWER(email) = LOWER(target_email);

  GET DIAGNOSTICS promoted = ROW_COUNT;

  IF promoted = 0 THEN
    RAISE EXCEPTION
      'Aucun compte avec l''email % : inscrivez-vous d''abord, la migration sera rejouee au prochain demarrage.',
      target_email;
  END IF;

  RAISE NOTICE 'Compte % promu administrateur.', target_email;
END $$;
