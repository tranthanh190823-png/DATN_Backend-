import dotenv from 'dotenv';
dotenv.config();
import connectDB from './configs/db.js';
import User from './models/User.js';

async function main() {
  await connectDB();
  const usersWithToken = await User.find({ resetPasswordToken: { $exists: true, $ne: null } });
  console.log('Users with resetPasswordToken:', usersWithToken.map(u => ({
    email: u.email,
    token: u.resetPasswordToken,
    expire: u.resetPasswordExpire,
    expireType: typeof u.resetPasswordExpire,
    isExpirePast: u.resetPasswordExpire ? (u.resetPasswordExpire < new Date()) : 'N/A'
  })));

  const queryDateNow = await User.find({
    resetPasswordToken: { $exists: true, $ne: null },
    resetPasswordExpire: { $gt: Date.now() }
  });

  const queryNewDate = await User.find({
    resetPasswordToken: { $exists: true, $ne: null },
    resetPasswordExpire: { $gt: new Date() }
  });

  console.log('Query with Date.now(): count =', queryDateNow.length);
  console.log('Query with new Date(): count =', queryNewDate.length);

  process.exit(0);
}

main();
