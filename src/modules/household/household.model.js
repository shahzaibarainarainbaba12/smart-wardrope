import mongoose from 'mongoose';
const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  relation: String,
  gender: String,
  avatar: String,
  isActive: { type: Boolean, default: true }
}, { _id: true, timestamps: true });
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: 'My Household' },
  members: [memberSchema]
}, { timestamps: true });
export default mongoose.model('Household', schema);
