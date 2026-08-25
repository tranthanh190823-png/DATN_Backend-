import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing WITHOUT dns.setServers...');
console.log('URI in env:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then((conn) => {
    console.log('SUCCESS: CONNECTED TO HOST:', conn.connection.host);
    process.exit(0);
  })
  .catch((err) => {
    console.error('CONNECT ERROR:', err.message);
    process.exit(1);
  });
