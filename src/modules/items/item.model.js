import mongoose from 'mongoose';
import { ITEM_STATUS } from '../../constants/itemStatus.js';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  householdMemberId: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true, trim: true },
  type: { type: mongoose.Schema.Types.ObjectId, ref: 'Type', required: true },
  subCategory: String,
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
  image: String,
  color: String,
  brand: String,
  size: String,
  season: [String],
  tags: [String],
  status: { type: String, enum: Object.values(ITEM_STATUS), default: ITEM_STATUS.READY },
  notes: String,
  wearCount: { type: Number, default: 0 },
  lastWornAt: Date
}, { timestamps: true });
export default mongoose.model('Item', schema);
