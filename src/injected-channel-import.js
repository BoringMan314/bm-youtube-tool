/* Injected into a signed-in www.youtube.com channel or watch tab.
 * Requests stay on www.youtube.com; no credentials are exported.
 * Imports channel videos oldest-first into an editable playlist.
 */
void (async () => {
  'use strict';
  const messages = window.bmChannelImportMessages || {};
  delete window.bmChannelImportMessages;
  const rememberedDest = String(window.bmChannelImportDest || '');
  delete window.bmChannelImportDest;
  const text = (key, fallback) => messages[key] || fallback;
  if (location.origin !== 'https://www.youtube.com') throw Error(text('openChannelPrompt', '請開啟 YouTube 頻道或影片頁面。'));
  const panelId = 'bm-channel-import';
  if (document.getElementById(panelId)) { document.getElementById(panelId).scrollIntoView(); return; }

  const box = document.createElement('div');
  box.id = panelId;
  box.style.cssText = 'position:fixed;right:20px;top:20px;width:420px;max-width:90vw;max-height:85vh;overflow:auto;background:#181818;color:white;border:1px solid #f33;border-radius:14px;padding:20px;z-index:2147483647;font:14px/1.6 sans-serif;box-shadow:0 8px 40px #000';
  const heading = document.createElement('h3');
  heading.textContent = text('importChannel', '頻道影片匯入清單');
  heading.style.paddingRight = '36px';
  box.append(heading);
  const progressLabel = document.createElement('p');
  progressLabel.setAttribute('role', 'status');
  progressLabel.textContent = text('preparing', '準備中 0/0');
  box.append(progressLabel);
  const progressBar = document.createElement('progress');
  progressBar.max = 1; progressBar.value = 0; progressBar.style.width = '100%';
  box.append(progressBar);
  const note = document.createElement('p');
  note.textContent = text('importChannelDescription', '讀取目前頻道的影片，依上傳日期由舊到新加入你指定的播放清單；已存在的影片會略過。');
  box.append(note);

  const destWrap = document.createElement('div');
  destWrap.style.cssText = 'display:grid;gap:8px;margin:10px 0;';
  const destLabel = document.createElement('label');
  destLabel.textContent = text('destPlaylistLabel', '目標播放清單');
  destLabel.style.cssText = 'font-size:12px;color:#ccc;';
  const destInput = document.createElement('input');
  destInput.type = 'text';
  destInput.placeholder = text('destPlaylistPlaceholder', '貼上 PL… 或播放清單網址');
  // Do not auto-fill the last playlist into the create flow; offer an explicit fill action instead.
  destInput.value = '';
  destInput.style.cssText = 'width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid #555;background:#111;color:white;';
  const titleLabel = document.createElement('label');
  titleLabel.textContent = text('createDestTitleLabel', '新建清單名稱（選用）');
  titleLabel.style.cssText = 'font-size:12px;color:#ccc;';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = text('playlistName', '播放清單');
  titleInput.style.cssText = destInput.style.cssText;
  destWrap.append(destLabel, destInput);
  if (rememberedDest) {
    const reuse = document.createElement('button');
    reuse.type = 'button';
    reuse.textContent = text('reuseLastDest', '填入上次目標') + '：' + rememberedDest;
    reuse.style.cssText = 'justify-self:start;background:transparent;color:#ffb4b4;border:1px solid #633;border-radius:8px;padding:4px 8px;cursor:pointer;font-size:12px;';
    reuse.onclick = () => { destInput.value = rememberedDest; destInput.focus(); };
    destWrap.append(reuse);
  }
  destWrap.append(titleLabel, titleInput);
  box.append(destWrap);

  const log = document.createElement('pre');
  log.style.cssText = 'white-space:pre-wrap;max-height:240px;overflow:auto';
  box.append(log);
  const say = msg => {
    log.textContent += msg + '\n';
    log.scrollTop = log.scrollHeight;
    const match = msg.match(/(讀取影片|增量掃描|加入清單) (\d+)\/(\d+)/);
    if (match) {
      progressLabel.textContent = match[0];
      progressBar.max = Math.max(1, Number(match[3]));
      progressBar.value = Number(match[2]);
    } else if (msg.startsWith('停止：') || msg.startsWith('完成：')) progressLabel.textContent = msg;
  };

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start';
  box.append(actions);
  const button = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'background:#c00;color:white;border:0;border-radius:8px;padding:8px 12px;margin:5px;cursor:pointer';
    b.onclick = fn;
    actions.append(b);
    return b;
  };

  let stopped = false;
  let running = false;
  let closeRequested = false;
  const close = button('×', () => {
    closeRequested = true;
    if (!running) { stopped = true; box.remove(); return; }
    stopped = true;
    close.disabled = true;
    say(text('closingPanel', '正在停止，完成目前請求後關閉。'));
  });
  close.setAttribute('aria-label', text('closePanel', '關閉'));
  close.title = text('closePanel', '關閉');
  box.append(close);
  close.style.cssText = 'position:absolute;right:10px;top:8px;background:transparent;color:white;border:0;font-size:26px;cursor:pointer;padding:4px 10px';
  const stopBtn = button(text('stopAction', '停止'), () => { stopped = true; say('將在目前請求完成後停止。'); });
  document.body.append(box);

  const check = () => { if (stopped) throw Error('已停止。重新整理頁面後重新執行，可依目前狀態接續。'); };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function find(object, key) {
    if (!object || typeof object !== 'object') return [];
    const result = Object.hasOwn(object, key) ? [object[key]] : [];
    for (const value of Object.values(object)) if (value && typeof value === 'object') result.push(...find(value, key));
    return result;
  }
  function download(name, data) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function parsePlaylistId(raw) {
    const value = String(raw || '').trim();
    if (/^PL[\w-]+$/.test(value)) return value;
    try {
      const url = new URL(value);
      const list = url.searchParams.get('list');
      if (/^PL[\w-]+$/.test(list || '')) return list;
    } catch {}
    const match = value.match(/list=(PL[\w-]+)/);
    return match ? match[1] : '';
  }

  const config = window.ytcfg;
  if (!config?.get('INNERTUBE_CONTEXT')) { say('找不到網站設定。請重新整理 YouTube 後再執行。'); return; }
  const context = structuredClone(config.get('INNERTUBE_CONTEXT'));
  const ACCOUNT = String(config.get('DELEGATED_SESSION_ID') || config.get('DATASYNC_ID') || config.get('SESSION_INDEX') || '0');
  const account = String(config.get('DELEGATED_SESSION_ID') || config.get('SESSION_INDEX') || '0');

  async function api(endpoint, body) {
    check();
    if (String(config.get('DELEGATED_SESSION_ID') || config.get('DATASYNC_ID') || config.get('SESSION_INDEX') || '0') !== ACCOUNT) {
      throw Error('帳號已切換，請重新整理頁面後再執行。');
    }
    const cookie = document.cookie.split('; ').find(s => s.startsWith('SAPISID=')) || document.cookie.split('; ').find(s => s.startsWith('__Secure-3PAPISID='));
    if (!cookie) throw Error('找不到登入狀態，請先在這個 Chrome 分頁登入。');
    const secret = cookie.slice(cookie.indexOf('=') + 1);
    const timestamp = Math.floor(Date.now() / 1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${timestamp} ${secret} ${location.origin}`));
    const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `SAPISIDHASH ${timestamp}_${hash}`,
      'X-Origin': location.origin,
      'X-Goog-AuthUser': String(config.get('SESSION_INDEX') || 0)
    };
    if (config.get('DELEGATED_SESSION_ID')) headers['X-Goog-PageId'] = config.get('DELEGATED_SESSION_ID');
    const response = await fetch('/youtubei/v1/' + endpoint + '?prettyPrint=false', {
      method: 'POST', credentials: 'include', headers,
      body: JSON.stringify({ context: structuredClone(context), ...body }),
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) throw Error(`${endpoint} HTTP ${response.status}。已停止；不自動重試寫入。`);
    const data = await response.json();
    if (data.error) throw Error(`${endpoint} 回傳錯誤。`);
    return data;
  }

  function urlChannelHint() {
    const path = location.pathname;
    const fromPath = path.match(/^\/channel\/(UC[\w-]+)/);
    if (fromPath) return { type: 'id', value: fromPath[1] };
    const handle = path.match(/^\/(@[^/]+)/);
    if (handle) return { type: 'handle', value: decodeURIComponent(handle[1]) };
    return null;
  }

  function pageTitleGuess() {
    return String(document.title || '')
      .replace(/^\(\d+\)\s*/, '')
      .replace(/\s*-\s*YouTube\s*$/i, '')
      .trim();
  }

  function channelFromBrowseData(data, fallbackTitle = '') {
    const meta = find(data, 'channelMetadataRenderer')[0];
    if (meta?.externalId && /^UC[\w-]+$/.test(meta.externalId)) {
      return { channelId: meta.externalId, title: meta.title || fallbackTitle };
    }
    const header = find(data, 'c4TabbedHeaderRenderer')[0];
    if (header?.channelId && /^UC[\w-]+$/.test(header.channelId)) {
      return { channelId: header.channelId, title: header.title || fallbackTitle };
    }
    return null;
  }

  function findChannelIdForHandle(handle) {
    const needle = ('/' + handle).toLowerCase();
    const roots = [window.ytInitialData, window.ytInitialPlayerResponse].filter(Boolean);
    for (const root of roots) {
      for (const ep of find(root, 'browseEndpoint')) {
        const id = ep.browseId;
        const base = String(ep.canonicalBaseUrl || '').toLowerCase();
        if (!/^UC[\w-]+$/.test(id || '')) continue;
        if (base === needle || base === handle.toLowerCase() || base.endsWith(needle)) {
          return { channelId: id, title: pageTitleGuess() || handle };
        }
      }
    }
    return null;
  }

  async function resolveHandleToChannel(handle) {
    // Innertube browse rejects @handles (HTTP 400). Map handle -> UC… first.
    const fromPage = findChannelIdForHandle(handle);
    if (fromPage) return { ...fromPage, handle };
    say('解析頻道網址…');
    const resolved = await api('navigation/resolve_url', { url: 'https://www.youtube.com/' + handle });
    const ep = resolved.endpoint?.browseEndpoint || find(resolved, 'browseEndpoint')[0];
    if (ep?.browseId && /^UC[\w-]+$/.test(ep.browseId)) {
      return { channelId: ep.browseId, title: pageTitleGuess() || handle, handle };
    }
    throw Error('無法把頻道網址解析成頻道 ID（browse 不接受 @handle）。請重新整理頻道頁後再試。');
  }

  async function resolveChannel() {
    const hint = urlChannelHint();
    // Prefer the address bar. Never trust arbitrary player/channel chips on SPA pages.
    if (hint?.type === 'id') {
      try {
        const data = await api('browse', { browseId: hint.value });
        const named = channelFromBrowseData(data, pageTitleGuess());
        if (named) return named;
      } catch {
        // still usable with bare id
      }
      return { channelId: hint.value, title: pageTitleGuess() };
    }
    if (hint?.type === 'handle') {
      const resolved = await resolveHandleToChannel(hint.value);
      try {
        const data = await api('browse', { browseId: resolved.channelId });
        const named = channelFromBrowseData(data, resolved.title);
        if (named) return { ...named, handle: hint.value };
      } catch {
        // keep resolve_url / page mapping result
      }
      return resolved;
    }
    if (location.pathname === '/watch') {
      const player = window.ytInitialPlayerResponse?.videoDetails;
      if (player?.channelId && /^UC[\w-]+$/.test(player.channelId)) {
        return { channelId: player.channelId, title: player.author || pageTitleGuess() };
      }
    }
    return null;
  }

  function isVideoId(id, strict = true) {
    if (typeof id !== 'string' || !id) return false;
    // YouTube watch IDs are 11 chars; playlist/test fixtures may be shorter — only
    // thumbnail URL scraping and lockup heuristics require the strict form.
    return strict ? /^[\w-]{11}$/.test(id) : /^[\w-]{6,}$/.test(id);
  }

  function titleFromRenderer(row) {
    return (row.title?.runs || []).map(r => r.text).join('') || row.title?.simpleText || row.videoId || '';
  }

  function videoIdFromLockup(lockup) {
    for (const ep of find(lockup, 'watchEndpoint')) {
      if (isVideoId(ep.videoId)) return ep.videoId;
    }
    for (const cmd of find(lockup, 'addToPlaylistCommand')) {
      if (isVideoId(cmd.videoId)) return cmd.videoId;
      const first = Array.isArray(cmd.videoIds) ? cmd.videoIds.find(isVideoId) : '';
      if (first) return first;
    }
    if (isVideoId(lockup.contentId)) return lockup.contentId;
    for (const source of find(lockup, 'sources')) {
      const url = String(source?.url || '');
      const match = url.match(/\/vi\/([\w-]{11})\//) || url.match(/\/an_webp\/([\w-]{11})\//);
      if (match) return match[1];
    }
    return '';
  }

  function titleFromLockup(lockup) {
    return lockup.metadata?.lockupMetadataViewModel?.title?.content
      || lockup.title?.content
      || '';
  }

  function extractPlaylistRows(items) {
    const tracks = [];
    const seen = new Set();
    for (const row of find(items, 'playlistVideoRenderer')) {
      if (!isVideoId(row.videoId, false) || seen.has(row.videoId)) continue;
      if (row.isPlayable === false) continue;
      seen.add(row.videoId);
      tracks.push({
        videoId: row.videoId,
        setVideoId: row.setVideoId,
        title: titleFromRenderer(row) || row.videoId,
        playable: row.isPlayable !== false
      });
    }
    for (const lockup of find(items, 'lockupViewModel')) {
      const videoId = videoIdFromLockup(lockup);
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      tracks.push({
        videoId,
        setVideoId: lockup.setVideoId,
        title: titleFromLockup(lockup) || videoId,
        playable: true
      });
    }
    return tracks;
  }

  function hasEditablePlaylistSignal(response) {
    const lists = find(response, 'playlistVideoListRenderer');
    if (lists.some(list => list?.isEditable === true)) return true;
    // Classic "view only" playlist still exposes the renderer with isEditable:false.
    if (lists.length === 1 && lists[0]?.isEditable === false) return false;
    if (find(response, 'isEditable').includes(true)) return true;
    if (find(response, 'playlistEditEndpoint').length) return true;
    if (find(response, 'editPlaylistEndpoint').length) return true;
    // New playlist UI often drops playlistVideoListRenderer entirely.
    if (!lists.length) return null;
    return false;
  }

  async function readPlaylist(id, requireEditable = false, { assumeEditable = false } = {}) {
    let response = await api('browse', { browseId: 'VL' + id });
    const lists = find(response.contents || response, 'playlistVideoListRenderer');
    if (requireEditable) {
      const signal = hasEditablePlaylistSignal(response);
      if (signal === false && !assumeEditable) {
        throw Error('這份播放清單沒有可確認的編輯權限。');
      }
      if (signal == null && !assumeEditable) {
        // Modern empty / lockup playlists may omit isEditable; proceed and rely on edit_playlist status.
        say('頁面未回傳經典編輯旗標，將直接嘗試加入影片。');
      }
    }
    let items = lists.length === 1 ? (lists[0].contents || []) : (response.contents || response);
    const tracks = [];
    const seenIds = new Set();
    const seenTokens = new Set();
    for (;;) {
      for (const track of extractPlaylistRows(items)) {
        if (seenIds.has(track.videoId)) continue;
        seenIds.add(track.videoId);
        tracks.push(track);
      }
      const tokens = find(items, 'continuationItemRenderer').flatMap(x => find(x, 'continuationCommand')).map(x => x.token).filter(Boolean);
      if (!tokens.length) {
        // Newer playlist / uploads shelves may put continuations outside playlistVideoListRenderer.
        const loose = [
          ...find(response, 'continuationCommand').map(x => x.token),
          ...find(response, 'nextContinuationData').map(x => x.continuation)
        ].filter(Boolean);
        const next = loose.find(t => !seenTokens.has(t));
        if (!next) break;
        seenTokens.add(next);
        response = await api('browse', { continuation: next });
        const cont = find(response, 'appendContinuationItemsAction');
        items = cont[0]?.continuationItems || response.contents || response;
        continue;
      }
      if (tokens.length !== 1 || seenTokens.has(tokens[0])) throw Error('清單分頁不符預期。');
      seenTokens.add(tokens[0]);
      response = await api('browse', { continuation: tokens[0] });
      const cont = find(response, 'appendContinuationItemsAction');
      if (cont.length !== 1) throw Error('無法讀取清單下一頁。');
      items = cont[0].continuationItems || [];
    }
    return tracks;
  }

  function extractVideosFromBrowse(data, { channelId = '', handle = '' } = {}) {
    const rows = [
      ...find(data, 'richItemRenderer').flatMap(r => find(r, 'videoRenderer')),
      ...find(data, 'gridVideoRenderer'),
      ...find(data, 'videoRenderer'),
      ...find(data, 'playlistVideoRenderer')
    ];
    const videos = [];
    const seen = new Set();
    const handleNeedle = handle ? ('/' + handle.replace(/^\//, '')).toLowerCase() : '';
    const acceptChannel = lockup => {
      if (!channelId && !handleNeedle) return true;
      for (const ep of find(lockup, 'browseEndpoint')) {
        if (channelId && ep.browseId === channelId) return true;
        const base = String(ep.canonicalBaseUrl || '').toLowerCase();
        if (handleNeedle && (base === handleNeedle || base.endsWith(handleNeedle))) return true;
      }
      // Channel Videos / uploads shelves often omit per-card channel chips.
      return !find(lockup, 'browseEndpoint').some(ep => /^UC[\w-]+$/.test(ep.browseId || ''));
    };
    for (const row of rows) {
      const videoId = row.videoId;
      if (!isVideoId(videoId, false) || seen.has(videoId)) continue;
      if (row.isPlayable === false) continue;
      seen.add(videoId);
      videos.push({
        videoId,
        title: titleFromRenderer(row) || videoId
      });
    }
    for (const lockup of find(data, 'lockupViewModel')) {
      if (!acceptChannel(lockup)) continue;
      const videoId = videoIdFromLockup(lockup);
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      videos.push({
        videoId,
        title: titleFromLockup(lockup) || videoId
      });
    }
    return videos;
  }

  async function browseVideosCollection(browseId, params, filter = {}) {
    let data = await api('browse', params ? { browseId, params } : { browseId });
    const videos = [];
    const seen = new Set();
    const push = list => {
      for (const item of list) {
        if (seen.has(item.videoId)) continue;
        seen.add(item.videoId);
        videos.push(item);
      }
    };
    push(extractVideosFromBrowse(data, filter));
    if (!params) {
      const tabs = find(data, 'tabRenderer');
      const videosTab = tabs.find(tab => {
        const url = tab.endpoint?.commandMetadata?.webCommandMetadata?.url || '';
        const label = String(tab.title || url).toLowerCase();
        return /\/videos\b/.test(url) || label.includes('video') || label.includes('影片') || label.includes('動画');
      });
      const tabParams = videosTab?.endpoint?.browseEndpoint?.params;
      const tabBrowse = videosTab?.endpoint?.browseEndpoint?.browseId || browseId;
      if (tabParams) {
        data = await api('browse', { browseId: tabBrowse, params: tabParams });
        push(extractVideosFromBrowse(data, filter));
      }
    }
    const tokenSeen = new Set();
    for (;;) {
      say(`讀取影片 ${videos.length}/${Math.max(videos.length, 1)}`);
      const tokens = [
        ...find(data, 'continuationCommand').map(x => x.token),
        ...find(data, 'nextContinuationData').map(x => x.continuation)
      ].filter(Boolean);
      const token = tokens.find(t => !tokenSeen.has(t));
      if (!token) break;
      tokenSeen.add(token);
      data = await api('browse', { continuation: token });
      push(extractVideosFromBrowse(data, filter));
      await sleep(200);
    }
    return videos;
  }

  async function listChannelVideos(channelId, handle = '') {
    if (!/^UC[\w-]+$/.test(channelId)) throw Error('頻道 ID 無效，無法讀取影片。');
    const filter = { channelId, handle };
    const candidates = ['UULF' + channelId.slice(2), 'UU' + channelId.slice(2)];
    for (const listId of candidates) {
      try {
        const tracks = await readPlaylist(listId, false);
        const videos = tracks.filter(t => t.playable !== false).map(t => ({ videoId: t.videoId, title: t.title }));
        if (videos.length) {
          say(`以頻道上傳清單讀取（${listId.slice(0, 4)}…）`);
          return videos;
        }
      } catch (error) {
        console.info('[頻道匯入] 上傳清單讀取失敗', listId, error.message);
      }
    }
    const fromChannel = await browseVideosCollection(channelId, null, filter);
    if (fromChannel.length) {
      say('以頻道影片分頁讀取');
      return fromChannel;
    }
    return [];
  }

  let requestId = 0;
  let KEY = '';
  function store(op, value, key = KEY) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const timer = setTimeout(() => {
        document.removeEventListener('bm-sort-reply', receive);
        reject(Error('擴充功能儲存逾時，請重新載入擴充功能與頁面。'));
      }, 15000);
      function receive(event) {
        const reply = JSON.parse(event.detail);
        if (reply.id !== id) return;
        clearTimeout(timer);
        document.removeEventListener('bm-sort-reply', receive);
        if (reply.error) reject(Error(reply.error));
        else resolve(reply.value);
      }
      document.addEventListener('bm-sort-reply', receive);
      document.dispatchEvent(new CustomEvent('bm-sort-store', { detail: JSON.stringify({ id, op, key, value }) }));
    });
  }

  let state = null;
  let channelInfo = null;
  const save = () => store('set', state);
  async function rememberDest(dest) { await store('set', dest, 'bm-channel-import-dest'); }

  async function prepareChannel() {
    say('辨識目前頻道…');
    channelInfo = await resolveChannel();
    if (!channelInfo?.channelId) throw Error(text('openChannelPrompt', '請開啟 YouTube 頻道或影片頁面。'));
    const hint = urlChannelHint();
    channelInfo.handle = hint?.type === 'handle' ? hint.value : channelInfo.handle || '';
    KEY = 'bm-channel-import-v1-' + encodeURIComponent(ACCOUNT) + '-' + channelInfo.channelId;
    state = await store('get');
    say(`頻道：${channelInfo.title || channelInfo.handle || channelInfo.channelId}`);
  }

  async function run(dest, { created = false } = {}) {
    check();
    await prepareChannel();
    state = (await store('get')) || state;
    if (state && state.account && state.account !== account) throw Error('登入帳號與先前工作不同，請切回原帳號。');
    const resume = state?.mode === 'channel-import' && state.channelId === channelInfo.channelId && state.dest === dest && !state.completed && Array.isArray(state.videos) && state.videos.length;
    state = {
      version: 1,
      mode: 'channel-import',
      channelId: channelInfo.channelId,
      channelTitle: channelInfo.title || state?.channelTitle || '',
      account,
      dest,
      videos: resume ? state.videos : [],
      metadata: state?.metadata || {},
      added: resume ? (state.added || []) : [],
      skipped: resume ? (state.skipped || []) : [],
      unplayable: resume ? (state.unplayable || []) : [],
      completed: false,
      created
    };
    await save();
    await rememberDest(dest);

    if (!state.videos.length) {
      say('讀取頻道影片…');
      const listed = await listChannelVideos(channelInfo.channelId, channelInfo.handle || '');
      if (!listed.length) throw Error('這個頻道沒有可讀取的影片。若頁面看得到影片，請開「影片」分頁後重試，或把主控台 [頻道匯入] 訊息傳給我。');
      state.videos = listed;
      await save();
      say(`讀取影片 ${listed.length}/${listed.length}`);
    }

    const todo = state.videos.filter(v => !state.metadata[v.videoId]);
    let scanned = state.videos.length - todo.length;
    say(`增量掃描 ${scanned}/${state.videos.length}`);
    for (const item of state.videos) {
      check();
      if (state.metadata[item.videoId]) continue;
      say(`增量掃描 ${scanned}/${state.videos.length}：${item.title}`);
      const data = await api('player', { videoId: item.videoId });
      const details = data.videoDetails;
      const micro = data.microformat?.playerMicroformatRenderer;
      const rawDate = micro?.uploadDate;
      const date = typeof rawDate === 'string' ? rawDate.slice(0, 10) : '';
      const validDate = typeof rawDate === 'string'
        && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(rawDate)
        && Number.isFinite(Date.parse(rawDate))
        && Number.isFinite(Date.parse(date))
        && new Date(date).toISOString().slice(0, 10) === date;
      if (details?.videoId !== item.videoId || !details.channelId || !validDate) {
        const diagnostic = {
          videoId: item.videoId,
          status: data.playabilityStatus?.status,
          reason: data.playabilityStatus?.reason,
          topLevelKeys: Object.keys(data),
          videoDetails: details ? { videoId: details.videoId, channelId: details.channelId, author: details.author } : null,
          uploadDate: rawDate || null
        };
        console.info('[頻道匯入診斷]', JSON.stringify(diagnostic));
        button('下載影片診斷', () => download('video-response-diagnostic.json', diagnostic));
        throw Error('影片資料回應缺少必要欄位，已提前停止。請下載「影片診斷」交給我。');
      }
      state.metadata[item.videoId] = {
        channelId: details.channelId,
        channel: details.author,
        uploadDate: date,
        uploadDateRaw: rawDate
      };
      scanned++;
      await save();
      say(`增量掃描 ${scanned}/${state.videos.length}`);
      await sleep(350);
    }

    const ordered = state.videos
      .map((v, index) => ({ ...v, index, ...state.metadata[v.videoId] }))
      .sort((a, b) => a.uploadDate.localeCompare(b.uploadDate) || a.index - b.index);

    say('檢查目標清單…');
    const assumeEditable = Boolean(created || state.created);
    const existing = await readPlaylist(dest, true, { assumeEditable });
    const have = new Set(existing.map(t => t.videoId));
    const pending = ordered.filter(v => !have.has(v.videoId) && !state.added.includes(v.videoId));
    const already = ordered.length - pending.length;
    say(`待加入 ${pending.length} 支，已在清單／先前已加入 ${already} 支`);

    let done = 0;
    for (const item of pending) {
      check();
      say(`加入清單 ${done}/${pending.length}：${item.title}`);
      const response = await api('browse/edit_playlist', {
        playlistId: dest,
        actions: [{ action: 'ACTION_ADD_VIDEO', addedVideoId: item.videoId }]
      });
      if (response.status !== 'STATUS_SUCCEEDED') throw Error('加入清單回應未確認成功。可重新執行接續。');
      state.added.push(item.videoId);
      done++;
      await save();
      say(`加入清單 ${done}/${pending.length}`);
      await sleep(250);
    }

    const verified = await readPlaylist(dest, true, { assumeEditable: true });
    const missing = state.added.filter(id => !verified.some(t => t.videoId === id));
    if (missing.length) throw Error(`${missing.length} 支尚未出現在目標清單；請重新整理後再接續。`);
    state.completed = true;
    state.updatedAt = new Date().toISOString();
    await save();
    const link = document.createElement('a');
    link.href = location.origin + '/playlist?list=' + encodeURIComponent(dest);
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.color = '#ff8080';
    link.textContent = text('openCopy', '開啟目標清單');
    box.append(link);
    say(`完成：頻道 ${ordered.length} 支，新加入 ${done} 支，略過 ${already} 支。順序為上傳日期舊→新。`);
  }

  async function withLock(fn) {
    running = true;
    useDest.disabled = true;
    createDest.disabled = true;
    try {
      await navigator.locks.request(KEY || ('bm-channel-import-' + ACCOUNT), { ifAvailable: true }, async lock => {
        if (!lock) throw Error('這份頻道匯入正在另一分頁執行。');
        await fn();
      });
    } catch (error) {
      say('停止：' + error.message);
      console.error('[頻道匯入]', error);
    } finally {
      running = false;
      if (closeRequested) box.remove();
      else {
        useDest.disabled = false;
        createDest.disabled = false;
        say(text('panelFinished', '可關閉此視窗；再次操作時從工具箱開啟。'));
      }
    }
  }

  const useDest = button(text('useDestPlaylist', '使用此清單開始'), () => withLock(async () => {
    const dest = parsePlaylistId(destInput.value);
    if (!dest) throw Error('請貼上有效的播放清單網址或 PL 開頭的清單 ID。');
    destInput.value = dest;
    await run(dest);
  }));
  const createDest = button(text('createDestPlaylist', '新建私人清單並開始'), () => withLock(async () => {
    const typedTitle = titleInput.value.trim();
    await prepareChannel();
    // Keep the field blank until the user types; only fall back at create time.
    const title = (typedTitle || channelInfo.title || channelInfo.handle || text('playlistName', '播放清單'))
      .replace(/^-+|-+$/g, '').trim().slice(0, 80);
    say('建立私人播放清單…');
    say(`清單名稱：${title}`);
    let created;
    try {
      created = await api('playlist/create', {
        title,
        description: text('copySource', '來源：') + location.href,
        privacyStatus: 'PRIVATE'
      });
    } catch (error) {
      throw Error(error.message + ' 建立結果未確認，請先查看媒體庫，避免重複建立。');
    }
    if (!/^PL[\w-]+$/.test(created.playlistId || '')) throw Error('未取得有效清單 ID，請先查看媒體庫，不會自動重試。');
    destInput.value = created.playlistId;
    await run(created.playlistId, { created: true });
  }));
  actions.append(stopBtn);

  try {
    await prepareChannel();
    if (state && !state.completed && state.dest) {
      say(`偵測到可接續的匯入進度（目標 ${state.dest}）。需要時按「填入上次目標」或自行貼上後再開始。`);
      if (!rememberedDest || rememberedDest !== state.dest) {
        const resumeFill = document.createElement('button');
        resumeFill.type = 'button';
        resumeFill.textContent = text('reuseLastDest', '填入上次目標') + '：' + state.dest;
        resumeFill.style.cssText = 'justify-self:start;background:transparent;color:#ffb4b4;border:1px solid #633;border-radius:8px;padding:4px 8px;cursor:pointer;font-size:12px;margin-top:4px;';
        resumeFill.onclick = () => { destInput.value = state.dest; destInput.focus(); };
        destWrap.append(resumeFill);
      }
    }
  } catch (error) {
    say('停止：' + error.message);
  }
})().catch(error => {
  const box = document.getElementById('bm-channel-import');
  if (box) {
    const message = document.createElement('p');
    message.textContent = '啟動失敗：' + error.message;
    box.append(message);
  }
  console.error('[頻道匯入]', error);
});
