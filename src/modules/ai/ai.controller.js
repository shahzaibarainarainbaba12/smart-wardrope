import * as service from './ai.service.js';
import { ok } from '../../utils/ApiResponse.js';


/* ======================================================
   OUTFIT SUGGESTION
====================================================== */

export const suggest = async (req, res) => {
  const result =
    await service.suggest(
      req.user._id,
      req.body
    );

  return ok(
    res,
    result,
    'Outfit suggestion ready'
  );
};


/* ======================================================
   AI CHAT
====================================================== */

export const chat = async (req, res) => {
  const result =
    await service.chat(
      req.user._id,
      req.body
    );

  return ok(
    res,
    result,
    'Assistant reply ready'
  );
};


/* ======================================================
   START ITEM INTAKE
   Camera / Gallery upload
====================================================== */

export const startItemIntake = async (req, res) => {
  const result =
    await service.startItemIntake(
      req.user._id,
      req.file
    );

  return ok(
    res,
    result,
    'Item intake started'
  );
};


/* ======================================================
   CONTINUE ITEM INTAKE
   Collection → Type → Details → Save

   req.subscription is attached by requireAiAccess.
   Household members inherit the owner's subscription,
   so we pass the populated plan into the service.
====================================================== */

export const continueItemIntake = async (req, res) => {
  const result =
    await service.continueItemIntake(
      req.user._id,
      req.params.id,
      req.body,
      req.user.role,
      req.subscription?.plan || null
    );

  return ok(
    res,
    result,
    'Item intake updated'
  );
};


/* ======================================================
   CONVERSATIONS LIST
====================================================== */

export const conversations = async (req, res) => {
  const result =
    await service.listConversations(
      req.user._id
    );

  return ok(
    res,
    result,
    'AI conversations'
  );
};


/* ======================================================
   SINGLE CONVERSATION
====================================================== */

export const conversation = async (req, res) => {
  const result =
    await service.getConversation(
      req.user._id,
      req.params.id
    );

  return ok(
    res,
    result,
    'AI conversation'
  );
};