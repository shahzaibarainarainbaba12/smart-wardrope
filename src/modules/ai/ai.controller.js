import * as s from './ai.service.js';
import { ok } from '../../utils/ApiResponse.js';
export const suggest=async(req,res)=>ok(res,await s.suggest(req.user._id,req.body),'Outfit suggestion ready');
export const chat=async(req,res)=>ok(res,await s.chat(req.user._id,req.body),'Assistant reply ready');
export const startItemIntake=async(req,res)=>ok(res,await s.startItemIntake(req.user._id,req.file),'Item intake started');
export const continueItemIntake=async(req,res)=>ok(res,await s.continueItemIntake(req.user._id,req.params.id,req.body,req.user.role),'Item intake updated');
export const conversations=async(req,res)=>ok(res,await s.listConversations(req.user._id),'AI conversations');
export const conversation=async(req,res)=>ok(res,await s.getConversation(req.user._id,req.params.id),'AI conversation');
