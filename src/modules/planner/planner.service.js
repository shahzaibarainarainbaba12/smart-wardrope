import PlannerEvent from './planner.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
export async function list(userId,q={}){ const {page,limit,skip}=getPagination(q); const filter={ owner:userId }; if(q.search) filter.name={$regex:q.search,$options:'i'}; const [items,total]=await Promise.all([PlannerEvent.find(filter).skip(skip).limit(limit).sort({createdAt:-1}),PlannerEvent.countDocuments(filter)]); return {items,page,limit,total,pages:Math.ceil(total/limit)}; }
export async function getOne(userId,id){ const item=await PlannerEvent.findOne({_id:id,owner:userId}); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function create(userId,data){ return PlannerEvent.create({...data,owner:userId}); }
export async function update(userId,id,data){ const item=await PlannerEvent.findOneAndUpdate({_id:id,owner:userId},{$set:data},{new:true,runValidators:true}); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function remove(userId,id){ const item=await PlannerEvent.findOneAndDelete({_id:id,owner:userId}); if(!item) throw new ApiError(404,'Not found'); return item; }
