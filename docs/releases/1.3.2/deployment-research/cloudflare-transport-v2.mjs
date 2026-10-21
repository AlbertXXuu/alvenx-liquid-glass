// Task-local transport adapter. It does not change Wrangler, product code,
// credentials, OS DNS or proxies. The fixed HTTPS upstream verifies normal TLS.
// Child output is private local evidence; relay headers/bodies are never logged.
import http from 'node:http';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { PassThrough, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';

const args = process.argv.slice(2);
const separator = args.indexOf('--');
const options = separator < 0 ? args : args.slice(0, separator);
const command = separator < 0 ? [] : args.slice(separator + 1);
if (options.includes('--help')) {
  console.log('Usage: node cloudflare-transport.mjs [--cwd <website-root>] [--receipt <json-path>] -- <Wrangler arguments>');
  console.log('Default command: deploy --config wrangler.deploy.jsonc. Child timeout: 5 minutes.');
  console.log('Read-only probe: -- whoami --config wrangler.deploy.jsonc');
  process.exit(0);
}
let website = process.cwd(), receiptPath;
for (let index = 0; index < options.length; index += 2) {
  const option = options[index], value = options[index + 1];
  if (!value || !['--cwd', '--receipt'].includes(option)) throw new Error('Unknown or incomplete wrapper option; use --help.');
  if (option === '--cwd') website = resolve(value);
  else receiptPath = resolve(value);
}
const commandArgs = command.length ? command : ['deploy', '--config', 'wrangler.deploy.jsonc'];
const out = dirname(fileURLToPath(import.meta.url));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const commandName = commandArgs[0].replace(/[^a-z0-9-]/gi, '').slice(0, 30) || 'command';
receiptPath ??= join(out, `cloudflare-transport-${stamp}-${commandName}.json`);
const logPath = receiptPath.replace(/\.json$/i, '') + '.private.log';
const cli = join(website, 'node_modules', 'wrangler', 'wrangler-dist', 'cli.js');
await access(cli);
await mkdir(dirname(receiptPath), { recursive: true });

const startedAt = new Date().toISOString();
let deadline = Date.now() + 300_000;
const MAX_ROUTES = 80, MAX_LOG_BYTES = 4 * 1024 * 1024;
const requests = [], statusCounts = {}, routeCounts = {}, failures = {};
const controllers = new Set();
// Curl uses normal TLS. Verified task-date IPs are optional per-command fallbacks.
const upstreamCandidates = ['104.19.192.174', '104.19.192.176', '104.19.192.177', '104.19.192.29'];
const preflight = [];
const readRetries = [];
let upstreamIp = upstreamCandidates[0];
const MAX_REQUEST_BODY_BYTES = 128 * 1024 * 1024;
const curlChildren = new Set(), configServers = new Set();

/** Curl config travels through a random Windows kernel pipe, leaving stdin for
 * the upload stream. Neither credentials nor request/response bodies touch disk
 * or command arguments. curl buffers at most the bounded incoming request. */
async function curlApi(url, { method = 'GET', headers = new Headers(), body, signal } = {}) {
  if (process.platform !== 'win32') throw Object.assign(new Error('This task adapter uses Windows kernel pipes.'), { code: 'WINDOWS_PIPE_REQUIRED' });
  const target = new URL(url);
  if (target.origin !== 'https://api.cloudflare.com' || !(target.pathname === '/client/v4' || target.pathname.startsWith('/client/v4/'))) throw Object.assign(new Error('Invalid fixed API target.'), { code: 'INVALID_TARGET' });
  const quote = value => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\r', '\\r').replaceAll('\n', '\\n')}"`;
  const configuredIp = upstreamIp;
  const config = [`url = ${quote(target.href)}`, `request = ${quote(method)}`];
  for (const [key, value] of headers) {
    if (body && key.toLowerCase() === 'expect') continue;
    config.push(`header = ${quote(`${key}: ${value}`)}`);
  }
  if (body && !headers.has('content-type')) config.push('header = "Content-Type:"');
  if (body) config.push('header = "Expect:"');
  const pipeName = `\\\\.\\pipe\\alvenx-cloudflare-${randomUUID()}`;
  const configServer = net.createServer(socket => { socket.end(config.join('\n') + '\n'); configServer.close(); });
  configServers.add(configServer);
  await new Promise((accept, reject) => { configServer.once('error', reject); configServer.listen(pipeName, accept); });
  const curlMetricsFormat = '%{stderr}\nALVENX_CURL_METRICS {"http_code":"%{http_code}","remote_ip":"%{remote_ip}","proxy_used":%{proxy_used},"size_upload":%{size_upload},"size_download":%{size_download},"time_connect":%{time_connect},"time_appconnect":%{time_appconnect},"time_starttransfer":%{time_starttransfer},"time_total":%{time_total},"exitcode":%{exitcode}}\n';
  const requestMaxSeconds = Math.max(1, Math.min(body ? 90 : 25, Math.ceil((deadline - Date.now()) / 1000)));
  const curlArgs = ['--disable', '--config', pipeName, '--silent', '--show-error', '--include', '--no-buffer', '--http1.1', '--ipv4', '--compressed', '--proto', '=https', '--connect-timeout', '8', '--max-time', String(requestMaxSeconds), '--write-out', curlMetricsFormat];
  curlArgs.push('--resolve', `api.cloudflare.com:443:${configuredIp}`);
  if (method === 'HEAD') curlArgs.push('--head');
  if (body) curlArgs.push('--data-binary', '@-');
  const worker = spawn('curl.exe', curlArgs, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  curlChildren.add(worker);
  const stream = new PassThrough({ highWaterMark: 64 * 1024 });
  stream.on('error', () => {}); // The consumer pipeline still receives the error.
  let buffer = Buffer.alloc(0), headerReady = false, responseInfo, streamFailed = false;
  let requestBodyBytes = 0, uploadPipeError = null, curlMetrics = null, curlErrorSummary = null;
  let stderrText = '', stderrBytes = 0;
  const diagnostics = () => ({ configuredIp, requestMaxSeconds, requestBodyBytes, uploadPipeError, metrics: curlMetrics, stderrSummary: curlErrorSummary });
  let acceptReady, rejectReady, acceptDone, rejectDone;
  const ready = new Promise((accept, reject) => { acceptReady = accept; rejectReady = reject; });
  const finished = new Promise((accept, reject) => { acceptDone = accept; rejectDone = reject; });
  void finished.catch(() => {});
  const fail = (code) => {
    if (streamFailed) return;
    streamFailed = true;
    const error = Object.assign(new Error(code), { code, curlDiagnostics: diagnostics() });
    if (headerReady) stream.destroy(error); else rejectReady(error);
    rejectDone(error);
  };
  const abort = () => { worker.kill(); fail('CURL_ABORTED'); };
  signal?.addEventListener('abort', abort, { once: true });
  // Preserve only numeric/address transport metrics and a bounded curl error
  // line. Never retain headers, config, tokens, URLs, or response bodies.
  worker.stderr.on('data', chunk => {
    const remaining = 16 * 1024 - stderrBytes;
    if (remaining > 0) { const clipped = chunk.subarray(0, remaining); stderrText += clipped.toString('utf8'); stderrBytes += clipped.length; }
  });
  worker.stdin.on('error', () => {});
  stream.on('drain', () => worker.stdout.resume());
  worker.stdout.on('data', chunk => {
    if (streamFailed) return;
    if (headerReady) { if (!stream.write(chunk)) worker.stdout.pause(); return; }
    buffer = Buffer.concat([buffer, chunk]);
    while (!headerReady) {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) { if (buffer.length > 64 * 1024) { fail('CURL_HEADER_LIMIT'); worker.kill(); } return; }
      const block = buffer.subarray(0, end).toString('latin1'); buffer = buffer.subarray(end + 4);
      const lines = block.split('\r\n'), status = Number(lines[0]?.match(/^HTTP\/\S+\s+(\d{3})/)?.[1]);
      if (!status) { fail('CURL_INVALID_STATUS'); worker.kill(); return; }
      if (status < 200 || /Connection established/i.test(lines[0])) continue;
      const returned = new Headers();
      for (const line of lines.slice(1)) { const colon = line.indexOf(':'); if (colon > 0) returned.append(line.slice(0, colon), line.slice(colon + 1).trim()); }
      headerReady = true; responseInfo = { status, headers: returned, body: stream, finished, diagnostics };
      acceptReady(responseInfo);
      if (buffer.length && !stream.write(buffer)) worker.stdout.pause();
      buffer = Buffer.alloc(0);
    }
  });
  worker.once('error', error => fail(String(error.code ?? 'CURL_SPAWN_FAILED')));
  worker.once('close', code => {
    for (const line of stderrText.split(/\r?\n/)) {
      if (line.startsWith('ALVENX_CURL_METRICS ')) {
        try {
          const parsed = JSON.parse(line.slice('ALVENX_CURL_METRICS '.length));
          const numeric = ['proxy_used', 'size_upload', 'size_download', 'time_connect', 'time_appconnect', 'time_starttransfer', 'time_total', 'exitcode'];
          const filtered = {};
          for (const key of numeric) if (Number.isFinite(parsed[key])) filtered[key] = parsed[key];
          if (/^\d{3}$/.test(parsed.http_code)) filtered.http_code = Number(parsed.http_code);
          if (typeof parsed.remote_ip === 'string' && /^[0-9a-fA-F:.]*$/.test(parsed.remote_ip)) filtered.remote_ip = parsed.remote_ip;
          curlMetrics = filtered;
        } catch { curlMetrics = { parseError: true }; }
      } else if (/^curl: \(\d+\)/.test(line)) {
        curlErrorSummary = /authorization|bearer|token|cookie/i.test(line) ? '[credential-related diagnostic redacted]' : line.replace(/https?:\/\/\S+/g, '[url]').slice(0, 240);
      }
    }
    stderrText = '';
    signal?.removeEventListener('abort', abort); curlChildren.delete(worker);
    configServer.close(); configServers.delete(configServer);
    if (code !== 0) fail(`CURL_EXIT_${code}`);
    else if (!headerReady) fail('CURL_NO_RESPONSE');
    else if (!streamFailed) { stream.end(); acceptDone(); }
  });
  if (body) {
    const limit = new Transform({ transform(chunk, _encoding, callback) { requestBodyBytes += chunk.length; callback(requestBodyBytes > MAX_REQUEST_BODY_BYTES ? Object.assign(new Error('Request body limit'), { code: 'REQUEST_BODY_LIMIT' }) : null, chunk); } });
    void pipeline(body, limit, worker.stdin).catch(error => {
      uploadPipeError = String(error.code ?? error.name ?? 'UPLOAD_PIPE_ERROR').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
      if (error.code === 'REQUEST_BODY_LIMIT') { fail('REQUEST_BODY_LIMIT'); worker.kill(); }
    });
  } else worker.stdin.end();
  if (signal?.aborted) abort();
  return ready;
}
let child, timer, timedOut = false, interrupted = false, childCode = null, childSignal = null;
let output = '', outputBytes = 0, outputTruncated = false, activeRequests = 0, maximumActiveRequests = 0;
const decoderOut = new StringDecoder('utf8'), decoderError = new StringDecoder('utf8');
function appendLog(chunk, decoder) {
  const text = decoder.write(chunk), remaining = MAX_LOG_BYTES - outputBytes;
  if (remaining > 0) {
    const clipped = Buffer.from(text).subarray(0, remaining).toString('utf8');
    output += clipped; outputBytes += Buffer.byteLength(clipped);
  }
  if (Buffer.byteLength(text) > remaining) outputTruncated = true;
}
function routeClass(path) {
  const top = path.split('/')[3];
  return `/client/v4/${['user', 'accounts', 'memberships', 'zones'].includes(top) ? top : 'other'}`;
}
function observe(record) {
  if (requests.length < MAX_ROUTES) requests.push(record);
  const key = `${record.method} ${record.route}`;
  routeCounts[key] = (routeCounts[key] ?? 0) + 1;
  if (record.status) statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;
  if (record.error) failures[record.error] = (failures[record.error] ?? 0) + 1;
}
const hopHeaders = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length']);
const server = http.createServer(async (request, response) => {
  const started = Date.now(), method = request.method ?? 'GET';
  let upstream;
  try {
    if (!request.url?.startsWith('/') || request.url.startsWith('//')) throw new Error('Invalid route');
    upstream = new URL(request.url, 'https://api.cloudflare.com');
    if (upstream.origin !== 'https://api.cloudflare.com' || !(upstream.pathname === '/client/v4' || upstream.pathname.startsWith('/client/v4/'))) throw new Error('Invalid route');
  } catch {
    observe({ method, route: '/rejected', status: 400 }); response.writeHead(400).end(); request.resume(); return;
  }
  const route = routeClass(upstream.pathname), controller = new AbortController();
  controllers.add(controller); activeRequests++; maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
  const requestTimer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()));
  const abortRequest = () => controller.abort();
  const abortResponse = () => { if (!response.writableEnded) controller.abort(); };
  request.on('aborted', abortRequest); response.on('close', abortResponse);
  try {
    const headers = new Headers();
    for (let index = 0; index < request.rawHeaders.length; index += 2) {
      const key = request.rawHeaders[index];
      if (!hopHeaders.has(key.toLowerCase())) headers.append(key, request.rawHeaders[index + 1]);
    }
    const hasBody = method !== 'GET' && method !== 'HEAD';
    let result;
    for (let attempt = 0; ; attempt++) {
      try {
        result = await curlApi(upstream, { method, headers, signal: controller.signal, ...(hasBody ? { body: request } : {}) });
        break;
      } catch (error) {
        // Only replay intrinsically read-only requests. Streaming write bodies
        // are never retried, because an uncertain result must remain explicit.
        if (hasBody || attempt >= upstreamCandidates.length - 1 || controller.signal.aborted) throw error;
        const code = String(error.cause?.code ?? error.code ?? error.name).replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
        if (readRetries.length < MAX_ROUTES) readRetries.push({ method, route, failedIp: upstreamIp, error: code, attempt: attempt + 1, curl: error.curlDiagnostics ?? null });
        upstreamIp = upstreamCandidates[(upstreamCandidates.indexOf(upstreamIp) + 1) % upstreamCandidates.length];
      }
    }
    const returned = {};
    for (const [key, value] of result.headers) {
      if (!hopHeaders.has(key.toLowerCase()) && key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'set-cookie') returned[key] = value;
    }
    const cookies = result.headers.getSetCookie?.();
    if (cookies?.length) returned['set-cookie'] = cookies;
    // Keep an upstream redirect inside the same fixed relay scope. Never create
    // an arbitrary proxy or send credentials to a different upstream host.
    if (returned.location) {
      const location = new URL(returned.location, upstream);
      if (location.origin === upstream.origin && location.pathname.startsWith('/client/v4/')) returned.location = location.pathname + location.search;
    }
    response.writeHead(result.status, returned);
    if (result.body) await pipeline(result.body, response);
    else response.end();
    await result.finished;
    observe({ method, route, status: result.status, elapsedMs: Date.now() - started, curl: result.diagnostics?.() ?? null });
  } catch (error) {
    const errorClass = error.name === 'AbortError' ? 'aborted' : String(error.cause?.code ?? error.code ?? error.name ?? 'transport-error').replace(/[^a-z0-9_-]/gi, '').slice(0, 60);
    observe({ method, route, error: errorClass, elapsedMs: Date.now() - started, curl: error.curlDiagnostics ?? null });
    if (!response.headersSent && !response.destroyed) response.writeHead(502).end();
    else response.destroy();
  } finally {
    clearTimeout(requestTimer); request.off('aborted', abortRequest); response.off('close', abortResponse);
    controllers.delete(controller); activeRequests--;
  }
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
const address = server.address();
const apiBase = `http://127.0.0.1:${address.port}/client/v4`;
function terminateChild() {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.on('error', () => child.kill());
  } else child.kill('SIGTERM');
}
const interrupt = () => { interrupted = true; terminateChild(); for (const controller of controllers) controller.abort(); };
process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
let wrapperError;
try {
  let ready = false;
  for (const candidate of upstreamCandidates) {
    upstreamIp = candidate;
    try {
      const result = await curlApi('https://api.cloudflare.com/client/v4/user', { signal: AbortSignal.timeout(9000) });
      preflight.push({ ip: candidate, status: result.status });
      for await (const _chunk of result.body) { /* Discard the unauthenticated body without retaining it. */ }
      await result.finished;
      if ([200, 401, 403].includes(result.status)) { ready = true; break; }
    } catch (error) { preflight.push({ ip: candidate, error: String(error.cause?.code ?? error.code ?? error.name).replace(/[^a-z0-9_-]/gi, '').slice(0, 60), curl: error.curlDiagnostics ?? null }); }
  }
  if (!ready) throw Object.assign(new Error('No current upstream transport passed its read-only preflight.'), { code: 'UPSTREAM_PREFLIGHT_FAILED' });
  // The five-minute child budget starts only after read-only transport probing.
  deadline = Date.now() + 300_000;
  await new Promise((accept, reject) => {
    child = spawn(process.execPath, ['--no-warnings', cli, ...commandArgs], {
      cwd: website, windowsHide: true,
      env: { ...process.env, CLOUDFLARE_API_BASE_URL: apiBase, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG: 'log', WRANGLER_WRITE_LOGS: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', chunk => appendLog(chunk, decoderOut));
    child.stderr.on('data', chunk => appendLog(chunk, decoderError));
    child.once('error', reject);
    child.once('close', (code, signal) => { childCode = code; childSignal = signal; accept(); });
    timer = setTimeout(() => { timedOut = true; terminateChild(); for (const controller of controllers) controller.abort(); }, Math.max(1, deadline - Date.now()));
  });
} catch (error) { wrapperError = String(error.code ?? error.name ?? 'wrapper-error').replace(/[^a-z0-9_-]/gi, '').slice(0, 60); }
finally {
  clearTimeout(timer); process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  terminateChild(); for (const controller of controllers) controller.abort();
  for (const worker of curlChildren) worker.kill();
  for (const ipc of configServers) ipc.close();
  server.closeAllConnections(); await new Promise(accept => server.close(accept));
  output += decoderOut.end() + decoderError.end();
}
// Normal info output is useful private release evidence. Never persist apparent
// authentication headers, token assignments or cookies if a child prints them.
const plainOutput = output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const privateLog = plainOutput.split(/\r?\n/).map(line => /(?:authorization\s*[:=]|\bbearer\s+|(?:oauth|refresh|access|api)[_-]?token\s*["']?\s*[:=]|\b(?:set-cookie|cookie)\s*:)/i.test(line) ? '[credential-related child output redacted]' : line).join('\n');
await writeFile(logPath, privateLog, { encoding: 'utf8', mode: 0o600 });
const version = plainOutput.match(/Current Version ID:\s*([a-f0-9-]{36})/i)?.[1] ?? null;
const receipt = {
  schemaVersion: 1, startedAtUtc: startedAt, completedAtUtc: new Date().toISOString(),
  purpose: 'Task-local Wrangler HTTP transport; no product, dependency, OS network or credential changes',
  childCommand: ['wrangler', commandName], childArgumentCount: commandArgs.length, childExitCode: childCode, childSignal,
  timedOut, interrupted, wrapperError: wrapperError ?? null,
  success: childCode === 0 && !timedOut && !interrupted && !wrapperError,
  authenticationReported: plainOutput.includes('You are logged in'), deployedWorkerVersion: version,
  upstream: 'https://api.cloudflare.com/client/v4', tlsVerification: 'normal curl HTTPS verification; no insecure option',
  transport: 'curl; config/credentials in ephemeral Windows kernel pipe, bounded upload on stdin, response headers parsed in memory',
  maximumRequestBodyBytes: MAX_REQUEST_BODY_BYTES, bodyFilesCreated: false,
  adapterVersion: 2, requestTimeouts: { connectSeconds: 8, readSeconds: 25, writeSeconds: 90 }, expectContinueDisabledForUploads: true,
  upstreamDns: { scope: 'wrapper process only', selectedIp: upstreamIp, preflight },
  readOnlyTransportRetries: readRetries,
  listener: '127.0.0.1 ephemeral port; closed after child completion',
  methodAndRouteCounts: routeCounts, apiStatusCounts: statusCounts, transportFailureCounts: failures,
  sampledRequests: requests, sampleLimit: MAX_ROUTES, maximumActiveRequests,
  childLog: { path: logPath, private: true, maxBytes: MAX_LOG_BYTES, truncated: outputTruncated, credentialLinesRedacted: true },
};
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
const summary = { status: receipt.success ? 'passed' : 'failed', childExitCode: childCode, timedOut, interrupted, authenticationReported: receipt.authenticationReported, deployedWorkerVersion: version, apiStatusCounts: statusCounts, transportFailureCounts: failures, receipt: receiptPath, privateLog: logPath };
await new Promise(accept => process.stdout.write(JSON.stringify(summary) + '\n', accept));
process.exit(receipt.success ? 0 : timedOut ? 124 : 1);
