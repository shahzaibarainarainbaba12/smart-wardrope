import path from 'path';
import Item from '../items/item.model.js';
import Type from '../types/type.model.js';
import Collection from '../collections/collection.model.js';
import Outfit from '../outfits/outfit.model.js';
import AIConversation from './conversations/aiConversation.model.js';
import ApiError from '../../utils/ApiError.js';
import { scoreItem } from './ai.helpers.js';
import { callOpenAI, isOpenAiConfigured } from './openai.client.js';
import { ITEM_VISION_PROMPT, OUTFIT_PROMPT, CHAT_PROMPT } from './ai.prompts.js';
import { getAccess, assertLimit } from '../../utils/subscriptionAccess.js';

const clean = value => String(value || '').trim();

async function getOrCreateConversation(owner, conversationId) {
  if (conversationId) {
    const existing = await AIConversation.findOne({ _id: conversationId, owner });
    if (!existing) throw new ApiError(404, 'AI conversation not found');
    return existing;
  }
  return AIConversation.create({ owner });
}

async function classifyImage(image) {
  const fallback = { name: 'New wardrobe item', color: '', subCategory: '', suggestedType: '' };
  if (!image || !isOpenAiConfigured()) return fallback;
  try {
    const result = await callOpenAI({ instructions: ITEM_VISION_PROMPT, text: 'Identify this wardrobe item.', imagePath: image, json: true });
    return { ...fallback, ...(result || {}) };
  } catch {
    return fallback;
  }
}

export async function startItemIntake(owner, file) {
  if (!file) throw new ApiError(400, 'Upload an item image first');
  const image = file.path.replaceAll('\\', '/');
  const detected = await classifyImage(image);
  const conversation = await AIConversation.create({
    owner, mode: 'add-item', step: 'awaiting_collection',
    itemDraft: { image, name: detected.name, color: detected.color, subCategory: detected.subCategory },
    messages: [
      { role: 'user', text: 'I want to add this item.', image },
      { role: 'assistant', text: `I found ${detected.name || 'this item'}. First choose the collection.` }
    ]
  });
  const collections = await Collection.find({ owner, isArchived: false }).select('_id name coverImage').sort({ name: 1 });
  return { conversationId: conversation._id, step: conversation.step, detected, collections };
}

export async function continueItemIntake(owner, conversationId, body, role) {
  const conversation = await getOrCreateConversation(owner, conversationId);
  if (conversation.mode !== 'add-item') throw new ApiError(400, 'This conversation is not an item intake flow');
  const action=clean(body.action);

  if (conversation.step === 'awaiting_collection') {
    const ids=Array.isArray(body.collectionIds)?body.collectionIds.filter(Boolean):[];
    if(!ids.length) throw new ApiError(400,'Choose at least one collection');
    const collections=await Collection.find({_id:{$in:ids},owner,isArchived:false}).select('_id name');
    if(collections.length!==ids.length)throw new ApiError(400,'One or more selected collections are invalid');
    conversation.itemDraft.collectionIds=collections.map(x=>x._id);
    conversation.step='awaiting_type';
    conversation.messages.push({role:'user',text:`Collections: ${collections.map(x=>x.name).join(', ')}`},{role:'assistant',text:'Great. Now choose the item type.'});
    const types=await Type.find({owner,isActive:true}).select('_id name image').sort({name:1});
    await conversation.save();
    return{conversationId,step:conversation.step,reply:'Great. Now choose the item type.',types};
  }

  if(conversation.step==='awaiting_type'){
    const type=await Type.findOne({_id:body.typeId,owner,isActive:true});
    if(!type)throw new ApiError(400,'Choose a valid type');
    conversation.itemDraft.typeId=type._id;
    conversation.step='awaiting_details';
    conversation.messages.push({role:'user',text:`Type: ${type.name}`},{role:'assistant',text:'Perfect. Review the item name and details, then save it to your wardrobe.'});
    await conversation.save();
    return{conversationId,step:conversation.step,reply:'Perfect. Review the item name and details, then save it to your wardrobe.',draft:{name:conversation.itemDraft.name||'',color:conversation.itemDraft.color||'',subCategory:conversation.itemDraft.subCategory||type.name,notes:''},type};
  }

  if(conversation.step==='awaiting_details'){
    const details=body.details||{};
    const name=clean(details.name)||conversation.itemDraft.name||'Wardrobe item';
    const {plan}=await getAccess(owner,role);const itemCount=await Item.countDocuments({owner});assertLimit(plan,'items',itemCount);
    const item=await Item.create({owner,name,type:conversation.itemDraft.typeId,subCategory:clean(details.subCategory)||conversation.itemDraft.subCategory||'',collections:conversation.itemDraft.collectionIds,image:conversation.itemDraft.image,color:clean(details.color)||conversation.itemDraft.color||'',status:'ready',notes:clean(details.notes)||'Added through SmartWardrobe AI Assistant'});
    conversation.step='idle';conversation.mode='chat';conversation.itemDraft.name=name;
    conversation.messages.push({role:'user',text:`Save item: ${name}`},{role:'assistant',text:`${name} has been added to your wardrobe.`,metadata:{itemId:item._id}});
    await conversation.save();
    return{conversationId,step:'completed',reply:`${name} has been added to your wardrobe.`,item};
  }
  throw new ApiError(400,'The item intake flow has already finished');
}

