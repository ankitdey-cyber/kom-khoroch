import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

interface NetworkStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  place: boolean;
}

interface NetworkJson {
  stops: NetworkStop[];
}

const PORT = Number(process.env.PORT) || 3000;
const AI_TIMEOUT_MS = 10_000;

const networkPath = path.resolve(process.cwd(), 'data/network.json');
const networkData = JSON.parse(fs.readFileSync(networkPath, 'utf8')) as NetworkJson;
const stopListText = networkData.stops.map((s) => `${s.id}: ${s.name}`).join('\n');

const SYSTEM_INSTRUCTION = `You are a structured commute query parser for Kom Khoroch, a Kolkata & Hooghly transit planner.
Given a user's plain-language trip request (in English, Bengali, or Banglish), extract structured trip parameters matching the transit network stops.

Available stop IDs and names:
${stopListText}

Rules:
- Map origin and destination places/areas to the exact stop ID from the list above whenever mentioned (e.g. "Sector V" or "Salt Lake Sector 5" -> "SC5", "Serampore" -> "SRP", "Howrah" -> "HWH", "Sealdah" -> "SDH", "Airport" -> "APT", "BBD Bag" or "Dalhousie" -> "DLP", "Garia" -> "GRB", "New Garia" -> "KVS", "Tollygunge" -> "MHG", "New Town" -> "NWT", "Burdwan" or "Bardhaman" -> "BWN").
- fromCurrentLocation: true if the user says origin is their current GPS location (e.g. "from here", "from my location", "my current location", "near me", "এখান থেকে"); otherwise false. When fromCurrentLocation is true, leave fromStopId empty string "".
- Only populate fromStopId / toStopId if the user explicitly states a named origin or destination stop. Otherwise leave them empty string "".
- avoid: array of modes to exclude, restricted strictly to ["cab", "bike", "bus", "auto", "ferry"]. For example "no bus" -> ["bus"], "avoid cab and bike" -> ["cab", "bike"]. Only include modes the user asked to avoid.
- peak: true if user mentions peak/rush hour, false if off-peak/afternoon/late night, omit/null if unspecified.
- smartCard: true if user mentions smart card, false if "no smart card", omit/null if unspecified.
- maxWalkKm: snap to nearest of 0.5, 1, 1.5, 2 if user specifies max walking distance; omit/null if unspecified.
- timeValuePer10Min: 0 if user wants cheapest / lowest fare / budget / kom khoroch; 100 if fastest / quickest; 20 if balanced / smart pick; omit/null if unspecified.
- budget: integer rupees if user specifies a maximum fare budget (e.g. "under 25", "below Rs 40"); omit/null if unspecified.
- summary: short plain-text summary (1 line, no emojis) of what was parsed.`;

function getAiClient(): GoogleGenAI | null {
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(
        `Request timed out after ${Math.round(ms / 1000)} seconds.`
      ) as Error & { status?: number };
      err.status = 504;
      reject(err);
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      if (attempt < maxAttempts && (status === 429 || (status !== undefined && status >= 500 && status !== 504))) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
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
          'GEMINI_API_KEY is not configured. Check your API key in Settings > Secrets.',
      });
      return;
    }

    try {
      const response = await withTimeout(
        generateWithRetry(() =>
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
        ),
        AI_TIMEOUT_MS
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      let message =
        err instanceof Error ? err.message : 'Failed to parse trip request with Gemini.';
      try {
        const parsedErr = JSON.parse(message) as { error?: { message?: string } };
        if (parsedErr?.error?.message) {
          message = parsedErr.error.message;
        }
      } catch {
        // leave plain message as-is
      }
      const status = (err as { status?: number })?.status;
      res.status(status && status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kom Khoroch server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
