import * as service from './auth.service.js';
import { ok } from '../../utils/ApiResponse.js';
export const register = async (req,res) => ok(res, await service.register(req.body), 'Account created', 201);
export const login = async (req,res) => ok(res, await service.login(req.body), 'Login successful');
export const me = async (req,res) => ok(res, req.user);
