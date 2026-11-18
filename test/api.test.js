import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import apiApp from '../api/index.js';

function invokeApp(app, { method = 'POST', url = '/api/parse', body = {} }) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf8');
    const req = Readable.from([payload]);
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': String(payload.length),
    };
    req.connection = {};
    req.socket = {};

    const res = new EventEmitter();
    res.statusCode = 200;
    const headers = {};
    let chunks = '';
    res.setHeader = (k, v) => {
      headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => headers[k.toLowerCase()];
    res.removeHeader = (k) => {
      delete headers[k.toLowerCase()];
    };
    res.writeHead = (code, hdrs = {}) => {
      res.statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) {
        headers[k.toLowerCase()] = v;
      }
      return res;
    };
    res.write = (chunk) => {
      chunks += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      return true;
    };
    res.end = (chunk) => {
      if (chunk) res.write(chunk);
      res.emit('finish');
      try {
        resolve({
          status: res.statusCode,
          body: chunks ? JSON.parse(chunks) : null,
        });
      } catch {
        resolve({ status: res.statusCode, body: chunks });
      }
    };

    app(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

test('api/index.js exports Express app and handles /api/parse validation & missing key', async () => {
  assert.equal(typeof apiApp, 'function');

  const emptyRes = await invokeApp(apiApp, {
    method: 'POST',
    url: '/api/parse',
    body: { query: '   ' },
  });
  assert.equal(emptyRes.status, 400);
  assert.match(emptyRes.body.error, /enter a trip phrase/i);

  const prevKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  try {
    const noKeyRes = await invokeApp(apiApp, {
      method: 'POST',
      url: '/api/parse',
      body: { query: 'Serampore to Sector V' },
    });
    assert.equal(noKeyRes.status, 503);
    assert.match(noKeyRes.body.error, /GEMINI_API_KEY/i);
  } finally {
    if (prevKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = prevKey;
    }
  }
});

test('vercel.json configures dist output and SPA + API rewrites', () => {
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')
  );
  assert.equal(vercelConfig.outputDirectory, 'dist');
  assert.deepEqual(vercelConfig.rewrites, [
    { source: '/api/(.*)', destination: '/api/index' },
    { source: '/(.*)', destination: '/index.html' },
  ]);
});
