-- ============================================
-- Migration: 041_create_review_replies.sql
-- Description: Fil de discussion entre clients sous chaque avis. Un client
-- repond a l'avis d'un autre pour discuter/critiquer le produit. Une reponse
-- n'a pas de note (contrairement a un avis) : c'est un simple message.
-- ============================================

CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  -- Auteur (si connecte)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Nom affiche si reponse anonyme
  anonymous_name VARCHAR(100) DEFAULT NULL,
  content TEXT NOT NULL,
  -- Statut de moderation (aligne sur reviews ; approuve par defaut)
  status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_replies_review ON review_replies(review_id, created_at);
CREATE INDEX idx_review_replies_user ON review_replies(user_id);
