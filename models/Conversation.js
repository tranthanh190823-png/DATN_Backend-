import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participantId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    participantName: {
      type: String,
      default: 'Khách hàng',
    },
    phone: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['bot', 'waiting_human', 'human', 'closed'],
      default: 'bot',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadByAdmin: {
      type: Number,
      default: 0,
    },
    unreadByUser: {
      type: Number,
      default: 0,
    },
    // Backwards compatibility alias
    chatMode: {
      type: String,
      enum: ['ai', 'admin'],
      default: 'ai',
    },
    needsHuman: {
      type: Boolean,
      default: false,
    },
    // Đánh giá mức độ hài lòng của User sau khi kết thúc hội thoại
    rating: {
      type: Number,
      default: null,
    },
    ratingAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
