import Plan from'./plan.model.js';import ApiError from'../../utils/ApiError.js';
export const list=()=>Plan.find({active:true}).sort({monthlyPrice:1});
export const create=(data)=>Plan.create(data);
export async function update(id,data){const x=await Plan.findByIdAndUpdate(id,{$set:data},{new:true,runValidators:true});if(!x)throw new ApiError(404,'Plan not found');return x;}
export async function remove(id){const x=await Plan.findByIdAndUpdate(id,{active:false},{new:true});if(!x)throw new ApiError(404,'Plan not found');return x;}
