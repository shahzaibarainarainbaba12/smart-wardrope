import Payment from './payment.model.js';
import PaymentMethod from './paymentMethod.model.js';
import PaymentSettings from './paymentSettings.model.js';
import Plan from '../plans/plan.model.js';
import Subscription from '../subscriptions/subscription.model.js';
import ApiError from '../../utils/ApiError.js';
import { ROLES } from '../../constants/roles.js';

const now = () => new Date();
async function currentSubscription(userId){
  return Subscription.findOne({user:userId}).populate('plan');
}
function hasLivePaid(sub){
  if(!sub || sub.status!=='active' || sub.billingCycle==='trial') return false;
  return !sub.currentPeriodEnd || sub.currentPeriodEnd > now();
}
async function assertCanBuy(userId,role){
  if(role===ROLES.SUPER_ADMIN) throw new ApiError(409,'Super Admin already has Unlimited access and does not need to purchase a plan.');
  if(role===ROLES.MEMBER) throw new ApiError(403,'Household members share the owner’s plan. Only the account owner can change or purchase a plan.');
  const sub=await currentSubscription(userId);
  if(hasLivePaid(sub)) throw new ApiError(409,`Your ${sub.plan?.name||'paid'} plan is already active until ${sub.currentPeriodEnd?.toISOString?.()||'the current period ends'}. You can choose another plan after it expires.`);
  return sub;
}

async function migrateLegacyEasyPaisa(){
  const count=await PaymentMethod.countDocuments(); if(count) return;
  const legacy=await PaymentSettings.findOne({key:'easypaisa'});
  if(legacy?.enabled && (legacy.qrImage||legacy.accountNumber)){
    await PaymentMethod.findOneAndUpdate({provider:'easypaisa'},{$setOnInsert:{provider:'easypaisa',name:'EasyPaisa',enabled:true,accountTitle:legacy.accountTitle||'',accountNumber:legacy.accountNumber||'',qrImage:legacy.qrImage||'',instructions:legacy.instructions||''}},{upsert:true,new:true});
  }
}
export async function listMethods(){await migrateLegacyEasyPaisa();return PaymentMethod.find({enabled:true}).sort({sortOrder:1,name:1});}
export async function adminMethods(){await migrateLegacyEasyPaisa();return PaymentMethod.find().sort({sortOrder:1,name:1});}
export async function createMethod(data,file){
  const patch={...data}; if(file)patch.qrImage=`/uploads/${file.filename}`;
  if(typeof patch.enabled==='string')patch.enabled=patch.enabled==='true';
  patch.provider=String(patch.provider||patch.name||'').trim().toLowerCase().replace(/\s+/g,'-');
  if(!patch.provider||!patch.name)throw new ApiError(400,'Method name is required');
  return PaymentMethod.create(patch);
}
export async function updateMethod(id,data,file){
  const patch={...data}; if(file)patch.qrImage=`/uploads/${file.filename}`;
  if(typeof patch.enabled==='string')patch.enabled=patch.enabled==='true';
  const item=await PaymentMethod.findByIdAndUpdate(id,{$set:patch},{new:true,runValidators:true});
  if(!item)throw new ApiError(404,'Payment method not found'); return item;
}
export async function removeMethod(id){const item=await PaymentMethod.findByIdAndDelete(id);if(!item)throw new ApiError(404,'Payment method not found');return item;}

// Backward-compatible EasyPaisa config endpoints.
export async function getConfig(){return PaymentSettings.findOneAndUpdate({key:'easypaisa'},{$setOnInsert:{key:'easypaisa'}},{upsert:true,new:true});}
export async function updateConfig(data,file){const patch={...data};if(file)patch.qrImage=`/uploads/${file.filename}`;if(typeof patch.enabled==='string')patch.enabled=patch.enabled==='true';return PaymentSettings.findOneAndUpdate({key:'easypaisa'},{$set:patch},{upsert:true,new:true,runValidators:true});}

export async function checkout(userId,role,planCode){
  await assertCanBuy(userId,role);
  const plan=await Plan.findOne({code:planCode,active:true});
  if(!plan||plan.code==='trial')throw new ApiError(404,'Paid plan not found');
  return{plan,billingCycle:'monthly',amount:plan.monthlyPrice,currency:'PKR',methods:await listMethods()};
}
export async function submit(userId,role,data,file){
  await assertCanBuy(userId,role);
  const plan=await Plan.findOne({code:data.planCode,active:true});
  if(!plan||plan.code==='trial')throw new ApiError(404,'Paid plan not found');
  if(!file)throw new ApiError(400,'Payment screenshot is required');
  const pending=await Payment.findOne({user:userId,status:'pending'});
  if(pending)throw new ApiError(409,'You already have a payment waiting for approval. Please wait for Super Admin review.');
  let method=null;
  if(data.paymentMethodId && data.paymentMethodId!=='legacy-easypaisa') method=await PaymentMethod.findOne({_id:data.paymentMethodId,enabled:true});
  if(!method && data.paymentMethodId!=='legacy-easypaisa') throw new ApiError(400,'Select a valid payment method');
  const provider=method?.provider||'easypaisa';
  return Payment.create({user:userId,plan:plan._id,paymentMethod:method?._id,billingCycle:'monthly',amount:plan.monthlyPrice,currency:'PKR',provider,senderAccount:data.senderAccount,transactionId:data.transactionId,proofImage:`/uploads/${file.filename}`});
}
export async function mine(userId){return Payment.find({user:userId}).populate('plan paymentMethod reviewedBy','name code email provider accountTitle').sort({createdAt:-1});}
export async function pending(){return Payment.find({status:'pending'}).populate('plan user paymentMethod','name email code monthlyPrice provider accountTitle accountNumber').sort({createdAt:1});}
export async function review(adminId,id,status,adminNote=''){
  if(!['approved','rejected'].includes(status))throw new ApiError(400,'Invalid payment status');
  const p=await Payment.findById(id).populate('plan'); if(!p)throw new ApiError(404,'Payment not found');
  if(p.status!=='pending')throw new ApiError(409,`Payment is already ${p.status}`);
  if(status==='approved'){
    const sub=await currentSubscription(p.user);
    if(hasLivePaid(sub)) throw new ApiError(409,`This user already has an active ${sub.plan?.name||'paid'} plan. Wait until the current plan expires before approving another one.`);
  }
  p.status=status;p.adminNote=adminNote;p.reviewedBy=adminId;p.reviewedAt=now();await p.save();
  if(status==='approved'){
    const start=now();const end=new Date(start);end.setMonth(end.getMonth()+1);
    await Subscription.findOneAndUpdate({user:p.user},{$set:{plan:p.plan._id,status:'active',billingCycle:'monthly',currentPeriodStart:start,currentPeriodEnd:end,provider:`manual_${p.provider}`,providerSubscriptionId:p._id.toString(),trialStartedAt:null,trialEndsAt:null}},{upsert:true,new:true,setDefaultsOnInsert:true});
  }
  return Payment.findById(p._id).populate('plan paymentMethod reviewedBy','name code email provider');
}
