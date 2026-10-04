import Subscription from '../modules/subscriptions/subscription.model.js';
import User from '../modules/users/user.model.js';

import ApiError from './ApiError.js';

import { ROLES } from '../constants/roles.js';


/* ======================================================
   RESOLVE BILLING OWNER

   OWNER / ADMIN:
   → own subscription

   MEMBER:
   → accountOwner subscription
====================================================== */

export async function resolveBillingUserId(
  userId,
  role
) {
  if (role !== ROLES.MEMBER) {
    return userId;
  }

  const member =
    await User.findById(userId)
      .select('accountOwner');

  if (!member?.accountOwner) {
    throw new ApiError(
      403,
      'This member account is not linked to a household owner.',
      {
        code:
          'HOUSEHOLD_OWNER_NOT_FOUND'
      }
    );
  }

  return member.accountOwner;
}


/* ======================================================
   GET SUBSCRIPTION ACCESS
====================================================== */

export async function getAccess(
  userId,
  role
) {
  /* ====================================================
     SUPER ADMIN
  ==================================================== */

  if (
    role ===
    ROLES.SUPER_ADMIN
  ) {
    return {
      unlimited: true,

      sourceUserId:
        userId,

      subscription:
        null,

      plan: {
        limits: {
          members:
            -1,

          items:
            -1,

          collections:
            -1
        },

        aiEnabled:
          true,

        code:
          'unlimited',

        name:
          'Unlimited'
      }
    };
  }


  /* ====================================================
     BILLING OWNER
  ==================================================== */

  const sourceUserId =
    await resolveBillingUserId(
      userId,
      role
    );


  const subscription =
    await Subscription.findOne({
      user:
        sourceUserId
    }).populate('plan');


  if (
    !subscription?.plan
  ) {
    throw new ApiError(
      403,
      role === ROLES.MEMBER
        ? 'The household owner does not have an active subscription.'
        : 'Subscription not found.',
      {
        code:
          'SUBSCRIPTION_NOT_FOUND'
      }
    );
  }


  /* ====================================================
     STATUS CHECK
  ==================================================== */

  const allowedStatuses = [
    'trial',
    'active'
  ];


  if (
    !allowedStatuses.includes(
      subscription.status
    )
  ) {
    throw new ApiError(
      403,
      role === ROLES.MEMBER
        ? 'Your household plan is not active. Please ask the account owner to renew or choose a plan.'
        : 'Your subscription is not active. Please renew or choose a plan.',
      {
        code:
          'SUBSCRIPTION_INACTIVE'
      }
    );
  }


  /* ====================================================
     EXPIRY CHECK

     trial → trialEndsAt
     active → currentPeriodEnd
  ==================================================== */

  const now =
    new Date();


  if (
    subscription.status ===
      'trial' &&
    subscription.trialEndsAt &&
    new Date(
      subscription.trialEndsAt
    ) < now
  ) {
    throw new ApiError(
      403,
      'Your free trial has expired. Upgrade to continue.',
      {
        code:
          'TRIAL_EXPIRED'
      }
    );
  }


  if (
    subscription.status ===
      'active' &&
    subscription.currentPeriodEnd &&
    new Date(
      subscription.currentPeriodEnd
    ) < now
  ) {
    throw new ApiError(
      403,
      role === ROLES.MEMBER
        ? 'The household owner’s subscription has expired.'
        : 'Your subscription has expired.',
      {
        code:
          'SUBSCRIPTION_EXPIRED'
      }
    );
  }


  /* ====================================================
     PLAN ACTIVE CHECK
  ==================================================== */

  if (
    subscription.plan.active ===
    false
  ) {
    throw new ApiError(
      403,
      'This subscription plan is no longer available.',
      {
        code:
          'PLAN_INACTIVE'
      }
    );
  }


  return {
    unlimited:
      false,

    sourceUserId,

    subscription,

    plan:
      subscription.plan
  };
}


/* ======================================================
   PLAN LIMIT CHECK
====================================================== */

export function assertLimit(
  plan,
  key,
  currentCount
) {
  const rawLimit =
    plan?.limits?.[key];


  if (
    rawLimit === undefined ||
    rawLimit === null
  ) {
    throw new ApiError(
      500,
      `Plan limit configuration is missing for ${key}.`,
      {
        code:
          'PLAN_LIMIT_CONFIG_MISSING',
        resource:
          key
      }
    );
  }


  const limit =
    Number(rawLimit);


  if (
    Number.isNaN(limit)
  ) {
    throw new ApiError(
      500,
      `Invalid plan limit configuration for ${key}.`,
      {
        code:
          'PLAN_LIMIT_CONFIG_INVALID',
        resource:
          key
      }
    );
  }


  /* Unlimited */
  if (limit === -1) {
    return;
  }


  if (
    currentCount >=
    limit
  ) {
    throw new ApiError(
      403,
      `${plan?.name || 'Current plan'} limit reached: maximum ${limit} ${key}. Upgrade your plan to add more.`,
      {
        code:
          'PLAN_LIMIT_REACHED',

        resource:
          key,

        limit
      }
    );
  }
}