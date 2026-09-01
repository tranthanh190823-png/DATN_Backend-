import express from 'express';
import { getConversations, getMessages, rateConversation } from '../controllers/chatLiveController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Temporarily bypass auth for testing, or use protect/admin if frontend sends token properly
router.route('/conversations').get(getConversations);
router.route('/messages/:participantId').get(getMessages);
router.route('/rate/:participantId').post(rateConversation);

export default router;
