import mongoose from 'mongoose';

const productCardSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    brand: String,
    images: [String],
    price: Number,
    originalPrice: Number,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: String,
      default: null,
    },
    senderType: {
      type: String,
      enum: ['user', 'bot', 'admin', 'system'],
      required: true,
    },
    // Compatibility getter/setter for legacy code expecting `sender`
    sender: {
      type: String,
      enum: ['User', 'Admin', 'AI', 'System'],
    },
    content: {
      type: String,
      required: true,
    },
    // Compatibility getter/setter for legacy code expecting `text`
    text: {
      type: String,
    },
    messageType: {
      type: String,
      enum: ['text', 'product'],
      default: 'text',
    },
    products: {
      type: [productCardSchema],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure sender and text fields stay in sync for backward compatibility
messageSchema.pre('save', function (next) {
    if (this.senderType) {
      if (this.senderType === 'user') this.sender = 'User';
      else if (this.senderType === 'bot') this.sender = 'AI';
      else if (this.senderType === 'admin') this.sender = 'Admin';
      else if (this.senderType === 'system') this.sender = 'System';
    } else if (this.sender) {
      if (this.sender === 'User') this.senderType = 'user';
      else if (this.sender === 'AI') this.senderType = 'bot';
      else if (this.sender === 'Admin') this.senderType = 'admin';
      else if (this.sender === 'System') this.senderType = 'system';
    }

  if (this.content && !this.text) {
    this.text = this.content;
  } else if (this.text && !this.content) {
    this.content = this.text;
  }

  next();
});

const Message = mongoose.model('Message', messageSchema);

export default Message;