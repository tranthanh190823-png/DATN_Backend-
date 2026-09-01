import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected to socket server! Socket ID:', socket.id);

  const testUser = 'test_guest_123';
  socket.emit('chat:join', { conversationId: testUser, participantId: testUser });
  socket.emit('join_conversation', testUser);

  socket.on('chat:stream_chunk', (data) => {
    console.log('🌊 Received stream chunk:', data.chunk);
  });

  socket.on('chat:new_message', (data) => {
    console.log('📩 Received new message:', data.sender, ':', data.content);
    if (data.sender === 'AI' || data.senderType === 'bot') {
      console.log('✅ AI chat flow SUCCESSFUL!');
      process.exit(0);
    }
  });

  console.log('Sending message: "Tư vấn nước hoa nam"...');
  socket.emit('chat:send_message', {
    conversationId: testUser,
    participantId: testUser,
    content: 'Tư vấn nước hoa nam',
    text: 'Tư vấn nước hoa nam',
    senderType: 'user',
    sender: 'User',
    chatMode: 'ai',
  });
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('⏱️ Socket test timed out after 10s');
  process.exit(1);
}, 10000);
