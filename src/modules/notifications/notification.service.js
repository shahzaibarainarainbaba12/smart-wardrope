import Notification from './notification.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
export async function list(userId,q={}){ const {page,limit,skip}=getPagination(q); const filter={ user:userId }; if(q.search) filter.name={$regex:q.search,$options:'i'}; const [items,total]=await Promise.all([Notification.find(filter).skip(skip).limit(limit).sort({createdAt:-1}),Notification.countDocuments(filter)]); return {items,page,limit,total,pages:Math.ceil(total/limit)}; }
export async function getOne(userId,id){ const item=await Notification.findOne({_id:id,user:userId}); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function create(userId,data){ return Notification.create({...data,user:userId}); }
export async function update(userId,id,data){ const item=await Notification.findOneAndUpdate({_id:id,user:userId},{$set:data},{new:true,runValidators:true}); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function remove(userId,id){ const item=await Notification.findOneAndDelete({_id:id,user:userId}); if(!item) throw new ApiError(404,'Not found'); return item; }
