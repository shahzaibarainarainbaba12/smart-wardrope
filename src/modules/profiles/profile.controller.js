import * as service from './profile.service.js';
import { ok } from '../../utils/ApiResponse.js';

export const get = async (req, res) => {
  const profile = await service.get(req.user._id);

  return ok(
    res,
    profile,
    'Profile loaded'
  );
};

export const update = async (req, res) => {
  const data = {
    ...req.body
  };

  if (req.file) {
    data.avatar = `/${req.file.path.replaceAll('\\', '/')}`;
  }

  // In case preferences arrive as JSON string from FormData
  if (
    typeof data.preferences === 'string'
  ) {
    try {
      data.preferences = JSON.parse(
        data.preferences
      );
    } catch {
      data.preferences = {};
    }
  }

  const profile = await service.update(
    req.user._id,
    data
  );

  return ok(
    res,
    profile,
    'Profile updated'
  );
};