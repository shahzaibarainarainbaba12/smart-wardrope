import mongoose from 'mongoose';
import { ROLES } from '../../constants/roles.js';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  accountOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  relation: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('User', schema);
