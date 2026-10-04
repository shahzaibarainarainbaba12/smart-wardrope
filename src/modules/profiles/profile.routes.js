import { Router } from 'express';

import * as controller from './profile.controller.js';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

/* ======================================================
   ALL PROFILE ROUTES REQUIRE LOGIN
====================================================== */

router.use(requireAuth);


/* ======================================================
   GET PROFILE

   GET /api/profile
====================================================== */

router.get(
  '/',
  asyncHandler(controller.get)
);


/* ======================================================
   UPDATE PROFILE

   PATCH /api/profile

   Supports:
   - displayName
   - phone
   - gender
   - timezone
   - avatar
   - theme
   - voice settings
   - custom wake word
====================================================== */

router.patch(
  '/',
  upload.single('avatar'),
  asyncHandler(controller.update)
);


export default router;