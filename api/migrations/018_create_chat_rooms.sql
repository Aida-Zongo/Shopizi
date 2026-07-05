-- ============================================
-- Migration: 018_create_chat_rooms.sql
-- Description: Salles de chat (conversations)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Type de conversation
  type VARCHAR(30) NOT NULL DEFAULT 'customer_merchant' CHECK (type IN (
    'customer_merchant',   -- Client <-> Commerçant
    'group_review',        -- Groupe d'avis sur un produit
    'support'              -- Support technique
  )),
  -- Référence au produit (pour chats liés à un produit)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  -- Référence au shop (pour commerçant)
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  -- Participants (pour groupes)
  participant_count INTEGER NOT NULL DEFAULT 0,
  -- Dernier message
  last_message TEXT DEFAULT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_message_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Métadonnées
  title VARCHAR(255) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_shop ON chat_rooms(shop_id);
CREATE INDEX idx_chat_rooms_product ON chat_rooms(product_id);
CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_last_msg ON chat_rooms(last_message_at DESC);

-- Table de liaison participants (permet plusieurs users par room)
CREATE TABLE IF NOT EXISTS chat_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Rôle dans la conversation
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  -- Notification non lues
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unicité pair
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_chat_participants_room ON chat_room_participants(room_id);
CREATE INDEX idx_chat_participants_user ON chat_room_participants(user_id);
