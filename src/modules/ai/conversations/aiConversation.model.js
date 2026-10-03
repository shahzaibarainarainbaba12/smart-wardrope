import mongoose from 'mongoose';
const messageSchema=new mongoose.Schema({role:{type:String,enum:['user','assistant','system'],required:true},text:{type:String,default:''},image:String,metadata:mongoose.Schema.Types.Mixed,createdAt:{type:Date,default:Date.now}},{_id:true});
const draftSchema=new mongoose.Schema({image:String,name:String,color:String,subCategory:String,notes:String,collectionIds:[{type:mongoose.Schema.Types.ObjectId,ref:'Collection'}],typeId:{type:mongoose.Schema.Types.ObjectId,ref:'Type'}},{_id:false});
const schema=new mongoose.Schema({owner:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},title:{type:String,default:'SmartWardrobe Assistant'},mode:{type:String,enum:['chat','add-item'],default:'chat'},step:{type:String,enum:['idle','awaiting_collection','awaiting_type','awaiting_details'],default:'idle'},itemDraft:{type:draftSchema,default:undefined},messages:[messageSchema],lastActiveAt:{type:Date,default:Date.now}},{timestamps:true});
schema.index({owner:1,lastActiveAt:-1});
export default mongoose.model('AIConversation',schema);
