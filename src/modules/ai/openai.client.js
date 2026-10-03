import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env.js';

export function isOpenAiConfigured() {
  return Boolean(env.openAiApiKey);
}

function parseJsonFromText(text) {
  if (!text) return null;
  const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/(\{[\s\S]*\})/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

export async function callOpenAI({ instructions, text, imagePath, json = false }) {
  if (!isOpenAiConfigured()) return null;
  const content = [{ type: 'input_text', text }];

  if (imagePath) {
    const absolute = path.resolve(imagePath);
    const bytes = await fs.readFile(absolute);
    const ext = path.extname(absolute).slice(1).toLowerCase() || 'jpeg';
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    content.push({ type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}` });
  }

  const response = await fetch(`${env.openAiBaseUrl}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.openAiApiKey}` },
    body: JSON.stringify({
      model: env.openAiModel,
      instructions,
      input: [{ role: 'user', content }]
    })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider error ${response.status}: ${body.slice(0, 500)}`);
  }
  const data = await response.json();
  const outputText = data.output_text || data.output?.flatMap(item => item.content || []).map(c => c.text || '').join('\n') || '';
  return json ? (parseJsonFromText(outputText) || { raw: outputText }) : outputText;
}
