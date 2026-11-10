import http from 'node:http';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { Groth16Client } from '@qmoosa/zk-groth16-sdk';

export const MAX_BODY_BYTES = 128 * 1024;
const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/examples/normal.json', ['examples/normal.json', 'application/json']],
  ['/examples/zero.json', ['examples/zero.json', 'application/json']]
]);
class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let total = 0; let chunks = []; let rejected = false;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        chunks = [];
        if (!rejected) { rejected = true; reject(new RequestError(413, 'Request exceeds 128 KiB.')); }
      } else if (!rejected) chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new RequestError(400, 'Request must contain valid JSON.')); }
    });
    req.on('error', () => reject(new RequestError(400, 'Request could not be read.')));
  });
}
function validateArtifact(artifact, label) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
    throw new RequestError(400, label + ' must be a JSON object.');
  }
  if (artifact.protocol !== 'groth16' || !['bn128', 'bn254'].includes(artifact.curve)) {
    throw new RequestError(400, label + ' must identify Groth16 on BN254/bn128.');
  }
}
export function createDashboardServer() {
  const client = new Groth16Client();
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const port = server.address()?.port;
      const hosts = ['127.0.0.1:' + port, 'localhost:' + port];
      if (!hosts.includes(req.headers.host)) throw new RequestError(403, 'Local host required.');
      if (req.headers.origin && !hosts.map(x => 'http://' + x).includes(req.headers.origin)) {
        throw new RequestError(403, 'Same-origin requests required.');
      }
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (pathname === '/api/verify') {
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new RequestError(405, 'Use POST for verification.'); }
        if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          throw new RequestError(415, 'Use application/json.');
        }
        const body = await readJson(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError(400, 'Expected a verification request object.');
        validateArtifact(body.verifyingKey, 'Verification key'); validateArtifact(body.proof, 'Proof');
        if (!Array.isArray(body.publicInputs) || body.publicInputs.length > 256) throw new RequestError(400, 'Public inputs must be an array with at most 256 values.');
        let valid; let calldata;
        try {
          const key = client.parseSnarkJsVk(body.verifyingKey);
          const proof = client.parseSnarkJsProof(body.proof);
          valid = client.verify(key, proof, body.publicInputs);
          if (valid) calldata = client.exportCalldata(proof, body.publicInputs);
        } catch { throw new RequestError(400, 'Invalid proof, verification key or public inputs.'); }
        send(200, { valid, message: valid ? 'Proof valid for this key and these public inputs.' : 'Proof does not verify for this key and these public inputs.', ...(valid ? { calldata } : {}) });
        return;
      }
      if (!assets.has(pathname)) throw new RequestError(404, 'Not found.');
      if (req.method !== 'GET') throw new RequestError(405, 'Use GET for this resource.');
      const [name, type] = assets.get(pathname);
      const content = await fs.readFile(path.join(publicDir, name));
      res.writeHead(200, { 'Content-Type': type }); res.end(content);
    } catch (err) {
      send(err instanceof RequestError ? err.status : 500, { error: err instanceof RequestError ? err.message : 'Verification service unavailable.' });
    }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  const server = createDashboardServer();
  server.listen(port, '127.0.0.1', () => console.log('Groth16 verifier: http://127.0.0.1:' + server.address().port));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { server.close(); server.closeAllConnections(); });
}
