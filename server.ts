import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getMapsApiKey(): string {
  return process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
}

function extractWebSources(
  groundingChunks: Array<{ web?: { uri?: string; title?: string } }> | undefined
): Array<{ title: string; uri: string }> {
  if (!groundingChunks || !Array.isArray(groundingChunks)) return [];
  const seen = new Set<string>();
  const results: Array<{ title: string; uri: string }> = [];
  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    results.push({
      title: chunk.web?.title || uri,
      uri,
    });
  }
  return results;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Provide Google Maps API key configuration for client Map initialization
  app.get('/api/config/maps', (_req, res) => {
    res.json({ apiKey: getMapsApiKey() });
  });

  // Server-side Geocoding proxy (avoids browser CORS restriction on Geocoding REST API)
  app.post('/api/geocode', async (req, res) => {
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    if (!address) {
      res.status(400).json({ error: 'Address is required for geocoding.' });
      return;
    }

    const mapsKey = getMapsApiKey();
    if (!mapsKey) {
      res.status(503).json({ error: 'Google Maps API key is not configured.' });
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${encodeURIComponent(mapsKey)}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          formatted_address?: string;
          geometry?: { location?: { lat: number; lng: number } };
        }>;
      };

      if (response.status === 429 || data.status === 'OVER_QUERY_LIMIT') {
        res.status(429).json({
          status: 'RESOURCE_EXHAUSTED',
          error: data.error_message || 'Google Maps Geocoding quota exceeded.',
        });
        return;
      }

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        res.status(404).json({
          error: data.error_message || `No coordinates found for "${address}".`,
        });
        return;
      }

      const first = data.results[0];
      const location = first.geometry?.location;
      if (!location) {
        res.status(404).json({ error: 'Geocoding response missing geometry coordinates.' });
        return;
      }

      res.json({
        lat: location.lat,
        lng: location.lng,
        formattedAddress: first.formatted_address || address,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to geocode birthplace.',
      });
    }
  });

  // Google Search Grounding: Historical & Regional Context for a selected relative
  app.post('/api/research/historical-context', async (req, res) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const surname = typeof req.body?.surname === 'string' ? req.body.surname.trim() : '';
    const birthplace = typeof req.body?.birthplace === 'string' ? req.body.birthplace.trim() : '';
    const birthYear = Number(req.body?.birthYear) || 1900;
    const occupation = typeof req.body?.occupation === 'string' ? req.body.occupation.trim() : '';

    if (!birthplace && !surname) {
      res.status(400).json({ error: 'Birthplace or surname is required for historical research.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const prompt = [
        `Research accurate historical, genealogical, and archival context for a person recorded with these details:`,
        fullName ? `- Name: ${fullName}` : '',
        surname ? `- Family surname: ${surname}` : '',
        birthplace ? `- Birthplace / Region: ${birthplace}` : '',
        `- Birth Year: ${birthYear}`,
        occupation ? `- Recorded Occupation: ${occupation}` : '',
        '',
        `Provide a concise 2-to-3 paragraph historical brief covering:`,
        `1. Real civil, parish, or national archival repositories and census records that cover ${birthplace} around ${birthYear}.`,
        `2. Historical social, economic, or migration context in ${birthplace} during the ${Math.floor(birthYear / 10) * 10}s–${Math.floor((birthYear + 30) / 10) * 10}s relevant to ${occupation || 'local residents'}.`,
        `3. Brief factual etymology or regional distribution of the surname "${surname}" if documented.`,
        `Keep the tone concise, scholarly, and grounded strictly in verified sources.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'You are a genealogical archivist and historian. Provide concise, factual historical context and real archival repository guidance grounded in Google Search results. Do not fabricate specific private individual records.',
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
        | Array<{ web?: { uri?: string; title?: string } }>
        | undefined;
      const sources = extractWebSources(chunks);

      res.json({
        summary: (response.text || '').trim(),
        sources,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch historical context.';
      const statusCode = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  // Google Search Grounding: Surname Origin & Real Genealogy Registries
  app.post('/api/research/surname-archives', async (req, res) => {
    const surname = typeof req.body?.surname === 'string' ? req.body.surname.trim() : '';
    const regionLabel = typeof req.body?.regionLabel === 'string' ? req.body.regionLabel.trim() : '';
    const birthplace = typeof req.body?.birthplace === 'string' ? req.body.birthplace.trim() : '';
    const earliestYear = Number(req.body?.earliestYear) || 1850;

    if (!surname) {
      res.status(400).json({ error: 'Surname is required for archive search.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const prompt = [
        `Using Google Search, find factual genealogical research resources and surname origin details for:`,
        `- Surname: ${surname}`,
        birthplace ? `- Modern Birthplace: ${birthplace}` : '',
        regionLabel ? `- Heritage Region: ${regionLabel}` : '',
        `- Earliest Documented Era: c. ${earliestYear}`,
        '',
        `Summarize in 3 concise bulleted sections:`,
        `1. Documented origin, meaning, and historic geographic distribution of the surname "${surname}".`,
        `2. Official national archives, civil registration offices, parish registers, or public genealogy databases useful for tracing "${surname}" in ${birthplace || regionLabel} back to ${earliestYear}.`,
        `3. Practical search tips (spelling variants, parish boundaries, passenger/census indexes).`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction:
            'You are a professional genealogical researcher. Return factual surname history and real, verifiable archive institutions from Google Search.',
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
        | Array<{ web?: { uri?: string; title?: string } }>
        | undefined;
      const sources = extractWebSources(chunks);

      res.json({
        summary: (response.text || '').trim(),
        sources,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search archival repositories.';
      const statusCode = message.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(statusCode).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lineage Atlas server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