export async function suggest(owner, { mood = '', occasion = '', notes = '', save = false }) {
  const items = await Item.find({ owner, status: 'ready' }).populate('type collections');
  if (!items.length) throw new ApiError(400, 'No ready wardrobe items available');

  let chosen = [];
  let reason = 'Built from your currently ready wardrobe items across different types.';
  let stylingTips = [];

  if (isOpenAiConfigured()) {
    const inventory = items.map(item => ({
      id: item._id.toString(), name: item.name, type: item.type?.name, color: item.color,
      subCategory: item.subCategory, collections: (item.collections || []).map(c => c.name), tags: item.tags || []
    }));
    try {
      const ai = await callOpenAI({
        instructions: OUTFIT_PROMPT,
        text: JSON.stringify({ request: { mood, occasion, notes }, inventory }),
        json: true
      });
      const allowed = new Set(items.map(i => i._id.toString()));
      const ids = Array.isArray(ai?.itemIds) ? ai.itemIds.filter(id => allowed.has(String(id))) : [];
      chosen = ids.map(id => items.find(i => i._id.toString() === String(id))).filter(Boolean);
      reason = ai?.reason || reason;
      stylingTips = Array.isArray(ai?.stylingTips) ? ai.stylingTips : [];
    } catch { /* fallback below */ }
  }

  if (!chosen.length) {
    const grouped = new Map();
    for (const item of items) {
      const key = item.type?.name || 'Other';
      const arr = grouped.get(key) || [];
      arr.push(item);
      grouped.set(key, arr);
    }
    for (const [, arr] of grouped) {
      arr.sort((a,b) => scoreItem(b, { mood, occasion }) - scoreItem(a, { mood, occasion }));
      chosen.push(arr[0]);
      if (chosen.length >= 6) break;
    }
  }

  const result = { title: `${occasion || mood || 'Smart'} Look`, mood, occasion, notes, items: chosen, reason, stylingTips };
  if (save) {
    const outfit = await Outfit.create({ owner, name: result.title, items: chosen.map(x => x._id), mood, occasion, isAiGenerated: true });
    result.outfitId = outfit._id;
  }
  return result;
}

export async function chat(owner, { conversationId, message }) {
  const conversation = await getOrCreateConversation(owner, conversationId);
  const text = clean(message);
  if (!text) throw new ApiError(400, 'Message is required');
  conversation.messages.push({ role: 'user', text });

  const items = await Item.find({ owner }).populate('type collections').limit(250);
  const context = items.map(i => ({ id: i._id, name: i.name, type: i.type?.name, color: i.color, status: i.status, collections: (i.collections || []).map(c => c.name) }));

  let reply = 'I can help with your wardrobe, item intake, collections, laundry, events and complete outfit suggestions.';
  if (isOpenAiConfigured()) {
    try {
      reply = await callOpenAI({
        instructions: CHAT_PROMPT,
        text: JSON.stringify({ userMessage: text, wardrobe: context, recentMessages: conversation.messages.slice(-10).map(m => ({ role: m.role, text: m.text })) })
      }) || reply;
    } catch { /* use fallback */ }
  }
  let outfit = null;
  const outfitIntent = /\b(outfit|dress me|what should i wear|what to wear|party|wedding|office look|complete look|dressing)\b/i.test(text);
  if (outfitIntent) {
    try { outfit = await suggest(owner, { occasion: text, mood: text, notes: text, save: false }); } catch {}
  }
  conversation.messages.push({ role: 'assistant', text: outfit ? `${reply} I also built a complete look from your Ready wardrobe items.` : reply, metadata: outfit ? { outfit: true } : undefined });
  conversation.lastActiveAt = new Date();
  await conversation.save();
  return { conversationId: conversation._id, reply: outfit ? `${reply} I also built a complete look from your Ready wardrobe items.` : reply, outfit };
}

export async function listConversations(owner) {
  return AIConversation.find({ owner }).select('title mode step lastActiveAt createdAt updatedAt').sort({ lastActiveAt: -1 }).limit(50);
}

export async function getConversation(owner, id) {
  const item = await AIConversation.findOne({ _id: id, owner });
  if (!item) throw new ApiError(404, 'AI conversation not found');
  return item;
}
