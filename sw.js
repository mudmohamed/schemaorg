const CACHE='power-ai-v2';
const CORE=['/','/index.html','/manifest.webmanifest','/power-ai-icon.svg'];
const SUPABASE_ORIGIN='https://uppdrbhtxgczpapfxgdk.supabase.co';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

async function usernameLogin(req){
  const body=await req.clone().json();
  const username=String(body?.email||'').trim();
  const password=String(body?.password||'');
  if(!username || username.includes('@')) return fetch(req);
  return fetch(SUPABASE_ORIGIN+'/functions/v1/power-ai-login',{
    method:'POST',
    mode:'cors',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username,password})
  });
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);

  // The existing page sends login values to Supabase's password endpoint.
  // When the login value is a username (no @), securely route it to the
  // POWER AI username-auth function. Email logins continue unchanged.
  if(req.method==='POST' && url.origin===SUPABASE_ORIGIN && url.pathname==='/auth/v1/token' && url.searchParams.get('grant_type')==='password'){
    event.respondWith(usernameLogin(req));
    return;
  }

  if(req.method!=='GET') return;
  if(url.origin!==self.location.origin) return;

  if(url.pathname.startsWith('/data/')){
    event.respondWith(
      fetch(req)
        .then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;})
        .catch(()=>caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req)
      .then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;})
      .catch(()=>caches.match('/index.html')))
  );
});
