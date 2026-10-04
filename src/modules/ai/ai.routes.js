import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAiAccess } from '../../middleware/aiAccess.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

import * as controller from './ai.controller.js';

const router = Router();

/* ======================================================
   ALL AI ROUTES REQUIRE:
   1. Logged-in user
   2. Paid AI access
====================================================== */

router.use(
  requireAuth,
  asyncHandler(requireAiAccess)
);


/* ======================================================
   VALIDATION
====================================================== */

const suggestSchema = z.object({
  body: z.object({
    mood: z.string().trim().optional(),
    occasion: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    save: z.boolean().optional()
  }),

  params: z.object({}),
  query: z.object({})
});


const chatSchema = z.object({
  body: z.object({
    conversationId: z.string().trim().optional(),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(5000, 'Message is too long')
  }),

  params: z.object({}),
  query: z.object({})
});


const continueItemIntakeSchema = z.object({
  body: z.object({
    action: z.string().trim().optional(),

    collectionIds: z
      .array(z.string().trim())
      .optional(),

    typeId: z
      .string()
      .trim()
      .optional(),

    details: z
      .object({
        name: z.string().trim().optional(),
        color: z.string().trim().optional(),
        subCategory: z.string().trim().optional(),
        notes: z.string().trim().optional()
      })
      .optional()
  }),

  params: z.object({
    id: z.string().trim().min(1)
  }),

  query: z.object({})
});


const conversationSchema = z.object({
  body: z.object({}).optional(),

  params: z.object({
    id: z.string().trim().min(1)
  }),

  query: z.object({})
});


/* ======================================================
   CHAT
   Text typed by user OR converted from microphone speech
====================================================== */

router.post(
  '/chat',
  validate(chatSchema),
  asyncHandler(controller.chat)
);


/* ======================================================
   COMPLETE OUTFIT SUGGESTION
====================================================== */

router.post(
  '/suggest-outfit',
  validate(suggestSchema),
  asyncHandler(controller.suggest)
);


/* ======================================================
   CAMERA / GALLERY ITEM INTAKE

   FormData:
   image = uploaded image
====================================================== */

router.post(
  '/item-intake',
  upload.single('image'),
  asyncHandler(controller.startItemIntake)
);


/* ======================================================
   ITEM FLOW

   Collection
      ↓
   Type
      ↓
   Item details
      ↓
   Save
====================================================== */

router.post(
  '/item-intake/:id',
  validate(continueItemIntakeSchema),
  asyncHandler(controller.continueItemIntake)
);


/* ======================================================
   AI CONVERSATIONS
====================================================== */

router.get(
  '/conversations',
  asyncHandler(controller.conversations)
);


router.get(
  '/conversations/:id',
  validate(conversationSchema),
  asyncHandler(controller.conversation)
);


export default router;