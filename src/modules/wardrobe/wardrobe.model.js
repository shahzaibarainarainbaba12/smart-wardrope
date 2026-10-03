import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: 'My Wardrobe' },
  defaultProfileId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });
export default mongoose.model('Wardrobe', schema);
