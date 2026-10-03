import * as s from './subscription.service.js';
import { ok } from '../../utils/ApiResponse.js';
export const list=async(req,res)=>ok(res,await s.list(req.user._id,req.query,req.user.role));
export const getOne=async(req,res)=>ok(res,await s.getOne(req.user._id,req.params.id,req.user.role));
export const create=async(req,res)=>ok(res,await s.create(req.user._id,{...req.body,...(req.file?{image:`/${req.file.path.replaceAll('\\','/')}`}:{})}),'Created',201);
export const update=async(req,res)=>ok(res,await s.update(req.user._id,req.params.id,{...req.body,...(req.file?{image:`/${req.file.path.replaceAll('\\','/')}`}:{})}),'Updated');
export const remove=async(req,res)=>ok(res,await s.remove(req.user._id,req.params.id),'Deleted');
