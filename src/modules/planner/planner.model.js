import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  location: String,
  occasion: String,
  mood: String,
  outfit: { type: mongoose.Schema.Types.ObjectId, ref: 'Outfit' },
  reminders: [{ minutesBefore: Number }],
  notes: String
}, { timestamps: true });
export default mongoose.model('PlannerEvent', schema);
