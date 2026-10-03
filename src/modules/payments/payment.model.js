import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  plan:{type:mongoose.Schema.Types.ObjectId,ref:'Plan',required:true},
  paymentMethod:{type:mongoose.Schema.Types.ObjectId,ref:'PaymentMethod'},
  billingCycle:{type:String,enum:['monthly'],default:'monthly'},
  amount:{type:Number,required:true},
  currency:{type:String,default:'PKR'},
  provider:{type:String,default:'easypaisa'},
  senderAccount:String,
  transactionId:String,
  proofImage:String,
  status:{type:String,enum:['pending','approved','rejected'],default:'pending',index:true},
  adminNote:String,
  reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
  reviewedAt:Date
},{timestamps:true});
export default mongoose.model('Payment',schema);
