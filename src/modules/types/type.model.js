import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  image: String,
  icon: String,
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ owner: 1, name: 1 }, { unique: true });
export default mongoose.model('Type', schema);
