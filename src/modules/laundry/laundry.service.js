import Laundry from './laundry.model.js';
import Item from '../items/item.model.js';
import ApiError from '../../utils/ApiError.js';
export const list=(owner)=>Laundry.find({owner}).populate('item').sort({createdAt:-1});
export async function add(owner,{itemId,notes}){
 const item=await Item.findOne({_id:itemId,owner}); if(!item) throw new ApiError(404,'Item not found');
 item.status='laundry'; await item.save();
 const existing=await Laundry.findOne({owner,item:itemId,status:{$ne:'ready'}}); if(existing) return existing;
 return Laundry.create({owner,item:itemId,notes});
}
export async function setStatus(owner,id,status){
 const record=await Laundry.findOne({_id:id,owner}); if(!record) throw new ApiError(404,'Laundry record not found');
 record.status=status; if(status==='ready'){record.completedAt=new Date(); await Item.findOneAndUpdate({_id:record.item,owner},{status:'ready'});} await record.save(); return record.populate('item');
}
export async function remove(owner,id){const r=await Laundry.findOneAndDelete({_id:id,owner});if(!r)throw new ApiError(404,'Laundry record not found');return r;}
