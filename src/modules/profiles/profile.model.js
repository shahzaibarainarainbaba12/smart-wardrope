import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    displayName: {
      type: String,
      trim: true,
      default: ''
    },

    phone: {
      type: String,
      trim: true,
      default: ''
    },

    gender: {
      type: String,
      trim: true,
      default: ''
    },

    avatar: {
      type: String,
      default: ''
    },

    timezone: {
      type: String,
      default: 'Asia/Karachi'
    },

    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'light'
      },

      voiceGreeting: {
        type: Boolean,
        default: true
      },

      voiceAssistantEnabled: {
        type: Boolean,
        default: true
      },

      wakeWordEnabled: {
        type: Boolean,
        default: true
      },

      wakeWord: {
        type: String,
        trim: true,
        maxlength: 50,
        default: 'Hey SmartWardrobe'
      },

      speakReplies: {
        type: Boolean,
        default: true
      },

      autoListenAfterWake: {
        type: Boolean,
        default: true
      },

      voiceLanguage: {
        type: String,
        default: 'en-US'
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  'Profile',
  schema
);