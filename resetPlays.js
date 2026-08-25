import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://hoangnl0910:hoangnl0910@cluster0.z5i6y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection;
  await db.collection('users').updateMany({}, { $set: { dailyGamePlays: 0 } });
  console.log('Reset lượt chơi thành công!');
  process.exit(0);
};

run();
