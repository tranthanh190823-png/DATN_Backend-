import { Server } from 'socket.io';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { generateAIResponse } from './aiChatService.js';

const toAIMessages = (messages) =>
  messages
    .filter((m) => m.senderType === 'user' || m.senderType === 'bot' || m.sender === 'User' || m.sender === 'AI')
    .map((m) => ({
      role: (m.senderType === 'user' || m.sender === 'User') ? 'user' : 'assistant',
      content: m.content || m.text || '',
    }));

let io;

// ===== Helpers: emit chuẩn hóa, gửi ĐÚNG 1 LẦN tới đúng room =====
const conversationRoom = (participantId) => `conversation:${participantId}`;

// Emit 1 event tới đúng conversation room (+ admin room nếu cần)
const emitToConversation = (participantId, event, payload) => {
  const room = conversationRoom(participantId);
  io.to(room).emit(event, payload);
};

const emitToAdmins = (event, payload) => {
  io.to('admin').emit(event, payload);
};

const emitStatusChange = (participantId, status, extra = {}) => {
  const payload = { status, ...extra };
  emitToConversation(participantId, 'chat:status_change', payload);
};

const emitSystemMsg = (message, extra = {}) => {
  const payload = {
    _id: message._id,
    id: message._id,
    conversationId: message.conversationId,
    participantId: extra.participantId,
    senderType: message.senderType,
    sender: message.sender,
    content: message.content,
    text: message.text,
    createdAt: message.createdAt,
    products: message.products,
  };
  emitToConversation(extra.participantId, 'chat:new_message', payload);
  emitToConversation(extra.participantId, 'receive_message', payload);
  if (extra.statusChange) {
    emitStatusChange(extra.participantId, extra.statusChange.status, extra.statusChange.extra);
  }
  if (extra.toAdmins) {
    emitToAdmins('chat:update_conversation', extra.conversation);
    emitToAdmins('update_conversation', extra.conversation);
  }
  return payload;
};

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  const adminSockets = new Set();

  io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    // Join admin room
    socket.on('join_admin', () => {
      socket.data.role = 'admin';
      adminSockets.add(socket.id);
      socket.join('admin');
      io.emit('admin_status', { isOnline: adminSockets.size > 0 });
      console.log('Admin joined admin room');
    });

    // Join specific conversation room (Shopee Room Pattern: conversation:<conversationId>)
    socket.on('chat:join', async ({ conversationId, participantId, name, phone, email }) => {
      const targetId = conversationId || participantId;
      if (!targetId) return;

      const cleanId = targetId.replace('conversation:', '');
      socket.join(conversationRoom(cleanId));

      let conversation = await Conversation.findOne({ participantId: cleanId });

      if (!conversation) {
        conversation = await Conversation.create({
          participantId: cleanId,
          status: 'bot',
          participantName: name || 'Khách hàng',
          phone,
          email,
        });
        emitToAdmins('chat:new_conversation', conversation);
      }

      socket.emit('chat:conversation_data', conversation);
    });

    // Legacy join_conversation compatibility
    socket.on('join_conversation', async (participantId) => {
      if (!participantId) return;
      const cleanId = String(participantId).replace('conversation:', '');
      socket.join(conversationRoom(cleanId));

      socket.emit('admin_status', { isOnline: adminSockets.size > 0 });

      let conversation = await Conversation.findOne({ participantId: cleanId });
      if (!conversation) {
        conversation = await Conversation.create({ participantId: cleanId, status: 'bot' });
        emitToAdmins('chat:new_conversation', conversation);
      }
    });

    // Shared message processing logic
    const processMessage = async (data) => {
      try {
        const { conversationId, participantId, content, text, senderType, sender, chatMode: clientChatMode, name, phone, email } = data || {};
        const msgContent = content || text;
        if (!msgContent || !msgContent.trim()) return;

        const targetId = participantId || conversationId;
        if (!targetId) return;

        const cleanId = targetId.replace('conversation:', '');
        let conversation = await Conversation.findOne({
          $or: [{ _id: cleanId.match(/^[0-9a-fA-F]{24}$/) ? cleanId : null }, { participantId: cleanId }],
        });

        const actualSenderType = senderType || (sender === 'Admin' ? 'admin' : sender === 'AI' ? 'bot' : sender === 'System' ? 'system' : 'user');

        if (!conversation) {
          conversation = await Conversation.create({
            participantId: cleanId,
            status: actualSenderType === 'user' ? 'bot' : 'human',
            participantName: name || 'Khách hàng',
            phone,
            email,
          });
          emitToAdmins('chat:new_conversation', conversation);
        } else if (name || phone || email) {
          if (name) conversation.participantName = name;
          if (phone) conversation.phone = phone;
          if (email) conversation.email = email;
          await conversation.save();
        }

        const message = await Message.create({
          conversationId: conversation._id,
          senderType: actualSenderType,
          sender: actualSenderType === 'user' ? 'User' : (actualSenderType === 'admin') ? 'Admin' : actualSenderType === 'bot' ? 'AI' : 'System',
          content: msgContent,
          text: msgContent,
          messageType: 'text',
        });

        conversation.lastMessage = msgContent;
        conversation.lastMessageAt = new Date();

        if (actualSenderType === 'user') {
          conversation.unreadByAdmin = (conversation.unreadByAdmin || 0) + 1;
        } else if (actualSenderType === 'admin') {
          conversation.unreadByUser = (conversation.unreadByUser || 0) + 1;
          conversation.status = 'human';
          conversation.chatMode = 'admin';
        }
        await conversation.save();

        const messagePayload = {
          _id: message._id,
          id: message._id,
          conversationId: conversation._id,
          participantId: conversation.participantId,
          senderType: message.senderType,
          sender: message.sender,
          content: message.content,
          text: message.text,
          createdAt: message.createdAt,
          products: message.products,
        };

        // Emit đúng 1 lần tới conversation room + cập nhật admin
        emitToConversation(conversation.participantId, 'chat:new_message', messagePayload);
        emitToConversation(conversation.participantId, 'receive_message', messagePayload);
        emitToAdmins('chat:new_message', messagePayload);
        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);

        // Luồng chính: quyết định AI hay Admin dựa trên conversation.status
        // (không còn phụ thuộc chatMode từ client)
        let isBotMode = actualSenderType === 'user' && conversation.status === 'bot';

        if (actualSenderType === 'user' && conversation.status === 'closed') {
          // Hội thoại đã kết thúc -> tự mở lại AI (không tạo conversation mới)
          conversation.status = 'bot';
          conversation.chatMode = 'ai';
          conversation.assignedTo = null;
          conversation.needsHuman = false;
          await conversation.save();
          isBotMode = true;
        }

        if (actualSenderType === 'user' && isBotMode) {
          const pId = conversation.participantId || cleanId;
          emitToConversation(pId, 'chat:ai_typing', true);
          emitToConversation(pId, 'ai_typing', true);

          try {
            const history = await Message.find({ conversationId: conversation._id })
              .sort({ createdAt: 1 })
              .limit(12);

            let streamText = '';
            const onChunk = (chunkText) => {
              streamText += chunkText;
              const streamPayload = {
                conversationId: conversation._id,
                participantId: pId,
                senderType: 'bot',
                sender: 'AI',
                content: streamText,
                text: streamText,
                chunk: chunkText,
                isStreaming: true,
              };

              emitToConversation(pId, 'chat:stream_chunk', streamPayload);
              emitToConversation(pId, 'receive_stream_chunk', streamPayload);
            };

            const { text: aiText, products, requestHuman } = await generateAIResponse(
              toAIMessages(history),
              onChunk
            );

            const aiMessage = await Message.create({
              conversationId: conversation._id,
              senderType: 'bot',
              sender: 'AI',
              content: aiText,
              text: aiText,
              messageType: products && products.length > 0 ? 'product' : 'text',
              products: products && products.length > 0 ? products : undefined,
            });

            conversation.lastMessage = aiText;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            const aiPayload = {
              _id: aiMessage._id,
              id: aiMessage._id,
              conversationId: conversation._id,
              participantId: conversation.participantId,
              senderType: 'bot',
              sender: 'AI',
              content: aiMessage.content,
              text: aiMessage.text,
              createdAt: aiMessage.createdAt,
              products: aiMessage.products,
            };

            // Emit AI response đúng 1 lần
            emitToConversation(pId, 'chat:new_message', aiPayload);
            emitToConversation(pId, 'receive_message', aiPayload);
            emitToAdmins('chat:new_message', aiPayload);
            emitToAdmins('chat:update_conversation', conversation);
            emitToAdmins('update_conversation', conversation);

            if (requestHuman) {
              conversation.status = 'waiting_human';
              conversation.chatMode = 'admin';
              conversation.needsHuman = true;
              conversation.assignedTo = null;
              await conversation.save();

              const sysText = '⏳ Đang kết nối bạn với tư vấn viên…';
              const sysMsg = await Message.create({
                conversationId: conversation._id,
                senderType: 'system',
                sender: 'System',
                content: sysText,
                text: sysText,
              });

              emitSystemMsg(sysMsg, {
                participantId: conversation.participantId,
                statusChange: { status: 'waiting_human', extra: { conversation } },
              });
              emitToAdmins('chat:new_support_request', { conversationId: conversation._id, conversation });
              emitToAdmins('chat:update_conversation', conversation);
              emitToAdmins('update_conversation', conversation);
            }
          } catch (aiErr) {
            console.error('AI response error:', aiErr);
            const fallbackText = "Chào anh/chị! Trợ lý AI đang cập nhật dữ liệu. Anh/chị có thể thử nhắn lại hoặc bấm 'Gặp CSKH' để hỗ trợ trực tiếp nhé!";
            try {
              const fallbackMsg = await Message.create({
                conversationId: conversation._id,
                senderType: 'bot',
                sender: 'AI',
                content: fallbackText,
                text: fallbackText,
                messageType: 'text',
              });
              emitSystemMsg(fallbackMsg, { participantId: conversation.participantId });
            } catch (fErr) {
              console.error('Error sending socket AI fallback:', fErr);
            }
          } finally {
            emitToConversation(pId, 'chat:ai_typing', false);
            emitToConversation(pId, 'ai_typing', false);
          }
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    socket.on('chat:send_message', processMessage);
    socket.on('send_message', processMessage);

    // Event: User requests human admin support (chat:request_human)
    socket.on('chat:request_human', async ({ conversationId, participantId, name, phone, email }) => {
      try {
        const targetId = participantId || conversationId;
        if (!targetId) return;

        const cleanId = targetId.replace('conversation:', '');
        let conversation = await Conversation.findOne({ participantId: cleanId });

        if (!conversation) {
          conversation = await Conversation.create({
            participantId: cleanId,
            status: 'waiting_human',
            chatMode: 'admin',
            needsHuman: true,
            participantName: name || 'Khách hàng',
            phone,
            email,
          });
        } else {
          conversation.status = 'waiting_human';
          conversation.chatMode = 'admin';
          conversation.needsHuman = true;
          if (name) conversation.participantName = name;
          if (phone) conversation.phone = phone;
          if (email) conversation.email = email;
          await conversation.save();
        }

        const systemText = '⏳ Đã gửi yêu cầu kết nối với Admin CSKH. Vui lòng chờ trong giây lát!';

        const sysMsg = await Message.create({
          conversationId: conversation._id,
          senderType: 'system',
          sender: 'System',
          content: systemText,
          text: systemText,
        });

        conversation.lastMessage = systemText;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        emitSystemMsg(sysMsg, {
          participantId: conversation.participantId,
          statusChange: { status: 'waiting_human', extra: { conversation } },
        });
        emitToAdmins('chat:new_support_request', { conversationId: conversation._id, conversation });
        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);
      } catch (err) {
        console.error('Error requesting human:', err);
      }
    });

    // Event: Admin accepts conversation (chat:accept_conversation)
    socket.on('chat:accept_conversation', async ({ conversationId, participantId, adminId }) => {
      try {
        const targetId = participantId || conversationId;
        if (!targetId) return;

        const cleanId = targetId.replace('conversation:', '');
        let conversation = await Conversation.findOne({ participantId: cleanId });

        if (!conversation) return;

        const activeAdminId = adminId || null;
        conversation.status = 'human';
        conversation.chatMode = 'admin';
        conversation.assignedTo = activeAdminId;
        conversation.needsHuman = false;
        await conversation.save();

        const sysText = '👨‍💼 Admin CSKH đã nhận cuộc trò chuyện và sẵn sàng hỗ trợ bạn!';
        const sysMsg = await Message.create({
          conversationId: conversation._id,
          senderType: 'system',
          sender: 'System',
          content: sysText,
          text: sysText,
        });

        emitSystemMsg(sysMsg, {
          participantId: conversation.participantId,
          statusChange: { status: 'human', extra: { assignedTo: activeAdminId, conversation } },
        });
        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);
      } catch (err) {
        console.error('Error accepting conversation:', err);
      }
    });

    // Event: Admin sends message (chat:admin_message)
    const handleAdminMessage = async ({ conversationId, participantId, content, text }) => {
      const msgText = content || text;
      processMessage({
        conversationId,
        participantId,
        content: msgText,
        senderType: 'admin',
        sender: 'Admin',
      });
    };
    socket.on('chat:admin_message', handleAdminMessage);

    // Event: Close conversation (chat:close_conversation)
    socket.on('chat:close_conversation', async ({ conversationId, participantId }) => {
      try {
        const targetId = participantId || conversationId;
        if (!targetId) return;

        const cleanId = targetId.replace('conversation:', '');
        let conversation = await Conversation.findOne({ participantId: cleanId });

        if (!conversation) return;

        conversation.status = 'closed';
        await conversation.save();

        const sysText = '🔒 Cuộc trò chuyện đã kết thúc. Cảm ơn bạn đã liên hệ Aventis!';
        const sysMsg = await Message.create({
          conversationId: conversation._id,
          senderType: 'system',
          sender: 'System',
          content: sysText,
          text: sysText,
        });

        emitSystemMsg(sysMsg, {
          participantId: conversation.participantId,
          statusChange: { status: 'closed', extra: { conversation } },
        });
        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);
      } catch (err) {
        console.error('Error closing conversation:', err);
      }
    });

    // Event: Return conversation to bot (chat:return_to_bot)
    socket.on('chat:return_to_bot', async ({ conversationId, participantId }) => {
      try {
        const targetId = participantId || conversationId;
        if (!targetId) return;

        const cleanId = targetId.replace('conversation:', '');
        let conversation = await Conversation.findOne({ participantId: cleanId });

        if (!conversation) return;

        conversation.status = 'bot';
        conversation.chatMode = 'ai';
        conversation.assignedTo = null;
        conversation.needsHuman = false;
        await conversation.save();

        const sysText = '🤖 Cuộc trò chuyện đã được chuyển lại cho Trợ Lý AI Aventis.';
        const sysMsg = await Message.create({
          conversationId: conversation._id,
          senderType: 'system',
          sender: 'System',
          content: sysText,
          text: sysText,
        });

        emitSystemMsg(sysMsg, {
          participantId: conversation.participantId,
          statusChange: { status: 'bot', extra: { conversation } },
        });
        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);
      } catch (err) {
        console.error('Error returning to bot:', err);
      }
    });

    // Event: Mark conversation as read (clear unread counters)
    // readBy = 'Admin' => clear unreadByAdmin; 'User' => clear unreadByUser
    socket.on('mark_as_read', async ({ participantId, readBy }) => {
      try {
        const cleanId = String(participantId || '').replace('conversation:', '');
        if (!cleanId) return;
        const conversation = await Conversation.findOne({ participantId: cleanId });
        if (!conversation) return;

        if (readBy === 'User') {
          conversation.unreadByUser = 0;
        } else {
          conversation.unreadByAdmin = 0;
        }
        await conversation.save();

        emitToAdmins('chat:update_conversation', conversation);
        emitToAdmins('update_conversation', conversation);
      } catch (err) {
        console.error('Error marking conversation as read:', err);
      }
    });

    socket.on('typing', ({ senderRole, participantId }) => {
      const cleanId = String(participantId || '').replace('conversation:', '');
      if (senderRole === 'User' || senderRole === 'user') {
        // User đang gõ -> thông báo cho Admin
        io.to('admin').emit('client_typing', { participantId: cleanId });
      } else {
        // Admin đang gõ -> thông báo cho User
        emitToConversation(cleanId, 'admin_typing', { participantId: cleanId });
        emitToConversation(cleanId, 'chat:admin_typing', { participantId: cleanId });
      }
    });

    socket.on('stop_typing', ({ senderRole, participantId }) => {
      const cleanId = String(participantId || '').replace('conversation:', '');
      if (senderRole === 'User' || senderRole === 'user') {
        io.to('admin').emit('client_stop_typing', { participantId: cleanId });
      } else {
        emitToConversation(cleanId, 'admin_stop_typing', { participantId: cleanId });
        emitToConversation(cleanId, 'chat:admin_stop_typing', { participantId: cleanId });
      }
    });

    socket.on('disconnect', () => {
      adminSockets.delete(socket.id);
      io.emit('admin_status', { isOnline: adminSockets.size > 0 });
    });
  });
};
