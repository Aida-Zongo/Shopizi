const { Router } = require('express');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { getIO } = require('../../realtime/socket');

const router = Router();

router.get('/rooms', authenticate, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT cr.*, crp.unread_count, crp.last_read_at, s.name AS shop_name,
            (SELECT COUNT(*) FROM chat_room_participants WHERE room_id = cr.id) AS participant_count
     FROM chat_rooms cr
     JOIN chat_room_participants crp ON cr.id = crp.room_id
     LEFT JOIN shops s ON s.id = cr.shop_id
     WHERE crp.user_id = $1 AND cr.is_active = true
     ORDER BY cr.last_message_at DESC NULLS LAST`,
    [req.user.userId]
  );
  return successResponse(res, r.rows);
}));

router.post('/rooms', authenticate, asyncHandler(async (req, res) => {
  const { type, shop_id, product_id, title, other_user_id } = req.body;
  const roomType = type || 'customer_merchant';

  // Try to find if a direct room already exists
  if (['customer_merchant', 'driver_merchant', 'driver_customer'].includes(roomType)) {
    let targetUserId = other_user_id;
    if (shop_id && !targetUserId) {
      const shopOwnerRes = await query('SELECT user_id FROM shops WHERE id = $1', [shop_id]);
      if (shopOwnerRes.rows.length > 0) {
        targetUserId = shopOwnerRes.rows[0].user_id;
      }
    }

    if (targetUserId) {
      const existingRoomRes = await query(
        `SELECT cr.* 
         FROM chat_rooms cr
         JOIN chat_room_participants p1 ON cr.id = p1.room_id
         JOIN chat_room_participants p2 ON cr.id = p2.room_id
         WHERE cr.type = $1 AND p1.user_id = $2 AND p2.user_id = $3 AND cr.is_active = true`,
        [roomType, req.user.userId, targetUserId]
      );
      if (existingRoomRes.rows.length > 0) {
        return successResponse(res, existingRoomRes.rows[0]);
      }
    }
  }

  const roomR = await query(
    `INSERT INTO chat_rooms (type, product_id, shop_id, title)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [roomType, product_id || null, shop_id || null, title || null]
  );
  const roomId = roomR.rows[0].id;
  
  // Add the creator
  await query(
    `INSERT INTO chat_room_participants (room_id, user_id, role) VALUES ($1, $2, 'owner')`,
    [roomId, req.user.userId]
  );

  // Add target user if passed
  if (other_user_id) {
    await query(
      `INSERT INTO chat_room_participants (room_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
      [roomId, other_user_id]
    );
  }

  // Add shop owner (merchant) if shop_id passed
  if (shop_id) {
    const shopOwnerRes = await query('SELECT user_id FROM shops WHERE id = $1', [shop_id]);
    if (shopOwnerRes.rows.length > 0) {
      const merchantUserId = shopOwnerRes.rows[0].user_id;
      if (merchantUserId !== req.user.userId) {
        await query(
          `INSERT INTO chat_room_participants (room_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
          [roomId, merchantUserId]
        );
      }
    }
  }

  return successResponse(res, roomR.rows[0], null, 201);
}));

router.get('/rooms/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  const r = await query(
    `SELECT cm.*, u.full_name AS sender_name
     FROM chat_messages cm
     LEFT JOIN users u ON cm.sender_id = u.id
     WHERE cm.room_id = $1 AND cm.deleted_at IS NULL
     ORDER BY cm.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.params.id, limit, offset]
  );
  return successResponse(res, r.rows);
}));

router.post('/rooms/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const { content, content_type } = req.body;
  const r = await query(
    `INSERT INTO chat_messages (room_id, sender_id, content, content_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.params.id, req.user.userId, content, content_type || 'text']
  );
  await query(
    `UPDATE chat_rooms SET last_message = $1, last_message_at = NOW(), last_message_user_id = $2 WHERE id = $3`,
    [content, req.user.userId, req.params.id]
  );
  await query(
    `UPDATE chat_room_participants SET unread_count = unread_count + 1 WHERE room_id = $1 AND user_id != $2`,
    [req.params.id, req.user.userId]
  );

  const message = r.rows[0];
  const senderRes = await query('SELECT full_name FROM users WHERE id = $1', [req.user.userId]);
  const payload = { ...message, sender_name: senderRes.rows[0]?.full_name || null };
  getIO().to('room:' + req.params.id).emit('chat:message', payload);

  return successResponse(res, message, null, 201);
}));

router.put('/rooms/:id/read', authenticate, asyncHandler(async (req, res) => {
  await query(
    `UPDATE chat_room_participants SET unread_count = 0, last_read_at = NOW() WHERE room_id = $1 AND user_id = $2`,
    [req.params.id, req.user.userId]
  );
  return successResponse(res, { success: true });
}));

module.exports = router;
