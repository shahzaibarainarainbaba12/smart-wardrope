import Subscription from './subscription.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { resolveBillingUserId } from '../../utils/subscriptionAccess.js';
export async function list(userId,q={},role){ const {page,limit,skip}=getPagination(q); const billingUserId=await resolveBillingUserId(userId,role); const filter={user:billingUserId}; const [items,total]=await Promise.all([Subscription.find(filter).populate('plan').skip(skip).limit(limit).sort({createdAt:-1}),Subscription.countDocuments(filter)]); return {items,page,limit,total,pages:Math.ceil(total/limit),inherited: String(billingUserId)!==String(userId)}; }
export async function getOne(userId,id,role){ const billingUserId=await resolveBillingUserId(userId,role); const item=await Subscription.findOne({_id:id,user:billingUserId}).populate('plan'); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function create(userId,data){ return Subscription.create({...data,user:userId}); }
export async function update(userId,id,data){ const item=await Subscription.findOneAndUpdate({_id:id,user:userId},{$set:data},{new:true,runValidators:true}); if(!item) throw new ApiError(404,'Not found'); return item; }
export async function remove(userId,id){ const item=await Subscription.findOneAndDelete({_id:id,user:userId}); if(!item) throw new ApiError(404,'Not found'); return item; }
