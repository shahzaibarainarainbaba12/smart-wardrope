import Household from './household.model.js';
import User from '../users/user.model.js';
import Profile from '../profiles/profile.model.js';
import Wardrobe from '../wardrobe/wardrobe.model.js';

import ApiError from '../../utils/ApiError.js';

import {
  getAccess
} from '../../utils/subscriptionAccess.js';

import {
  hashPassword
} from '../../utils/password.js';

import {
  ROLES
} from '../../constants/roles.js';


/* ======================================================
   GET / CREATE HOUSEHOLD
====================================================== */

async function getOrCreate(
  ownerId
) {
  let household =
    await Household.findOne({
      owner: ownerId
    });

  if (!household) {
    household =
      await Household.create({
        owner: ownerId,
        members: []
      });
  }

  return household;
}


/* ======================================================
   OWNER GUARD
====================================================== */

function ensureOwner(user) {
  if (
    user.role === ROLES.MEMBER ||
    user.accountOwner
  ) {
    throw new ApiError(
      403,
      'Household members cannot add or manage other members.'
    );
  }
}


/* ======================================================
   LIST HOUSEHOLD
====================================================== */

export async function list(
  user
) {
  /* MEMBER → read only household */

  if (
    user.role ===
    ROLES.MEMBER
  ) {
    const household =
      await Household.findOne({
        owner:
          user.accountOwner
      })
        .populate(
          'owner',
          'name email'
        )
        .populate(
          'members.user',
          'name email role isActive relation'
        );

    if (!household) {
      throw new ApiError(
        404,
        'Household not found'
      );
    }

    return {
      ...household.toObject(),

      readOnly:
        true,

      currentMemberUserId:
        user._id
    };
  }


  /* OWNER */

  const household =
    await getOrCreate(
      user._id
    );

  await household.populate(
    'owner',
    'name email'
  );

  await household.populate(
    'members.user',
    'name email role isActive relation'
  );

  return household;
}


/* ======================================================
   ADD MEMBER
====================================================== */

export async function addMember(
  user,
  data,
  file
) {
  ensureOwner(user);


  const household =
    await getOrCreate(
      user._id
    );


  const {
    plan
  } = await getAccess(
    user._id,
    user.role
  );


  /* ====================================================
     MEMBER LIMIT

     members limit includes account owner
  ==================================================== */

  const limit =
    Number(
      plan?.limits?.members ??
      1
    );


  const activeMembers =
    (
      household.members ||
      []
    ).filter(
      (member) =>
        member.isActive !==
        false
    ).length;


  const totalIncludingOwner =
    activeMembers + 1;


  if (
    limit !== -1 &&
    totalIncludingOwner >=
      limit
  ) {
    throw new ApiError(
      403,
      `${plan?.name || 'Current plan'} allows ${limit} member${limit === 1 ? '' : 's'} including the account owner.`,
      {
        code:
          'MEMBER_LIMIT_REACHED',

        limit
      }
    );
  }


  /* ====================================================
     INPUT
  ==================================================== */

  const name =
    String(
      data.name || ''
    ).trim();

  const email =
    String(
      data.email || ''
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      data.password || ''
    );


  if (!name) {
    throw new ApiError(
      400,
      'Member name is required.'
    );
  }


  if (!email) {
    throw new ApiError(
      400,
      'Member email is required.'
    );
  }


  if (
    password.length < 6
  ) {
    throw new ApiError(
      400,
      'Member password must be at least 6 characters.'
    );
  }


  if (
    await User.exists({
      email
    })
  ) {
    throw new ApiError(
      409,
      'An account with this email already exists.'
    );
  }


  let memberUser;


  try {
    /* ==================================================
       USER LOGIN ACCOUNT
    ================================================== */

    memberUser =
      await User.create({
        name,

        email,

        password:
          await hashPassword(
            password
          ),

        role:
          ROLES.MEMBER,

        accountOwner:
          user._id,

        relation:
          data.relation ||
          ''
      });


    /* ==================================================
       PROFILE + WARDROBE
    ================================================== */

    const avatar =
      file
        ? `/uploads/${file.filename}`
        : '';


    await Promise.all([
      Profile.create({
        user:
          memberUser._id,

        displayName:
          name,

        gender:
          data.gender ||
          '',

        avatar,

        preferences: {
          voiceAssistantEnabled:
            true,

          wakeWordEnabled:
            true,

          wakeWord:
            'Hey SmartWardrobe',

          speakReplies:
            true,

          autoListenAfterWake:
            true,

          voiceLanguage:
            'en-US'
        }
      }),

      Wardrobe.create({
        owner:
          memberUser._id
      })
    ]);


    /* ==================================================
       HOUSEHOLD SUBDOCUMENT
    ================================================== */

    household.members.push({
      user:
        memberUser._id,

      name,

      email,

      relation:
        data.relation ||
        '',

      gender:
        data.gender ||
        '',

      avatar,

      isActive:
        true
    });


    await household.save();


    await household.populate(
      'members.user',
      'name email role isActive relation'
    );


    return household.members[
      household.members.length - 1
    ];
  } catch (error) {
    /* ==================================================
       ROLLBACK
    ================================================== */

    if (
      memberUser?._id
    ) {
      await Promise.allSettled([
        Profile.deleteOne({
          user:
            memberUser._id
        }),

        Wardrobe.deleteMany({
          owner:
            memberUser._id
        }),

        User.deleteOne({
          _id:
            memberUser._id
        })
      ]);
    }

    throw error;
  }
}


