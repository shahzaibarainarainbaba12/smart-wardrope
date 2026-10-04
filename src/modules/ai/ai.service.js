import Item from '../items/item.model.js';
import Type from '../types/type.model.js';
import Collection from '../collections/collection.model.js';
import Outfit from '../outfits/outfit.model.js';
import Laundry from '../laundry/laundry.model.js';
import Planner from '../planner/planner.model.js';

import AIConversation from './conversations/aiConversation.model.js';

import ApiError from '../../utils/ApiError.js';
import { scoreItem } from './ai.helpers.js';

import {
  callGemini,
  isGeminiConfigured
} from './gemini.client.js';

import {
  ITEM_VISION_PROMPT,
  OUTFIT_PROMPT,
  CHAT_PROMPT
} from './ai.prompts.js';

import {
  getAccess,
  assertLimit
} from '../../utils/subscriptionAccess.js';


/* ======================================================
   HELPERS
====================================================== */

const clean = (value) =>
  String(value || '').trim();


const normalize = (value) =>
  clean(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();


const toId = (value) => {
  if (!value) return '';

  return String(
    value?._id ||
    value
  );
};


const getEventDate = (event) => {
  const value =
    event?.date ||
    event?.eventDate ||
    event?.startDate ||
    event?.startAt ||
    null;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};


const isUpcomingEvent = (event) => {
  const date =
    getEventDate(event);

  /*
   * If planner model does not contain a recognised date
   * field, keep the event rather than silently removing it.
   */
  if (!date) {
    return true;
  }

  const endOfToday =
    new Date();

  endOfToday.setHours(
    23,
    59,
    59,
    999
  );

  return (
    date.getTime() >=
    new Date()
      .setHours(0, 0, 0, 0)
  );
};


/* ======================================================
   CONVERSATIONS
====================================================== */

async function getOrCreateConversation(
  owner,
  conversationId
) {
  if (conversationId) {
    const existing =
      await AIConversation.findOne({
        _id: conversationId,
        owner
      });

    if (!existing) {
      throw new ApiError(
        404,
        'AI conversation not found'
      );
    }

    return existing;
  }

  return AIConversation.create({
    owner
  });
}


/* ======================================================
   WARDROBE CONTEXT
====================================================== */

async function getWardrobeContext(
  owner
) {
  const [
    items,
    collections,
    types,
    laundry,
    planner
  ] = await Promise.all([
    Item.find({
      owner
    })
      .populate(
        'type collections'
      )
      .limit(1000),

    Collection.find({
      owner,
      isArchived: false
    })
      .select(
        '_id name'
      )
      .sort({
        name: 1
      }),

    Type.find({
      owner,
      isActive: true
    })
      .select(
        '_id name'
      )
      .sort({
        name: 1
      }),

    Laundry.find({
      owner
    })
      .populate({
        path: 'item',

        populate: {
          path:
            'type collections'
        }
      })
      .limit(500),

    Planner.find({
      owner
    })
      .sort({
        date: 1
      })
      .limit(250)
  ]);


  /* ====================================================
     ITEMS
  ==================================================== */

  const readyItems =
    items.filter(
      (item) =>
        item.status ===
        'ready'
    );


  /*
   * Use the real Laundry records for laundry count.
   *
   * This is safer than relying only on Item.status,
   * because Laundry is its own module/source of truth.
   */

  const activeLaundry =
    laundry.filter(
      (entry) => {
        const status =
          normalize(
            entry.status
          );

        return ![
          'completed',
          'complete',
          'done',
          'returned',
          'ready'
        ].includes(status);
      }
    );


  /*
   * If your Laundry model doesn't use completed-style
   * statuses, this still counts all normal washing/drying
   * entries.
   */

  const laundryCount =
    activeLaundry.length;


  /* ====================================================
     TYPE COUNTS
  ==================================================== */

  const typeCounts = {};

  for (const item of items) {
    const typeName =
      item.type?.name ||
      'Other';

    typeCounts[typeName] =
      (typeCounts[typeName] || 0) +
      1;
  }


  const readyTypeCounts = {};

  for (const item of readyItems) {
    const typeName =
      item.type?.name ||
      'Other';

    readyTypeCounts[typeName] =
      (readyTypeCounts[typeName] || 0) +
      1;
  }


  /* ====================================================
     COLLECTION COUNTS
  ==================================================== */

  const collectionCounts = {};

  const collectionItems = {};

  for (
    const collection
    of collections
  ) {
    const belongingItems =
      items.filter(
        (item) =>
          (
            item.collections ||
            []
          ).some(
            (itemCollection) =>
              toId(
                itemCollection
              ) ===
              toId(collection)
          )
      );

    collectionCounts[
      collection.name
    ] =
      belongingItems.length;

    collectionItems[
      collection.name
    ] =
      belongingItems.map(
        (item) => ({
          id:
            item._id.toString(),

          name:
            item.name,

          type:
            item.type?.name ||
            '',

          color:
            item.color ||
            '',

          status:
            item.status ||
            ''
        })
      );
  }


  /* ====================================================
     UPCOMING EVENTS
  ==================================================== */

  const upcomingPlanner =
    planner.filter(
      isUpcomingEvent
    );


  /* ====================================================
     CONTEXT
  ==================================================== */

  return {
    summary: {
      totalItems:
        items.length,

      readyItems:
        readyItems.length,

      laundryItems:
        laundryCount,

      totalCollections:
        collections.length,

      totalTypes:
        types.length,

      upcomingEvents:
        upcomingPlanner.length
    },


    typeCounts,

    readyTypeCounts,

    collectionCounts,

    collectionItems,


    collections:
      collections.map(
        (collection) => ({
          id:
            collection._id
              .toString(),

          name:
            collection.name,

          itemCount:
            collectionCounts[
              collection.name
            ] || 0
        })
      ),


    types:
      types.map(
        (type) => ({
          id:
            type._id
              .toString(),

          name:
            type.name,

          itemCount:
            typeCounts[
              type.name
            ] || 0,

          readyCount:
            readyTypeCounts[
              type.name
            ] || 0
        })
      ),


    items:
      items.map(
        (item) => ({
          id:
            item._id
              .toString(),

          name:
            item.name,

          type:
            item.type?.name ||
            '',

          color:
            item.color ||
            '',

          status:
            item.status ||
            '',

          subCategory:
            item.subCategory ||
            '',

          collections:
            (
              item.collections ||
              []
            ).map(
              (collection) =>
                collection.name
            ),

          tags:
            item.tags || [],

          notes:
            item.notes || ''
        })
      ),


    readyItems:
      readyItems.map(
        (item) => ({
          id:
            item._id
              .toString(),

          name:
            item.name,

          type:
            item.type?.name ||
            '',

          color:
            item.color ||
            '',

          subCategory:
            item.subCategory ||
            '',

          collections:
            (
              item.collections ||
              []
            ).map(
              (collection) =>
                collection.name
            )
        })
      ),


    laundry:
      laundry.map(
        (entry) => ({
          id:
            entry._id
              .toString(),

          status:
            entry.status ||
            '',

          item:
            entry.item
              ? {
                  id:
                    entry.item
                      ._id
                      ?.toString(),

                  name:
                    entry.item
                      .name ||
                    '',

                  type:
                    entry.item
                      .type
                      ?.name ||
                    '',

                  color:
                    entry.item
                      .color ||
                    ''
                }
              : null
        })
      ),


    planner:
      upcomingPlanner.map(
        (event) => ({
          id:
            event._id
              .toString(),

          title:
            event.title ||
            event.name ||
            '',

          date:
            event.date ||
            event.eventDate ||
            event.startDate ||
            event.startAt ||
            null,

          occasion:
            event.occasion ||
            '',

          notes:
            event.notes ||
            ''
        })
      )
  };
}


/* ======================================================
   LOCAL / DATABASE ANSWERS

   These answers bypass Gemini for simple factual
   questions so counts come directly from MongoDB.
====================================================== */

function getLocalWardrobeAnswer(
  message,
  context
) {
  const text =
    normalize(message);

  if (!text) {
    return null;
  }


  /* ====================================================
     LAUNDRY
  ==================================================== */

  if (
    (
      text.includes(
        'how many'
      ) ||
      text.includes(
        'kitne'
      ) ||
      text.includes(
        'kitni'
      ) ||
      text.includes(
        'count'
      )
    ) &&
    (
      text.includes(
        'laundry'
      ) ||
      text.includes(
        'washing'
      ) ||
      text.includes(
        'dhulai'
      )
    )
  ) {
    return (
      `You currently have ` +
      `${context.summary.laundryItems} ` +
      `item(s) in laundry.`
    );
  }


  /* ====================================================
     READY ITEMS
  ==================================================== */

  if (
    (
      text.includes(
        'how many'
      ) ||
      text.includes(
        'kitne'
      ) ||
      text.includes(
        'kitni'
      )
    ) &&
    (
      text.includes(
        'ready'
      ) ||
      text.includes(
        'available'
      ) ||
      text.includes(
        'pehn sakta'
      ) ||
      text.includes(
        'pehn sakti'
      )
    )
  ) {
    return (
      `You currently have ` +
      `${context.summary.readyItems} ` +
      `ready wardrobe item(s).`
    );
  }


  /* ====================================================
     COLLECTION TOTAL
  ==================================================== */

  if (
    (
      text.includes(
        'how many'
      ) ||
      text.includes(
        'kitne'
      ) ||
      text.includes(
        'kitni'
      )
    ) &&
    (
      text.includes(
        'collection'
      ) ||
      text.includes(
        'collections'
      )
    )
  ) {
    return (
      `You currently have ` +
      `${context.summary.totalCollections} ` +
      `collection(s).`
    );
  }


  /* ====================================================
     SPECIFIC COLLECTION
  ==================================================== */

  for (
    const collection
    of context.collections
  ) {
    const collectionName =
      normalize(
        collection.name
      );

    if (
      collectionName &&
      text.includes(
        collectionName
      )
    ) {
      const items =
        context.collectionItems[
          collection.name
        ] || [];


      if (
        text.includes(
          'how many'
        ) ||
        text.includes(
          'kitne'
        ) ||
        text.includes(
          'kitni'
        ) ||
        text.includes(
          'count'
        )
      ) {
        return (
          `${collection.name} has ` +
          `${items.length} wardrobe item(s).`
        );
      }


      if (
        text.includes(
          'what'
        ) ||
        text.includes(
          'show'
        ) ||
        text.includes(
          'kya'
        ) ||
        text.includes(
          'which'
        ) ||
        text.includes(
          'items'
        )
      ) {
        if (!items.length) {
          return (
            `${collection.name} does not ` +
            `currently contain any items.`
          );
        }

        const names =
          items
            .slice(0, 20)
            .map(
              (item) =>
                `${item.name}${
                  item.status
                    ? ` (${item.status})`
                    : ''
                }`
            )
            .join(', ');

        return (
          `${collection.name} contains ` +
          `${items.length} item(s): ` +
          names +
          (
            items.length > 20
              ? ', and more.'
              : '.'
          )
        );
      }
    }
  }


  /* ====================================================
     SPECIFIC TYPE
  ==================================================== */

  for (
    const type
    of context.types
  ) {
    const typeName =
      normalize(
        type.name
      );

    if (
      !typeName ||
      !text.includes(
        typeName
      )
    ) {
      continue;
    }


    if (
      text.includes(
        'how many'
      ) ||
      text.includes(
        'kitne'
      ) ||
      text.includes(
        'kitni'
      ) ||
      text.includes(
        'count'
      )
    ) {
      if (
        text.includes(
          'ready'
        ) ||
        text.includes(
          'available'
        )
      ) {
        return (
          `You currently have ` +
          `${type.readyCount} ready ` +
          `${type.name} item(s).`
        );
      }

      return (
        `You currently have ` +
        `${type.itemCount} ` +
        `${type.name} item(s).`
      );
    }
  }


  /* ====================================================
     TOTAL ITEMS
  ==================================================== */

  if (
    (
      text.includes(
        'how many'
      ) ||
      text.includes(
        'kitne'
      ) ||
      text.includes(
        'kitni'
      ) ||
      text.includes(
        'count'
      )
    ) &&
    (
      text.includes(
        'item'
      ) ||
      text.includes(
        'dress'
      ) ||
      text.includes(
        'clothes'
      ) ||
      text.includes(
        'kapre'
      ) ||
      text.includes(
        'kapray'
      ) ||
      text.includes(
        'wardrobe'
      )
    )
  ) {
    return (
      `You currently have ` +
      `${context.summary.totalItems} wardrobe item(s), ` +
      `including ${context.summary.readyItems} ready item(s) ` +
      `and ${context.summary.laundryItems} item(s) in laundry.`
    );
  }


  /* ====================================================
     UPCOMING EVENTS
  ==================================================== */

  if (
    text.includes(
      'next event'
    ) ||
    text.includes(
      'upcoming event'
    ) ||
    text.includes(
      'next plan'
    ) ||
    text.includes(
      'agla event'
    )
  ) {
    const event =
      context.planner?.[0];

    if (!event) {
      return (
        'You currently have no upcoming events in your planner.'
      );
    }

    const date =
      event.date
        ? new Date(
            event.date
          )
        : null;

    const dateText =
      date &&
      !Number.isNaN(
        date.getTime()
      )
        ? date.toLocaleDateString(
            'en-US',
            {
              year:
                'numeric',
              month:
                'short',
              day:
                'numeric'
            }
          )
        : '';

    return (
      `Your next event is ` +
      `"${event.title || 'Untitled event'}"` +
      `${dateText ? ` on ${dateText}` : ''}.`
    );
  }


  return null;
}


/* ======================================================
   IMAGE CLASSIFICATION
====================================================== */

async function classifyImage(
  image
) {
  const fallback = {
    name:
      'New wardrobe item',

    color: '',

    subCategory: '',

    suggestedType: '',

    description: ''
  };


  if (
    !image ||
    !isGeminiConfigured()
  ) {
    return fallback;
  }


  try {
    const result =
      await callGemini({
        instructions:
          ITEM_VISION_PROMPT,

        text:
          'Analyze this wardrobe item image and return structured details.',

        imagePath:
          image,

        json:
          true
      });


    return {
      ...fallback,
      ...(result || {})
    };
  } catch (error) {
    console.error(
      'Gemini image analysis failed:',
      error.message
    );

    return fallback;
  }
}


/* ======================================================
   ITEM INTAKE
====================================================== */

export async function startItemIntake(
  owner,
  file
) {
  if (!file) {
    throw new ApiError(
      400,
      'Upload an item image first'
    );
  }


  const image =
    file.path.replaceAll(
      '\\',
      '/'
    );


  const detected =
    await classifyImage(
      image
    );


  const collections =
    await Collection.find({
      owner,
      isArchived: false
    })
      .select(
        '_id name coverImage'
      )
      .sort({
        name: 1
      });


  const conversation =
    await AIConversation.create({
      owner,

      mode:
        'add-item',

      step:
        'awaiting_collection',

      itemDraft: {
        image,

        name:
          detected.name,

        color:
          detected.color,

        subCategory:
          detected.subCategory
      },

      messages: [
        {
          role:
            'user',

          text:
            'I want to add this item.',

          image
        },

        {
          role:
            'assistant',

          text:
            `I found ${
              detected.name ||
              'this item'
            }. Choose a collection first.`
        }
      ]
    });


  return {
    conversationId:
      conversation._id,

    step:
      conversation.step,

    detected,

    reply:
      `I found ${
        detected.name ||
        'this item'
      }. Choose the collection where you want to add it.`,

    collections
  };
}


/* ======================================================
   CONTINUE ITEM INTAKE
====================================================== */

export async function continueItemIntake(
  owner,
  conversationId,
  body,
  role,
  subscriptionPlan = null
) {
  const conversation =
    await getOrCreateConversation(
      owner,
      conversationId
    );


  if (
    conversation.mode !==
    'add-item'
  ) {
    throw new ApiError(
      400,
      'This conversation is not an item intake flow'
    );
  }


  /* ====================================================
     COLLECTION STEP
  ==================================================== */

  if (
    conversation.step ===
    'awaiting_collection'
  ) {
    const ids =
      Array.isArray(
        body.collectionIds
      )
        ? [
            ...new Set(
              body.collectionIds
                .filter(Boolean)
                .map(String)
            )
          ]
        : [];


    if (!ids.length) {
      throw new ApiError(
        400,
        'Choose at least one collection'
      );
    }


    const collections =
      await Collection.find({
        _id: {
          $in: ids
        },

        owner,

        isArchived:
          false
      }).select(
        '_id name'
      );


    if (
      collections.length !==
      ids.length
    ) {
      throw new ApiError(
        400,
        'One or more selected collections are invalid'
      );
    }


    conversation.itemDraft.collectionIds =
      collections.map(
        (collection) =>
          collection._id
      );


    conversation.step =
      'awaiting_type';


    conversation.messages.push(
      {
        role:
          'user',

        text:
          `Collections: ${collections
            .map(
              (collection) =>
                collection.name
            )
            .join(', ')}`
      },

      {
        role:
          'assistant',

        text:
          'Great. Now choose the item type.'
      }
    );


    const types =
      await Type.find({
        owner,
        isActive: true
      })
        .select(
          '_id name image'
        )
        .sort({
          name: 1
        });


    await conversation.save();


    return {
      conversationId,

      step:
        conversation.step,

      reply:
        'Great. Now choose the item type.',

      types
    };
  }


  /* ====================================================
     TYPE STEP
  ==================================================== */

  if (
    conversation.step ===
    'awaiting_type'
  ) {
    if (!body.typeId) {
      throw new ApiError(
        400,
        'Choose a valid type'
      );
    }


    const type =
      await Type.findOne({
        _id:
          body.typeId,

        owner,

        isActive:
          true
      });


    if (!type) {
      throw new ApiError(
        400,
        'Choose a valid type'
      );
    }


    conversation.itemDraft.typeId =
      type._id;


    conversation.step =
      'awaiting_details';


    conversation.messages.push(
      {
        role:
          'user',

        text:
          `Type: ${type.name}`
      },

      {
        role:
          'assistant',

        text:
          'Perfect. Review the item details before saving.'
      }
    );


    await conversation.save();


    return {
      conversationId,

      step:
        conversation.step,

      reply:
        'Perfect. Review the item name and details, then save it to your wardrobe.',

      draft: {
        name:
          conversation
            .itemDraft
            .name ||
          '',

        color:
          conversation
            .itemDraft
            .color ||
          '',

        subCategory:
          conversation
            .itemDraft
            .subCategory ||
          type.name,

        notes:
          ''
      },

      type
    };
  }


  /* ====================================================
     DETAILS / SAVE STEP
  ==================================================== */

  if (
    conversation.step ===
    'awaiting_details'
  ) {
    const details =
      body.details || {};


    const name =
      clean(
        details.name
      ) ||
      conversation
        .itemDraft
        .name ||
      'Wardrobe item';


    /*
     * Household members receive the owner's populated
     * plan through requireAiAccess middleware.
     *
     * If subscriptionPlan is passed from controller,
     * use it instead of looking for a subscription
     * under the member's own user id.
     */

    let plan =
      subscriptionPlan;


    if (!plan) {
      const access =
        await getAccess(
          owner,
          role
        );

      plan =
        access.plan;
    }


    const itemCount =
      await Item.countDocuments({
        owner
      });


    assertLimit(
      plan,
      'items',
      itemCount
    );


    const item =
      await Item.create({
        owner,

        name,

        type:
          conversation
            .itemDraft
            .typeId,

        subCategory:
          clean(
            details.subCategory
          ) ||
          conversation
            .itemDraft
            .subCategory ||
          '',

        collections:
          conversation
            .itemDraft
            .collectionIds,

        image:
          conversation
            .itemDraft
            .image,

        color:
          clean(
            details.color
          ) ||
          conversation
            .itemDraft
            .color ||
          '',

        status:
          'ready',

        notes:
          clean(
            details.notes
          ) ||
          'Added through SmartWardrobe AI Assistant'
      });


    conversation.step =
      'idle';

    conversation.mode =
      'chat';

    conversation.itemDraft.name =
      name;


    conversation.messages.push(
      {
        role:
          'user',

        text:
          `Save item: ${name}`
      },

      {
        role:
          'assistant',

        text:
          `${name} has been added to your wardrobe.`,

        metadata: {
          itemId:
            item._id
        }
      }
    );


    await conversation.save();


    return {
      conversationId,

      step:
        'completed',

      reply:
        `${name} has been added to your wardrobe.`,

      item
    };
  }


  throw new ApiError(
    400,
    'The item intake flow has already finished'
  );
}


/* ======================================================
   OUTFIT SUGGESTION
====================================================== */

export async function suggest(
  owner,
  {
    mood = '',
    occasion = '',
    notes = '',
    save = false
  }
) {
  /*
   * Very important:
   * Gemini only receives READY inventory.
   *
   * Laundry / unavailable items can never be selected.
   */

  const items =
    await Item.find({
      owner,
      status:
        'ready'
    }).populate(
      'type collections'
    );


  if (!items.length) {
    throw new ApiError(
      400,
      'No ready wardrobe items available'
    );
  }


  let chosen = [];

  let reason =
    'Built from your currently ready wardrobe items.';

  let stylingTips = [];


  /* ====================================================
     GEMINI OUTFIT
  ==================================================== */

  if (
    isGeminiConfigured()
  ) {
    const inventory =
      items.map(
        (item) => ({
          id:
            item._id
              .toString(),

          name:
            item.name,

          type:
            item.type?.name ||
            '',

          color:
            item.color ||
            '',

          subCategory:
            item.subCategory ||
            '',

          collections:
            (
              item.collections ||
              []
            ).map(
              (collection) =>
                collection.name
            ),

          tags:
            item.tags || []
        })
      );


    try {
      const ai =
        await callGemini({
          instructions:
            OUTFIT_PROMPT,

          text:
            JSON.stringify({
              request: {
                mood,
                occasion,
                notes
              },

              inventory
            }),

          json:
            true
        });


      /*
       * Security / correctness:
       * Gemini is never trusted to invent an item id.
       */

      const allowed =
        new Set(
          items.map(
            (item) =>
              item._id
                .toString()
          )
        );


      const ids =
        Array.isArray(
          ai?.itemIds
        )
          ? [
              ...new Set(
                ai.itemIds
                  .map(String)
                  .filter(
                    (id) =>
                      allowed.has(
                        id
                      )
                  )
              )
            ]
          : [];


      chosen =
        ids
          .map(
            (id) =>
              items.find(
                (item) =>
                  item._id
                    .toString() ===
                  id
              )
          )
          .filter(Boolean);


      reason =
        clean(
          ai?.reason
        ) ||
        reason;


      stylingTips =
        Array.isArray(
          ai?.stylingTips
        )
          ? ai.stylingTips
              .map(clean)
              .filter(Boolean)
          : [];
    } catch (error) {
      console.error(
        'Gemini outfit suggestion failed:',
        error.message
      );
    }
  }


  /* ====================================================
     FALLBACK OUTFIT
  ==================================================== */

  if (!chosen.length) {
    const grouped =
      new Map();


    for (const item of items) {
      const key =
        item.type?.name ||
        'Other';

      const arr =
        grouped.get(
          key
        ) || [];

      arr.push(
        item
      );

      grouped.set(
        key,
        arr
      );
    }


    for (
      const [, arr]
      of grouped
    ) {
      arr.sort(
        (a, b) =>
          scoreItem(
            b,
            {
              mood,
              occasion
            }
          ) -
          scoreItem(
            a,
            {
              mood,
              occasion
            }
          )
      );


      if (arr[0]) {
        chosen.push(
          arr[0]
        );
      }


      if (
        chosen.length >=
        6
      ) {
        break;
      }
    }
  }


  const result = {
    title:
      `${
        occasion ||
        mood ||
        'Smart'
      } Look`,

    mood,

    occasion,

    notes,

    items:
      chosen,

    reason,

    stylingTips
  };


  if (save) {
    const outfit =
      await Outfit.create({
        owner,

        name:
          result.title,

        items:
          chosen.map(
            (item) =>
              item._id
          ),

        mood,

        occasion,

        isAiGenerated:
          true
      });


    result.outfitId =
      outfit._id;
  }


  return result;
}


/* ======================================================
   CHAT
====================================================== */

export async function chat(
  owner,
  {
    conversationId,
    message
  }
) {
  const conversation =
    await getOrCreateConversation(
      owner,
      conversationId
    );


  const text =
    clean(
      message
    );


  if (!text) {
    throw new ApiError(
      400,
      'Message is required'
    );
  }


  conversation.messages.push({
    role:
      'user',

    text
  });


  /*
   * Every chat request gets fresh MongoDB context.
   *
   * This means Gemini sees the user's current wardrobe
   * rather than old/stale frontend state.
   */

  const wardrobeContext =
    await getWardrobeContext(
      owner
    );


  let reply =
    'I can help with your wardrobe, collections, laundry, events and outfit suggestions.';


  /* ====================================================
     DETERMINISTIC DATABASE ANSWER
  ==================================================== */

  const localAnswer =
    getLocalWardrobeAnswer(
      text,
      wardrobeContext
    );


  if (localAnswer) {
    reply =
      localAnswer;
  }


  /* ====================================================
     GEMINI CHAT
  ==================================================== */

  if (
    !localAnswer &&
    isGeminiConfigured()
  ) {
    try {
      const aiReply =
        await callGemini({
          instructions:
            CHAT_PROMPT,

          text:
            JSON.stringify({
              userMessage:
                text,

              wardrobe:
                wardrobeContext,

              recentMessages:
                conversation.messages
                  .slice(-12)
                  .map(
                    (item) => ({
                      role:
                        item.role,

                      text:
                        item.text
                    })
                  )
            })
        });


      if (
        typeof aiReply ===
          'string' &&
        aiReply.trim()
      ) {
        reply =
          aiReply.trim();
      }
    } catch (error) {
      console.error(
        'Gemini chat failed:',
        error.message
      );
    }
  }


  /* ====================================================
     OUTFIT INTENT
  ==================================================== */

  let outfit = null;


  const outfitIntent =
    /\b(outfit|dress me|what should i wear|what to wear|party|wedding|office look|complete look|dressing|pehnu|pehna|pehno|kapray suggest|kapre suggest|look bana|look banao)\b/i.test(
      text
    );


  if (outfitIntent) {
    try {
      outfit =
        await suggest(
          owner,
          {
            occasion:
              text,

            mood:
              text,

            notes:
              text,

            save:
              false
          }
        );
    } catch {
      /*
       * User may have no ready items.
       * Keep normal chat response rather than failing
       * the entire conversation.
       */
    }
  }


  const finalReply =
    outfit
      ? (
          `${reply} ` +
          `I also created a complete look from your currently ready wardrobe items.`
        )
      : reply;


  conversation.messages.push({
    role:
      'assistant',

    text:
      finalReply,

    metadata:
      outfit
        ? {
            outfit:
              true
          }
        : undefined
  });


  conversation.lastActiveAt =
    new Date();


  await conversation.save();


  return {
    conversationId:
      conversation._id,

    reply:
      finalReply,

    outfit,

    wardrobeSummary:
      wardrobeContext.summary
  };
}


/* ======================================================
   CONVERSATIONS
====================================================== */

export async function listConversations(
  owner
) {
  return AIConversation.find({
    owner
  })
    .select(
      'title mode step lastActiveAt createdAt updatedAt'
    )
    .sort({
      lastActiveAt:
        -1
    })
    .limit(50);
}


export async function getConversation(
  owner,
  id
) {
  const item =
    await AIConversation.findOne({
      _id:
        id,

      owner
    });


  if (!item) {
    throw new ApiError(
      404,
      'AI conversation not found'
    );
  }


  return item;
}