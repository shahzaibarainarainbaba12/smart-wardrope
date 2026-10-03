import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  readAt: Date,
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });
export default mongoose.model('Notification', schema);
