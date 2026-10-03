import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: { type: String, enum: ['trial','active','past_due','cancelled','expired'], default: 'trial' },
  billingCycle: { type: String, enum: ['monthly','yearly','trial'], default: 'trial' },
  trialStartedAt: Date,
  trialEndsAt: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  provider: { type: String, default: 'manual' },
  providerSubscriptionId: String
}, { timestamps: true });
export default mongoose.model('Subscription', schema);
