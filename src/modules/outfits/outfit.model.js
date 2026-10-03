import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  occasion: String,
  mood: String,
  notes: String,
  isAiGenerated: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model('Outfit', schema);
