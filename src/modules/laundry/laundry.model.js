import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  status: { type: String, enum: ['waiting','washing','drying','ready'], default: 'waiting' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  notes: String
}, { timestamps: true });
export default mongoose.model('Laundry', schema);
