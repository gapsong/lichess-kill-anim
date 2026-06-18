import { defineConfig } from 'vite';
import { execFile } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const GENERATE_SCRIPT = join(REPO_ROOT, 'lab', 'scripts', 'generate.mjs');

function generatePlugin() {
  return {
    name: 'lab-generate',
    configureServer(server) {
      server.middlewares.use('/api/generate', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;
        const { piece, championId, count = 8 } = JSON.parse(body);

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY env var not set' }));
          return;
        }

        try {
          // Build the generator prompt
          const { stdout: prompt } = await execFileAsync(
            'node',
            [GENERATE_SCRIPT, piece, championId, '--count', String(count), '--print-prompt'],
            { cwd: REPO_ROOT, maxBuffer: 4 * 1024 * 1024 }
          );

          // Call the Anthropic API
          const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 16000,
              messages: [{ role: 'user', content: prompt }]
            })
          });

          if (!apiRes.ok) {
            const text = await apiRes.text();
            throw new Error(`Anthropic API ${apiRes.status}: ${text.slice(0, 300)}`);
          }

          const apiJson = await apiRes.json();
          const responseText = apiJson.content?.[0]?.text;
          if (!responseText) throw new Error('No text content in API response');

          // Write response to tmpfile and apply
          const tmpFile = join(tmpdir(), `lab-generate-${Date.now()}.md`);
          writeFileSync(tmpFile, responseText);

          let applyOut = '';
          try {
            const { stdout } = await execFileAsync(
              'node',
              [GENERATE_SCRIPT, piece, championId, '--count', String(count), '--apply', tmpFile],
              { cwd: REPO_ROOT, maxBuffer: 1024 * 1024 }
            );
            applyOut = stdout;
          } finally {
            try { unlinkSync(tmpFile); } catch { /* ignore */ }
          }

          // Parse written IDs from apply stdout: "generate: wrote N variants: v004, v005, ..."
          const match = applyOut.match(/wrote \d+ variants?: ([^\n]+)/);
          const ids = match ? match[1].split(',').map((s) => s.trim()) : [];

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, ids }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [generatePlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  }
});
