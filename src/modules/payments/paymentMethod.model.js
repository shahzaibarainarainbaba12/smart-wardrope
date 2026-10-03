import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  provider:{type:String,required:true,trim:true,lowercase:true},
  name:{type:String,required:true,trim:true},
  enabled:{type:Boolean,default:true},
  accountTitle:{type:String,default:''},
  accountNumber:{type:String,default:''},
  bankName:{type:String,default:''},
  iban:{type:String,default:''},
  qrImage:{type:String,default:''},
  instructions:{type:String,default:''},
  sortOrder:{type:Number,default:0}
},{timestamps:true});
schema.index({provider:1},{unique:true});
export default mongoose.model('PaymentMethod',schema);
