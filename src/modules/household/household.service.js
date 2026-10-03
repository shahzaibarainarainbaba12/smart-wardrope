import Household from './household.model.js';
import User from '../users/user.model.js';
import Profile from '../profiles/profile.model.js';
import Wardrobe from '../wardrobe/wardrobe.model.js';
import ApiError from '../../utils/ApiError.js';
import { getAccess } from '../../utils/subscriptionAccess.js';
import { hashPassword } from '../../utils/password.js';
import { ROLES } from '../../constants/roles.js';

async function getOrCreate(ownerId){
  let h=await Household.findOne({owner:ownerId});
  if(!h)h=await Household.create({owner:ownerId,members:[]});
  return h;
}
function ensureOwner(user){
  if(user.role===ROLES.MEMBER || user.accountOwner) throw new ApiError(403,'Household members cannot add or manage other members.');
}
export async function list(user){
  if(user.role===ROLES.MEMBER){
    const h=await Household.findOne({owner:user.accountOwner}).populate('owner','name email').populate('members.user','name email role isActive relation');
    if(!h) throw new ApiError(404,'Household not found');
    return { ...h.toObject(), readOnly:true, currentMemberUserId:user._id };
  }
  const h=await getOrCreate(user._id);
  await h.populate('owner','name email'); await h.populate('members.user','name email role isActive relation');
  return h;
}
export async function addMember(user,data,file){
  ensureOwner(user);
  const h=await getOrCreate(user._id);
  const {plan}=await getAccess(user._id,user.role);
  const limit=Number(plan?.limits?.members??1);
  const activeMembers=(h.members||[]).filter(m=>m.isActive!==false).length;
  const totalIncludingOwner=activeMembers+1;
  if(limit!==-1 && totalIncludingOwner>=limit) throw new ApiError(403,`${plan?.name||'Current plan'} allows ${limit} member${limit===1?'':'s'} including the account owner.`);
  const name=String(data.name||'').trim(),email=String(data.email||'').trim().toLowerCase(),password=String(data.password||'');
  if(!name) throw new ApiError(400,'Member name is required.');
  if(!email) throw new ApiError(400,'Member email is required.');
  if(password.length<6) throw new ApiError(400,'Member password must be at least 6 characters.');
  if(await User.exists({email})) throw new ApiError(409,'An account with this email already exists.');
  let memberUser;
  try{
    memberUser=await User.create({name,email,password:await hashPassword(password),role:ROLES.MEMBER,accountOwner:user._id,relation:data.relation||''});
    const avatar=file?`/uploads/${file.filename}`:'';
    await Promise.all([
      Profile.create({user:memberUser._id,displayName:name,gender:data.gender||'',avatar}),
      Wardrobe.create({owner:memberUser._id})
    ]);
    h.members.push({user:memberUser._id,name,email,relation:data.relation||'',gender:data.gender||'',avatar,isActive:true});
    await h.save();
    await h.populate('members.user','name email role isActive relation');
    return h.members[h.members.length-1];
  }catch(err){
    if(memberUser?._id){await Promise.allSettled([Profile.deleteOne({user:memberUser._id}),Wardrobe.deleteMany({owner:memberUser._id}),User.deleteOne({_id:memberUser._id})]);}
    throw err;
  }
}
export async function updateMember(user,id,data,file){
  ensureOwner(user);
  const h=await getOrCreate(user._id);const m=h.members.id(id);if(!m)throw new ApiError(404,'Member not found');
  const u=await User.findById(m.user).select('+password');if(!u)throw new ApiError(404,'Member login account not found');
  if(data.name!==undefined){m.name=data.name;u.name=data.name;}
  if(data.relation!==undefined){m.relation=data.relation;u.relation=data.relation;}
  if(data.gender!==undefined)m.gender=data.gender;
  if(data.email!==undefined){const email=String(data.email).trim().toLowerCase();if(email!==u.email&&await User.exists({email}))throw new ApiError(409,'Email already in use.');m.email=email;u.email=email;}
  if(data.password){if(String(data.password).length<6)throw new ApiError(400,'Password must be at least 6 characters.');u.password=await hashPassword(data.password);}
  if(file){m.avatar=`/uploads/${file.filename}`;await Profile.findOneAndUpdate({user:u._id},{$set:{avatar:m.avatar}});}
  await Promise.all([u.save(),h.save()]);return m;
}
export async function removeMember(user,id){
  ensureOwner(user);
  const h=await getOrCreate(user._id);const m=h.members.id(id);if(!m)throw new ApiError(404,'Member not found');
  await User.findByIdAndUpdate(m.user,{$set:{isActive:false}});
  m.isActive=false;await h.save();return m;
}
