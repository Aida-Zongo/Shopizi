-- 028: Update chat rooms and messages constraints to support new types (driver, customer group, location)
ALTER TABLE chat_rooms DROP CONSTRAINT IF EXISTS chat_rooms_type_check;
ALTER TABLE chat_rooms ADD CONSTRAINT chat_rooms_type_check CHECK (type IN (
  'customer_merchant',
  'group_review',
  'support',
  'driver_merchant',
  'driver_customer',
  'customer_customer'
));

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_type_check CHECK (content_type IN (
  'text',
  'image',
  'file',
  'system',
  'location'
));
