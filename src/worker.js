// Cloudflare Worker: serves the static arcade from ./public and proxies
// /api/* to Airtable server-side, so the Airtable token never reaches the
// browser. Configure the token as a secret named AIRTABLE_TOKEN in the
// Worker's Settings -> Variables and Secrets.

const AIRTABLE_BASE = 'appjdr98QEubdKKna';

const TABLES = {
  missions: 'tbl9IBRqsNGZWSKCJ',
  branches: 'tbl85y70gsioMdlql',
  staff: 'tblr8wA0mj4ZXpCnf',
  sessions: 'tblLwAgtWCmlJ4iQP',
  activity: 'tblOWopl1f8fMNv24',
  officials: 'tblBbHu6xGfAeSp9A'
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleApi(request, env, url) {
  const resource = url.pathname.split('/')[2]; // /api/<resource>
  const method = request.method;

  if (!env.AIRTABLE_TOKEN) {
    return json({ error: 'Server is missing the AIRTABLE_TOKEN secret' }, 500);
  }

  const tableId = TABLES[resource];
  if (!tableId) {
    return json({ error: `Unknown resource: ${resource}` }, 404);
  }

  if (!['GET', 'POST', 'PATCH'].includes(method)) {
    return json({ error: 'Method not allowed' }, 405);
  }

  const target = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}${method === 'GET' ? url.search : ''}`;

  const init = {
    method,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (method !== 'GET') {
    init.body = await request.text();
  }

  const resp = await fetch(target, init);
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  }
};
