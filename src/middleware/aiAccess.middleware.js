import Subscription from '../modules/subscriptions/subscription.model.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../constants/roles.js';
import { env } from '../config/env.js';
export async function requireAiAccess(req,_res,next){
  if ([ROLES.ADMIN,ROLES.SUPER_ADMIN].includes(req.user?.role)) return next();
  const subscription=await Subscription.findOne({user:req.user._id}).populate('plan');
  if(!subscription)return next(new ApiError(403,'An active subscription is required to use AI Assistant'));
  const now=new Date();
  if(subscription.status==='trial')return next(new ApiError(403,`AI Assistant is not available during the ${env.trialDays}-day free trial. You can upgrade at any time to unlock it.`,{code:'AI_TRIAL_LOCKED'}));
  if(subscription.status!=='active'||(subscription.currentPeriodEnd&&subscription.currentPeriodEnd<now))return next(new ApiError(403,'Your subscription is not active. Renew or choose a plan to use AI Assistant.',{code:'AI_SUBSCRIPTION_REQUIRED'}));
  if(!subscription.plan?.aiEnabled)return next(new ApiError(403,'Your current plan does not include AI Assistant.',{code:'AI_NOT_INCLUDED'}));
  req.subscription=subscription; next();
}
