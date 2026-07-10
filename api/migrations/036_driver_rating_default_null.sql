-- Un nouveau livreur ne doit pas démarrer avec 5.0 étoiles :
-- pas de note tant qu'il n'a reçu aucun avis.
ALTER TABLE delivery_drivers ALTER COLUMN avg_rating DROP DEFAULT;
UPDATE delivery_drivers SET avg_rating = NULL WHERE total_reviews = 0;
