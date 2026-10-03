import * as s from './household.service.js';import {ok} from '../../utils/ApiResponse.js';
export const list=async(req,res)=>ok(res,await s.list(req.user));
export const addMember=async(req,res)=>ok(res,await s.addMember(req.user,req.body,req.file),'Member login created',201);
export const updateMember=async(req,res)=>ok(res,await s.updateMember(req.user,req.params.id,req.body,req.file),'Member updated');
export const removeMember=async(req,res)=>ok(res,await s.removeMember(req.user,req.params.id),'Member access disabled');
