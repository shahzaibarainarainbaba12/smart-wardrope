import User from '../users/user.model.js';
import Profile from '../profiles/profile.model.js';
import Wardrobe from '../wardrobe/wardrobe.model.js';
import Household from '../household/household.model.js';
import Plan from '../plans/plan.model.js';
import Subscription from '../subscriptions/subscription.model.js';
import ApiError from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { ROLES } from '../../constants/roles.js';

const inList = (list,email) => list.includes(String(email||'').toLowerCase());
const isSuperAdminEmail = email => inList(env.superAdminEmails,email);
const isAdminEmail = email => inList(env.adminEmails,email);

async function grantPrivilegedEntitlement(user) {
  const superAdmin = isSuperAdminEmail(user.email);
  const admin = isAdminEmail(user.email);
  if (!superAdmin && !admin) return user;
  const role = superAdmin ? ROLES.SUPER_ADMIN : ROLES.ADMIN;
  if (user.role !== role) { user.role = role; await user.save(); }
  const paidPlan = await Plan.findOne({ code: superAdmin ? 'unlimited' : 'family', active: true });
  if (paidPlan) {
    const now = new Date(); const end = new Date('2099-12-31T23:59:59.000Z');
    await Subscription.findOneAndUpdate({ user: user._id }, { $set: { plan: paidPlan._id, status: 'active', billingCycle: 'monthly', currentPeriodStart: now, currentPeriodEnd: end, provider: superAdmin ? 'super_admin_grant' : 'admin_grant', trialStartedAt: null, trialEndsAt: null } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  return user;
}

export async function register(input) {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) throw new ApiError(409, 'Email already registered');
  const superAdmin = isSuperAdminEmail(email), admin = isAdminEmail(email);
  const role = superAdmin ? ROLES.SUPER_ADMIN : admin ? ROLES.ADMIN : ROLES.USER;
  const user = await User.create({ ...input, email, role, password: await hashPassword(input.password) });
  const trialPlan = await Plan.findOne({ code: 'trial', active: true });
  if (!trialPlan) throw new ApiError(500, 'Trial plan is not configured');
  const now = new Date(); const trialEndsAt = new Date(now.getTime() + env.trialDays * 86400000);
  await Promise.all([
    Profile.create({ user: user._id, displayName: user.name }),
    Wardrobe.create({ owner: user._id }),
    Household.create({ owner: user._id, members: [] }),
    role === ROLES.USER ? Subscription.create({ user: user._id, plan: trialPlan._id, status: 'trial', billingCycle: 'trial', trialStartedAt: now, trialEndsAt, currentPeriodStart: now, currentPeriodEnd: trialEndsAt }) : Promise.resolve()
  ]);
  if (role !== ROLES.USER) await grantPrivilegedEntitlement(user);
  return { token: signToken({ sub: user._id.toString(), role: user.role }), user: { id: user._id, name: user.name, email: user.email, role: user.role, accountOwner: user.accountOwner || null, relation: user.relation || '' }, trial: role===ROLES.USER?{endsAt:trialEndsAt,aiEnabled:false,days:env.trialDays}:null };
}

export async function login(input) {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');
  if (!user || !(await comparePassword(input.password, user.password))) throw new ApiError(401, 'Invalid email or password');
  await grantPrivilegedEntitlement(user);
  return { token: signToken({ sub: user._id.toString(), role: user.role }), user: { id: user._id, name: user.name, email: user.email, role: user.role, accountOwner: user.accountOwner || null, relation: user.relation || '' } };
}
