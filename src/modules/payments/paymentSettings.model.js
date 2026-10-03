import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, default: 'easypaisa', unique: true },
  enabled: { type: Boolean, default: true },
  accountTitle: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  qrImage: { type: String, default: '' },
  instructions: { type: String, default: 'Scan the QR, complete payment in EasyPaisa, then upload your payment screenshot.' }
}, { timestamps: true });
export default mongoose.model('PaymentSettings', schema);
