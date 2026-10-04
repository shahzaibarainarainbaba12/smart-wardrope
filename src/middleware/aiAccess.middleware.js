import ApiError from '../utils/ApiError.js';

import {
  getAccess
} from '../utils/subscriptionAccess.js';

import {
  ROLES
} from '../constants/roles.js';

import {
  env
} from '../config/env.js';


/* ======================================================
   SMARTWARDROBE AI ACCESS

   ADMIN / SUPER ADMIN
   → direct access

   USER
   → own subscription

   MEMBER
   → accountOwner subscription

   TRIAL
   → AI locked

   ACTIVE PAID PLAN + aiEnabled
   → AI allowed
====================================================== */

export async function requireAiAccess(
  req,
  _res,
  next
) {
  try {
    /* ==================================================
       ADMIN BYPASS
    ================================================== */

    if (
      [
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN
      ].includes(req.user?.role)
    ) {
      return next();
    }


    if (!req.user?._id) {
      return next(
        new ApiError(
          401,
          'Authentication is required'
        )
      );
    }


    /* ==================================================
       GET ACCESS

       MEMBER automatically resolves:
       member → accountOwner → owner's subscription
    ================================================== */

    const access =
      await getAccess(
        req.user._id,
        req.user.role
      );


    const {
      subscription,
      plan,
      sourceUserId
    } = access;


    if (
      !subscription ||
      !plan
    ) {
      return next(
        new ApiError(
          403,
          'An active subscription is required to use AI Assistant.',
          {
            code:
              'AI_SUBSCRIPTION_REQUIRED'
          }
        )
      );
    }


    /* ==================================================
       FREE TRIAL AI LOCK
    ================================================== */

    if (
      subscription.status ===
      'trial'
    ) {
      return next(
        new ApiError(
          403,
          `AI Assistant is not available during the ${env.trialDays}-day free trial. Upgrade to a paid plan to unlock AI features.`,
          {
            code:
              'AI_TRIAL_LOCKED'
          }
        )
      );
    }


    /* ==================================================
       AI FEATURE CHECK
    ================================================== */

    if (
      plan.aiEnabled !== true
    ) {
      return next(
        new ApiError(
          403,
          'Your current plan does not include AI Assistant.',
          {
            code:
              'AI_NOT_INCLUDED'
          }
        )
      );
    }


    /* ==================================================
       ATTACH ACCESS CONTEXT

       req.user._id
       → wardrobe owner / logged-in member

       sourceUserId
       → subscription/billing owner
    ================================================== */

    req.subscription =
      subscription;

    req.subscriptionPlan =
      plan;

    req.subscriptionOwnerId =
      sourceUserId;

    req.aiAccess = {
      inherited:
        String(sourceUserId) !==
        String(req.user._id),

      sourceUserId
    };


    return next();
  } catch (error) {
    return next(error);
  }
}