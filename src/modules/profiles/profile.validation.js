import { z } from 'zod';

export const profileSchema = z.object({
  body: z.object({
    displayName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    phone: z
      .string()
      .trim()
      .max(30)
      .optional(),

    gender: z
      .string()
      .trim()
      .max(30)
      .optional(),

    timezone: z
      .string()
      .trim()
      .max(100)
      .optional(),

    preferences: z
      .object({
        theme: z
          .enum(['light', 'dark', 'system'])
          .optional(),

        voiceGreeting: z
          .boolean()
          .optional(),

        voiceAssistantEnabled: z
          .boolean()
          .optional(),

        wakeWordEnabled: z
          .boolean()
          .optional(),

        wakeWord: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .optional(),

        speakReplies: z
          .boolean()
          .optional(),

        autoListenAfterWake: z
          .boolean()
          .optional(),

        voiceLanguage: z
          .string()
          .trim()
          .max(20)
          .optional()
      })
      .optional()
  }),

  params: z.object({}),
  query: z.object({})
});