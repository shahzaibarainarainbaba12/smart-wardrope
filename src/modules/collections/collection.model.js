import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  name: { type: String, required: true, trim: true },
  description: String,
  coverImage: String,
  icon: String,
  types: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Type', required: true }],
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ owner: 1, name: 1 }, { unique: true });
export default mongoose.model('Collection', schema);
