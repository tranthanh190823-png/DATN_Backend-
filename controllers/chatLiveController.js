import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// @desc    Get all conversations for admin
// @route   GET /api/chat-live/conversations
// @access  Private/Admin
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chat-live/messages/:participantId
// @access  Public
export const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ participantId: req.params.participantId });
    if (!conversation) {
      return res.json([]);
    }
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    User rates their satisfaction after conversation ends
// @route   POST /api/chat-live/rate/:participantId
// @access  Public
export const rateConversation = async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Đánh giá phải là số nguyên từ 1 đến 5' });
    }

    const conversation = await Conversation.findOne({ participantId: req.params.participantId });
    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy hội thoại' });
    }

    conversation.rating = rating;
    conversation.ratingAt = new Date();
    await conversation.save();

    res.json({ success: true, rating: conversation.rating });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
