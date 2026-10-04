import fs from 'fs/promises';
import path from 'path';

import { env } from '../../config/env.js';


/* ======================================================
   CONFIG
====================================================== */

export function isGeminiConfigured() {
  return Boolean(
    env.geminiApiKey &&
    env.geminiModel &&
    env.geminiBaseUrl
  );
}


/* ======================================================
   MIME TYPES
====================================================== */

function getMimeType(filePath) {
  const ext = path
    .extname(filePath)
    .slice(1)
    .toLowerCase();

  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';

    case 'png':
      return 'image/png';

    case 'webp':
      return 'image/webp';

    case 'heic':
      return 'image/heic';

    case 'heif':
      return 'image/heif';

    case 'gif':
      return 'image/gif';

    default:
      return null;
  }
}


/* ======================================================
   JSON HELPERS
====================================================== */

function cleanJsonText(text = '') {
  return String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}


function parseJsonFromText(text) {
  if (!text) {
    return null;
  }

  const cleaned =
    cleanJsonText(text);

  try {
    return JSON.parse(
      cleaned
    );
  } catch {
    // Try extracting JSON below
  }


  const objectMatch =
    cleaned.match(
      /\{[\s\S]*\}/
    );

  if (objectMatch) {
    try {
      return JSON.parse(
        objectMatch[0]
      );
    } catch {
      // Ignore
    }
  }


  const arrayMatch =
    cleaned.match(
      /\[[\s\S]*\]/
    );

  if (arrayMatch) {
    try {
      return JSON.parse(
        arrayMatch[0]
      );
    } catch {
      // Ignore
    }
  }

  return null;
}


/* ======================================================
   RESPONSE TEXT
====================================================== */

function extractText(data) {
  const candidates =
    Array.isArray(
      data?.candidates
    )
      ? data.candidates
      : [];

  if (!candidates.length) {
    return '';
  }


  const parts =
    candidates[0]
      ?.content
      ?.parts || [];


  return parts
    .map((part) =>
      typeof part?.text ===
      'string'
        ? part.text
        : ''
    )
    .filter(Boolean)
    .join('\n')
    .trim();
}


/* ======================================================
   GEMINI REQUEST
====================================================== */

export async function callGemini({
  instructions = '',
  text = '',
  imagePath = null,
  json = false
}) {
  if (!isGeminiConfigured()) {
    return null;
  }


  const parts = [];


  /* ====================================================
     USER TEXT
  ==================================================== */

  if (text) {
    parts.push({
      text:
        String(text)
    });
  }


  /* ====================================================
     IMAGE
  ==================================================== */

  if (imagePath) {
    const absolutePath =
      path.resolve(
        imagePath
      );


    const mimeType =
      getMimeType(
        absolutePath
      );


    if (!mimeType) {
      throw new Error(
        'Unsupported image format for Gemini'
      );
    }


    const bytes =
      await fs.readFile(
        absolutePath
      );


    parts.push({
      inlineData: {
        mimeType,

        data:
          bytes.toString(
            'base64'
          )
      }
    });
  }


  if (!parts.length) {
    parts.push({
      text:
        'Respond to the request.'
    });
  }


  /* ====================================================
     URL
  ==================================================== */

  const baseUrl =
    String(
      env.geminiBaseUrl ||
      'https://generativelanguage.googleapis.com'
    ).replace(/\/$/, '');


  const model =
    String(
      env.geminiModel
    ).trim();


  const url =
    `${baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`;


  /* ====================================================
     BODY
  ==================================================== */

  const body = {
    contents: [
      {
        role:
          'user',

        parts
      }
    ],

    generationConfig: {
      temperature:
        json
          ? 0.2
          : 0.4,

      maxOutputTokens:
        2048
    }
  };


  /* ====================================================
     SYSTEM INSTRUCTION
  ==================================================== */

  if (instructions) {
    body.systemInstruction = {
      parts: [
        {
          text:
            String(
              instructions
            )
        }
      ]
    };
  }


  /* ====================================================
     JSON MODE
  ==================================================== */

  if (json) {
    body.generationConfig.responseMimeType =
      'application/json';
  }


  /* ====================================================
     FETCH
  ==================================================== */

  let response;

  try {
    response =
      await fetch(
        url,
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/json',

            'x-goog-api-key':
              env.geminiApiKey
          },

          body:
            JSON.stringify(
              body
            )
        }
      );
  } catch (error) {
    throw new Error(
      `Unable to connect to Gemini API: ${error.message}`
    );
  }


  /* ====================================================
     ERROR HANDLING
  ==================================================== */

  if (!response.ok) {
    let errorBody = '';

    try {
      errorBody =
        await response.text();
    } catch {
      // Ignore
    }


    throw new Error(
      `Gemini API error ${response.status}: ${
        errorBody
          ? errorBody.slice(
              0,
              1200
            )
          : response.statusText
      }`
    );
  }


  /* ====================================================
     RESPONSE
  ==================================================== */

  const data =
    await response.json();


  /* ====================================================
     SAFETY / BLOCK CHECK
  ==================================================== */

  const blockReason =
    data?.promptFeedback
      ?.blockReason;


  if (blockReason) {
    throw new Error(
      `Gemini blocked the request: ${blockReason}`
    );
  }


  const outputText =
    extractText(
      data
    );


  if (!outputText) {
    const finishReason =
      data?.candidates?.[0]
        ?.finishReason;


    throw new Error(
      `Gemini returned no text${
        finishReason
          ? ` (${finishReason})`
          : ''
      }`
    );
  }


  /* ====================================================
     JSON RESPONSE
  ==================================================== */

  if (json) {
    const parsed =
      parseJsonFromText(
        outputText
      );


    if (
      parsed !== null
    ) {
      return parsed;
    }


    throw new Error(
      'Gemini returned invalid JSON'
    );
  }


  return outputText;
}