import Profile from './profile.model.js';

export const get = async (user) => {
  return Profile.findOne({ user });
};

export const update = async (user, data = {}) => {
  const setData = {};

  if (data.displayName !== undefined) {
    setData.displayName = data.displayName;
  }

  if (data.phone !== undefined) {
    setData.phone = data.phone;
  }

  if (data.gender !== undefined) {
    setData.gender = data.gender;
  }

  if (data.avatar !== undefined) {
    setData.avatar = data.avatar;
  }

  if (data.timezone !== undefined) {
    setData.timezone = data.timezone;
  }

  if (data.preferences) {
    const preferences = data.preferences;

    if (preferences.theme !== undefined) {
      setData['preferences.theme'] = preferences.theme;
    }

    if (preferences.voiceGreeting !== undefined) {
      setData['preferences.voiceGreeting'] =
        preferences.voiceGreeting;
    }

    if (preferences.voiceAssistantEnabled !== undefined) {
      setData['preferences.voiceAssistantEnabled'] =
        preferences.voiceAssistantEnabled;
    }

    if (preferences.wakeWordEnabled !== undefined) {
      setData['preferences.wakeWordEnabled'] =
        preferences.wakeWordEnabled;
    }

    if (preferences.wakeWord !== undefined) {
      setData['preferences.wakeWord'] =
        String(preferences.wakeWord).trim();
    }

    if (preferences.speakReplies !== undefined) {
      setData['preferences.speakReplies'] =
        preferences.speakReplies;
    }

    if (preferences.autoListenAfterWake !== undefined) {
      setData['preferences.autoListenAfterWake'] =
        preferences.autoListenAfterWake;
    }

    if (preferences.voiceLanguage !== undefined) {
      setData['preferences.voiceLanguage'] =
        preferences.voiceLanguage;
    }
  }

  return Profile.findOneAndUpdate(
    { user },
    {
      $set: setData,
      $setOnInsert: { user }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );
};