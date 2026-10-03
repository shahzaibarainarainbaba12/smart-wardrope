import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  monthlyPrice: { type: Number, default: 0 },
  yearlyPrice: { type: Number, default: 0 },
  limits: {
    members: { type: Number, default: 1 },
    items: { type: Number, default: 50 },
    collections: { type: Number, default: 5 }
  },
  features: [String],
  aiEnabled: { type: Boolean, default: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model('Plan', schema);
