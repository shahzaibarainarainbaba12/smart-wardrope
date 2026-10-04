import User from '../users/user.model.js';
import Profile from '../profiles/profile.model.js';
import Wardrobe from '../wardrobe/wardrobe.model.js';
import Household from '../household/household.model.js';
import Plan from '../plans/plan.model.js';
import Subscription from '../subscriptions/subscription.model.js';

import ApiError from '../../utils/ApiError.js';

import { env } from '../../config/env.js';

import {
  hashPassword,
  comparePassword
} from '../../utils/password.js';

import {
  signToken
} from '../../utils/jwt.js';

import {
  ROLES
} from '../../constants/roles.js';


/* ======================================================
   ADMIN HELPERS
====================================================== */

const inList = (
  list,
  email
) => {
  return list.includes(
    String(email || '')
      .trim()
      .toLowerCase()
  );
};


const isSuperAdminEmail = (
  email
) =>
  inList(
    env.superAdminEmails,
    email
  );


const isAdminEmail = (
  email
) =>
  inList(
    env.adminEmails,
    email
  );


/* ======================================================
   PRIVILEGED ACCOUNT ENTITLEMENT
====================================================== */

async function grantPrivilegedEntitlement(
  user
) {
  const superAdmin =
    isSuperAdminEmail(
      user.email
    );

  const admin =
    isAdminEmail(
      user.email
    );


  if (
    !superAdmin &&
    !admin
  ) {
    return user;
  }


  const role =
    superAdmin
      ? ROLES.SUPER_ADMIN
      : ROLES.ADMIN;


  if (
    user.role !== role
  ) {
    user.role = role;

    await user.save();
  }


  const paidPlan =
    await Plan.findOne({
      code:
        superAdmin
          ? 'unlimited'
          : 'family',

      active:
        true
    });


  if (paidPlan) {
    const now =
      new Date();

    const end =
      new Date(
        '2099-12-31T23:59:59.000Z'
      );


    await Subscription.findOneAndUpdate(
      {
        user:
          user._id
      },

      {
        $set: {
          plan:
            paidPlan._id,

          status:
            'active',

          billingCycle:
            'monthly',

          currentPeriodStart:
            now,

          currentPeriodEnd:
            end,

          provider:
            superAdmin
              ? 'super_admin_grant'
              : 'admin_grant',

          trialStartedAt:
            null,

          trialEndsAt:
            null
        }
      },

      {
        upsert:
          true,

        new:
          true,

        setDefaultsOnInsert:
          true
      }
    );
  }


  return user;
}


/* ======================================================
   REGISTER
====================================================== */

export async function register(
  input
) {
  const email =
    String(
      input.email || ''
    )
      .trim()
      .toLowerCase();


  if (!email) {
    throw new ApiError(
      400,
      'Email is required'
    );
  }


  if (
    await User.exists({
      email
    })
  ) {
    throw new ApiError(
      409,
      'Email already registered'
    );
  }


  const superAdmin =
    isSuperAdminEmail(
      email
    );

  const admin =
    isAdminEmail(
      email
    );


  const role =
    superAdmin
      ? ROLES.SUPER_ADMIN
      : admin
      ? ROLES.ADMIN
      : ROLES.USER;


  let user;


  try {
    user =
      await User.create({
        ...input,

        email,

        role,

        accountOwner:
          null,

        isActive:
          true,

        password:
          await hashPassword(
            input.password
          )
      });


    const trialPlan =
      await Plan.findOne({
        code:
          'trial',

        active:
          true
      });


    if (!trialPlan) {
      throw new ApiError(
        500,
        'Trial plan is not configured'
      );
    }


    const now =
      new Date();


    const trialEndsAt =
      new Date(
        now.getTime() +
        env.trialDays *
          24 *
          60 *
          60 *
          1000
      );


    await Promise.all([
      Profile.create({
        user:
          user._id,

        displayName:
          user.name
      }),

      Wardrobe.create({
        owner:
          user._id
      }),

      Household.create({
        owner:
          user._id,

        members:
          []
      }),

      role === ROLES.USER
        ? Subscription.create({
            user:
              user._id,

            plan:
              trialPlan._id,

            status:
              'trial',

            billingCycle:
              'trial',

            trialStartedAt:
              now,

            trialEndsAt,

            currentPeriodStart:
              now,

            currentPeriodEnd:
              trialEndsAt
          })
        : Promise.resolve()
    ]);


    if (
      role !== ROLES.USER
    ) {
      await grantPrivilegedEntitlement(
        user
      );
    }


    return {
      token:
        signToken({
          sub:
            user._id.toString(),

          role:
            user.role
        }),

      user: {
        id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        accountOwner:
          user.accountOwner ||
          null,

        relation:
          user.relation ||
          '',

        isActive:
          user.isActive
      },

      trial:
        role === ROLES.USER
          ? {
              endsAt:
                trialEndsAt,

              aiEnabled:
                false,

              days:
                env.trialDays
            }
          : null
    };
  } catch (error) {
    /*
     * Cleanup if setup fails after user creation.
     */

    if (user?._id) {
      await Promise.allSettled([
        Profile.deleteOne({
          user:
            user._id
        }),

        Wardrobe.deleteMany({
          owner:
            user._id
        }),

        Household.deleteOne({
          owner:
            user._id
        }),

        Subscription.deleteMany({
          user:
            user._id
        }),

        User.deleteOne({
          _id:
            user._id
        })
      ]);
    }

    throw error;
  }
}


/* ======================================================
   LOGIN
====================================================== */

export async function login(
  input
) {
  const email =
    String(
      input.email || ''
    )
      .trim()
      .toLowerCase();


  const user =
    await User.findOne({
      email
    }).select(
      '+password'
    );


  if (!user) {
    throw new ApiError(
      401,
      'Invalid email or password'
    );
  }


  const validPassword =
    await comparePassword(
      input.password,
      user.password
    );


  if (!validPassword) {
    throw new ApiError(
      401,
      'Invalid email or password'
    );
  }


  /* ====================================================
     ACTIVE ACCOUNT CHECK

     Important for removed household members.
  ==================================================== */

  if (
    user.isActive === false
  ) {
    throw new ApiError(
      403,
      user.role === ROLES.MEMBER
        ? 'This household member account has been disabled. Please contact the account owner.'
        : 'This account has been disabled.',
      {
        code:
          'ACCOUNT_DISABLED'
      }
    );
  }


  /* ====================================================
     MEMBER OWNER CHECK
  ==================================================== */

  if (
    user.role ===
      ROLES.MEMBER &&
    !user.accountOwner
  ) {
    throw new ApiError(
      403,
      'This member account is not linked to a household owner.',
      {
        code:
          'HOUSEHOLD_OWNER_NOT_FOUND'
      }
    );
  }


  /* ====================================================
     ADMIN/SUPER ADMIN ENTITLEMENT
  ==================================================== */

  await grantPrivilegedEntitlement(
    user
  );


  /* ====================================================
     TOKEN + USER
  ==================================================== */

  return {
    token:
      signToken({
        sub:
          user._id.toString(),

        role:
          user.role
      }),

    user: {
      id:
        user._id,

      name:
        user.name,

      email:
        user.email,

      role:
        user.role,

      accountOwner:
        user.accountOwner ||
        null,

      relation:
        user.relation ||
        '',

      isActive:
        user.isActive
    }
  };
}