import * as s from './laundry.service.js';import {ok} from '../../utils/ApiResponse.js';
export const list=async(req,res)=>ok(res,await s.list(req.user._id));
export const add=async(req,res)=>ok(res,await s.add(req.user._id,req.body),'Moved to laundry',201);
export const setStatus=async(req,res)=>ok(res,await s.setStatus(req.user._id,req.params.id,req.body.status),'Laundry updated');
export const remove=async(req,res)=>ok(res,await s.remove(req.user._id,req.params.id),'Laundry record deleted');
