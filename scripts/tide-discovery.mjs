// Read-only discovery against Tide's officially documented remote MCP endpoint.
const url = 'https://mcp.tide.org/mcp';
let session;
let sequence = 0;
async function rpc(method, params = {}) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  if (session) headers['mcp-session-id'] = session;
  const response = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++sequence, method, params }),
    signal: AbortSignal.timeout(25000),
  });
  session = response.headers.get('mcp-session-id') || session;
  const raw = await response.text();
  if (!response.ok) throw new Error(`Tide MCP HTTP ${response.status}: ${raw.slice(0, 500)}`);
  if (raw.startsWith('event:') || raw.startsWith('data:')) {
    const messages = raw.split('\n').filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5)));
    return messages.find(message => message.id === sequence);
  }
  return JSON.parse(raw);
}
await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'zero-spyware-edge-setup', version: '1.0' } });
if (process.argv[2]) {
  const called = await rpc('tools/call', { name: process.argv[2], arguments: JSON.parse(process.argv[3] || '{}') });
  for (const entry of called.result?.content || []) if (entry.text) console.log(entry.text);
} else {
  const result = await rpc('tools/list');
  console.log(JSON.stringify(result.result?.tools.map(({ name, description }) => ({ name, description })), null, 2));
}
