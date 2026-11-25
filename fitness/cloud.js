/* FitDuell – Online-Anbindung (Supabase): Konto, Freunde, Digests, Duelle, Echtzeit */
(function () {
  'use strict';
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  let client = null, loading = null, channel = null;

  function config() {
    let local = {};
    try { local = JSON.parse(localStorage.getItem('fx.cloudcfg') || '{}'); } catch { /* ignorieren */ }
    const base = window.FITDUELL_CONFIG || {};
    const url = (local.supabaseUrl || base.supabaseUrl || '').trim();
    const key = (local.supabaseAnonKey || base.supabaseAnonKey || '').trim();
    return url && key ? { url, key, fromFile: !local.supabaseUrl } : null;
  }
  const configured = () => !!config();

  function loadLib() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = LIB; s.onload = res;
      s.onerror = () => { loading = null; rej(new Error('Supabase-Bibliothek konnte nicht geladen werden')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  async function getClient() {
    const cfg = config(); if (!cfg) throw new Error('Online-Modus ist nicht eingerichtet');
    if (client) return client;
    await loadLib();
    client = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, storageKey: 'fx.sb.auth' } });
    return client;
  }
  const check = r => { if (r.error) throw new Error(r.error.message || 'Serverfehler'); return r.data; };

  async function currentUser() {
    if (!configured()) return null;
    const c = await getClient();
    const { data } = await c.auth.getSession();
    return data.session?.user || null;
  }
  async function signUp(email, password, name) {
    const c = await getClient();
    const d = check(await c.auth.signUp({ email, password, options: { data: { name } } }));
    return { user: d.user, needsConfirm: !d.session };
  }
  async function signIn(email, password) {
    const c = await getClient();
    return check(await c.auth.signInWithPassword({ email, password })).user;
  }
  async function signOut() { if (client) { unsubscribe(); await client.auth.signOut(); } }

  /** Eigenen Digest hochladen; liefert den Freundes-Code */
  async function pushDigest(p) {
    const c = await getClient(); const user = await currentUser(); if (!user) throw new Error('Nicht angemeldet');
    const row = { user_id: user.id, name: p.name, color: p.color, goal: p.goal, since: p.since, data: { days: p.days, weights: p.weights }, updated_at: new Date().toISOString() };
    const d = check(await c.from('digests').upsert(row, { onConflict: 'user_id' }).select('friend_code').single());
    return d.friend_code;
  }
  function rowToDigest(r) {
    const days = (r.data && r.data.days) || {};
    for (const d of Object.values(days)) { for (const f of ['vol', 'wo', 'kcal', 'steps', 'min', 'cardio', 'water', 'food']) d[f] = d[f] || 0; d.reps = d.reps || {}; d.sec = d.sec || {}; d.max = d.max || {}; }
    return { id: r.user_id, name: r.name, color: r.color, goal: r.goal, since: r.since || new Date().toISOString().slice(0, 10), days, weights: (r.data && r.data.weights) || [], at: Date.parse(r.updated_at) || Date.now(), cloud: true };
  }
  /** Freunde inkl. Digests laden */
  async function friends() {
    const c = await getClient(); const user = await currentUser(); if (!user) return [];
    const fr = check(await c.from('friendships').select('friend_id').eq('user_id', user.id));
    if (!fr.length) return [];
    const rows = check(await c.from('digests').select('user_id,name,color,goal,since,data,updated_at').in('user_id', fr.map(f => f.friend_id)));
    return rows.map(rowToDigest);
  }
  async function addFriend(code) { const c = await getClient(); return check(await c.rpc('add_friend', { code })); }
  async function removeFriend(fid) { const c = await getClient(); check(await c.rpc('remove_friend', { fid })); }

  async function duels() {
    const c = await getClient(); const user = await currentUser(); if (!user) return [];
    const rows = check(await c.from('duels').select('*').order('start_date', { ascending: false }));
    return rows.map(r => ({ id: 'c-' + r.id, cloudId: r.id, cloud: true, friendId: 'cloud-' + (r.challenger === user.id ? r.opponent : r.challenger), challenger: r.challenger === user.id, type: r.type, ex: r.exercise || undefined, start: r.start_date, end: r.end_date }));
  }
  async function createDuel(d, opponentId) {
    const c = await getClient(); const user = await currentUser();
    check(await c.from('duels').insert({ challenger: user.id, opponent: opponentId, type: d.type, exercise: d.ex || null, start_date: d.start, end_date: d.end }));
  }
  async function deleteDuel(cloudId) { const c = await getClient(); check(await c.from('duels').delete().eq('id', cloudId)); }

  /** Echtzeit: bei Änderungen an Digests/Duellen benachrichtigen */
  async function subscribe(cb) {
    const c = await getClient(); unsubscribe();
    channel = c.channel('fitduell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digests' }, () => cb('digests'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, () => cb('duels'))
      .subscribe();
  }
  function unsubscribe() { if (channel && client) { client.removeChannel(channel); } channel = null; }

  function saveLocalConfig(url, key) {
    if (url && key) localStorage.setItem('fx.cloudcfg', JSON.stringify({ supabaseUrl: url.trim(), supabaseAnonKey: key.trim() }));
    else localStorage.removeItem('fx.cloudcfg');
    client = null; channel = null;
  }

  window.FitCloud = { configured, config, saveLocalConfig, currentUser, signUp, signIn, signOut, pushDigest, friends, addFriend, removeFriend, duels, createDuel, deleteDuel, subscribe, unsubscribe };
})();
