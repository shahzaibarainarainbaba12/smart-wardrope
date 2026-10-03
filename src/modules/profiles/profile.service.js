import Profile from'./profile.model.js';export const get=(user)=>Profile.findOne({user});export const update=(user,data)=>Profile.findOneAndUpdate({user},{$set:data},{new:true,upsert:true});