/* ======================================================
   UPDATE MEMBER
====================================================== */

export async function updateMember(
  user,
  id,
  data,
  file
) {
  ensureOwner(user);


  const household =
    await getOrCreate(
      user._id
    );


  const member =
    household.members.id(id);


  if (!member) {
    throw new ApiError(
      404,
      'Member not found'
    );
  }


  const memberUser =
    await User.findById(
      member.user
    ).select('+password');


  if (!memberUser) {
    throw new ApiError(
      404,
      'Member login account not found'
    );
  }


  const profileUpdate = {};


  /* ====================================================
     NAME
  ==================================================== */

  if (
    data.name !== undefined
  ) {
    const name =
      String(
        data.name || ''
      ).trim();

    if (!name) {
      throw new ApiError(
        400,
        'Member name cannot be empty.'
      );
    }

    member.name =
      name;

    memberUser.name =
      name;

    profileUpdate.displayName =
      name;
  }


  /* ====================================================
     RELATION
  ==================================================== */

  if (
    data.relation !==
    undefined
  ) {
    const relation =
      String(
        data.relation ||
        ''
      ).trim();

    member.relation =
      relation;

    memberUser.relation =
      relation;
  }


  /* ====================================================
     GENDER
  ==================================================== */

  if (
    data.gender !==
    undefined
  ) {
    const gender =
      String(
        data.gender ||
        ''
      ).trim();

    member.gender =
      gender;

    profileUpdate.gender =
      gender;
  }


  /* ====================================================
     EMAIL
  ==================================================== */

  if (
    data.email !==
    undefined
  ) {
    const email =
      String(
        data.email ||
        ''
      )
        .trim()
        .toLowerCase();


    if (!email) {
      throw new ApiError(
        400,
        'Member email cannot be empty.'
      );
    }


    if (
      email !==
        memberUser.email &&
      await User.exists({
        email
      })
    ) {
      throw new ApiError(
        409,
        'Email already in use.'
      );
    }


    member.email =
      email;

    memberUser.email =
      email;
  }


  /* ====================================================
     PASSWORD
  ==================================================== */

  if (
    data.password
  ) {
    const password =
      String(
        data.password
      );


    if (
      password.length < 6
    ) {
      throw new ApiError(
        400,
        'Password must be at least 6 characters.'
      );
    }


    memberUser.password =
      await hashPassword(
        password
      );
  }


  /* ====================================================
     AVATAR
  ==================================================== */

  if (file) {
    member.avatar =
      `/uploads/${file.filename}`;

    profileUpdate.avatar =
      member.avatar;
  }


  /* ====================================================
     SAVE
  ==================================================== */

  await Promise.all([
    memberUser.save(),

    household.save(),

    Object.keys(
      profileUpdate
    ).length
      ? Profile.findOneAndUpdate(
          {
            user:
              memberUser._id
          },
          {
            $set:
              profileUpdate
          },
          {
            new:
              true,

            upsert:
              true,

            runValidators:
              true
          }
        )
      : Promise.resolve()
  ]);


  return member;
}


/* ======================================================
   REMOVE / DISABLE MEMBER
====================================================== */

export async function removeMember(
  user,
  id
) {
  ensureOwner(user);


  const household =
    await getOrCreate(
      user._id
    );


  const member =
    household.members.id(id);


  if (!member) {
    throw new ApiError(
      404,
      'Member not found'
    );
  }


  await User.findByIdAndUpdate(
    member.user,
    {
      $set: {
        isActive:
          false
      }
    }
  );


  member.isActive =
    false;


  await household.save();


  return member;
}