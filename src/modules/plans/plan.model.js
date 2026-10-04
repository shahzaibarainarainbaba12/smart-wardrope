import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    monthlyPrice: {
      type: Number,
      default: 0,
      min: 0
    },

    yearlyPrice: {
      type: Number,
      default: 0,
      min: 0
    },

    limits: {
      /*
       * -1 means unlimited
       */

      members: {
        type: Number,
        default: 1
      },

      items: {
        type: Number,
        default: 10
      },

      collections: {
        type: Number,
        default: 5
      }
    },

    features: {
      type: [String],
      default: []
    },

    aiEnabled: {
      type: Boolean,
      default: false
    },

    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'Plan',
  schema
);