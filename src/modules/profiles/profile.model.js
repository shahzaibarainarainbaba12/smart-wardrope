import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: String,
  phone: String,
  gender: String,
  avatar: String,
  timezone: { type: String, default: 'Asia/Karachi' },
  preferences: { theme: { type: String, default: 'light' }, voiceGreeting: { type: Boolean, default: true } }
}, { timestamps: true });
export default mongoose.model('Profile', schema);
