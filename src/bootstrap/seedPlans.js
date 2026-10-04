import Plan from '../modules/plans/plan.model.js';

const commonFeatures = [
  'wardrobe',
  'collections',
  'types',
  'laundry',
  'planner'
];

const aiFeatures = [
  ...commonFeatures,
  'ai-assistant',
  'ai-outfits'
];

const plans = [
  {
    code: 'trial',
    name: '8-Day Free Trial',
    monthlyPrice: 0,
    yearlyPrice: 0,

    limits: {
      members: 1,
      items: 10,
      collections: 5
    },

    features: commonFeatures,
    aiEnabled: false
  },

  {
    code: 'individual',
    name: 'Individual',
    monthlyPrice: 1000,
    yearlyPrice: 12000,

    limits: {
      members: 1,
      items: 500,
      collections: 100
    },

    features: aiFeatures,
    aiEnabled: true
  },

  {
    code: 'couple',
    name: 'Couple',
    monthlyPrice: 3000,
    yearlyPrice: 36000,

    limits: {
      members: 2,
      items: 1200,
      collections: 250
    },

    features: [
      ...aiFeatures,
      'shared-household'
    ],

    aiEnabled: true
  },

  {
    code: 'family',
    name: 'Family',
    monthlyPrice: 5000,
    yearlyPrice: 60000,

    limits: {
      members: 8,
      items: 5000,
      collections: 1000
    },

    features: [
      ...aiFeatures,
      'shared-household'
    ],

    aiEnabled: true
  },

  {
    code: 'unlimited',
    name: 'Unlimited',
    monthlyPrice: 10000,

    // Unlimited plan is currently monthly only
    yearlyPrice: 0,

    limits: {
      members: -1,
      items: -1,
      collections: -1
    },

    features: [
      ...aiFeatures,
      'shared-household',
      'unlimited-members',
      'unlimited-items',
      'unlimited-collections'
    ],

    aiEnabled: true
  }
];

export async function seedPlans() {
  for (const plan of plans) {
    await Plan.findOneAndUpdate(
      {
        code: plan.code
      },
      {
        $set: plan
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );
  }

  console.log('Plan catalogue ready');
}