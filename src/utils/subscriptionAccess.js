import Subscription from '../modules/subscriptions/subscription.model.js';
import User from '../modules/users/user.model.js';
import ApiError from './ApiError.js';
import { ROLES } from '../constants/roles.js';

export async function resolveBillingUserId(userId, role) {
  if (role !== ROLES.MEMBER) return userId;
  const member = await User.findById(userId).select('accountOwner');
  if (!member?.accountOwner) throw new ApiError(403, 'This member account is not linked to a household owner.');
  return member.accountOwner;
}

export async function getAccess(userId, role) {
  if (role === ROLES.SUPER_ADMIN) return { unlimited: true, sourceUserId: userId, subscription: null, plan: { limits: {members:-1,items:-1,collections:-1}, aiEnabled:true, code:'unlimited', name:'Unlimited' } };
  const sourceUserId = await resolveBillingUserId(userId, role);
  const subscription = await Subscription.findOne({ user: sourceUserId }).populate('plan');
  if (!subscription?.plan) throw new ApiError(403, 'Subscription not found');
  const now = new Date();
  const active = ['trial','active'].includes(subscription.status) && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd >= now);
  if (!active) throw new ApiError(403, 'Your household plan is not active. Please ask the account owner to renew or choose a plan.');
  return { unlimited: false, sourceUserId, subscription, plan: subscription.plan };
}

export function assertLimit(plan, key, currentCount) {
  const limit = Number(plan?.limits?.[key] ?? 0);
  if (limit === -1) return;
  if (currentCount >= limit) throw new ApiError(403, `${plan?.name || 'Current plan'} limit reached: maximum ${limit} ${key}. Upgrade your plan to add more.`, { code: 'PLAN_LIMIT_REACHED', resource: key, limit });
}
