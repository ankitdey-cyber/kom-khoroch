import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

function loadNetworkData() {
  const candidates = [
    fileURLToPath(new URL('../data/network.json', import.meta.url)),
    path.resolve(process.cwd(), 'data/network.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    }
  }
  throw new Error(`Could not locate data/network.json (checked: ${candidates.join(', ')})`);
}

const networkData = loadNetworkData();
const stopListText = networkData.stops.map((s) => `${s.id}: ${s.name}`).join('\n');

const SYSTEM_INSTRUCTION = `You are a structured commute query parser for Kom Khoroch, a Kolkata & Hooghly transit planner.
Given a user's plain-language trip request (in English, Bengali, or Banglish), extract structured trip parameters matching the transit network stops.

Available stop IDs and names:
${stopListText}

Rules:
- Map origin and destination places/areas to the exact stop ID from the list above whenever mentioned (e.g. "Sector V" or "Salt Lake Sector 5" -> "SC5", "Serampore" -> "SRP", "Howrah" -> "HWH", "Sealdah" -> "SDH", "Airport" -> "APT", "BBD Bag" or "Dalhousie" -> "DLP", "Garia" -> "GRB", "New Garia" -> "KVS", "Tollygunge" -> "MHG", "New Town" -> "NWT").
- fromCurrentLocation: true if the user says origin is their current GPS location (e.g. "from here", "from my location", "my current location", "near me", "এখান থেকে"); otherwise false. When fromCurrentLocation is true, leave fromStopId empty string "".
- Only populate fromStopId / toStopId if the user explicitly states a named origin or destination stop. Otherwise leave them empty string "".
- avoid: array of modes to exclude, restricted strictly to ["cab", "bike", "bus", "auto", "ferry"]. For example "no bus" -> ["bus"], "avoid cab and bike" -> ["cab", "bike"]. Only include modes the user asked to avoid.
- peak: true if user mentions peak/rush hour, false if off-peak/afternoon/late night, omit/null if unspecified.
- smartCard: true if user mentions smart card, false if "no smart card", omit/null if unspecified.
- maxWalkKm: snap to nearest of 0.5, 1, 1.5, 2 if user specifies max walking distance; omit/null if unspecified.
- timeValuePer10Min: 0 if user wants cheapest / lowest fare / budget / kom khoroch; 100 if fastest / quickest; 20 if balanced / smart pick; omit/null if unspecified.
- budget: integer rupees if user specifies a maximum fare budget (e.g. "under 25", "below Rs 40"); omit/null if unspecified.
- summary: short plain-text summary (1 line, no emojis) of what was parsed.`;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(fn, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err?.status;
      if (attempt < maxAttempts && (status === 429 || (status !== undefined && status >= 500))) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function registerApiRoutes(app) {
  app.use(express.json({ limit: '64kb' }));

  app.post('/api/parse', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      res.status(400).json({ error: 'Please enter a trip phrase to analyze.' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured. Add it in server environment variables (Vercel or Settings > Secrets) to use plain-words trip parsing.',
      });
      return;
    }

    try {
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: query,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                fromCurrentLocation: {
                  type: Type.BOOLEAN,
                  description:
                    'True if user asked to travel from here / from my location, otherwise false.',
                },
                fromStopId: {
                  type: Type.STRING,
                  description:
                    'Matched origin stop ID from network, or empty string if not specified or if fromCurrentLocation is true.',
                },
                toStopId: {
                  type: Type.STRING,
                  description:
                    'Matched destination stop ID from network, or empty string if not specified.',
                },
                avoid: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Modes to avoid from: cab, bike, bus, auto, ferry.',
                },
                peak: {
                  type: Type.BOOLEAN,
                  nullable: true,
                  description:
                    'True for peak/rush hour, false for off-peak, null if not mentioned.',
                },
                smartCard: {
                  type: Type.BOOLEAN,
                  nullable: true,
                  description:
                    'True if Metro smart card requested, false if excluded, null if not mentioned.',
                },
                maxWalkKm: {
                  type: Type.NUMBER,
                  nullable: true,
                  description:
                    'Max walking distance in km (0.5, 1, 1.5, or 2), or null if not mentioned.',
                },
                timeValuePer10Min: {
                  type: Type.INTEGER,
                  nullable: true,
                  description:
                    '0 for cheapest, 20 for balanced, 100 for fastest, or null if not mentioned.',
                },
                budget: {
                  type: Type.INTEGER,
                  nullable: true,
                  description: 'Maximum fare budget in rupees if stated, or null.',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Concise 1-line summary of the extracted constraints.',
                },
              },
              required: ['fromStopId', 'toStopId', 'avoid', 'summary'],
            },
          },
        })
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      let message =
        err instanceof Error ? err.message : 'Failed to parse trip request with Gemini.';
      try {
        const parsedErr = JSON.parse(message);
        if (parsedErr?.error?.message) {
          message = parsedErr.error.message;
        }
      } catch {
        // leave plain message as-is
      }
      const status = err?.status;
      res.status(status && status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  return app;
}

/** @returns {import('express').Express} */
export function createApiApp() {
  const app = express();
  return registerApiRoutes(app);
}
