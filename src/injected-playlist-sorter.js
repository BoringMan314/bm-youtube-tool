/* Injected into a signed-in www.youtube.com playlist tab.
 * Requests stay on www.youtube.com; no credentials are exported.
 * Internal API shapes may change. Reorders only the selected editable playlist.
 */
void (async () => {
  'use strict';
  const messages=window.bmPlaylistMessages || {};
  delete window.bmPlaylistMessages;
  const text=(key,fallback)=>messages[key] || fallback;
  const DATE_ONLY = window.bmPlaylistAction === 'date';
  const COPY_ONLY = window.bmPlaylistAction === 'copy';
  delete window.bmPlaylistAction;
  const SOURCE = new URL(location.href).searchParams.get('list');
  if (!/^PL[\w-]+$/.test(SOURCE || '')) { alert('請先開啟一般播放清單頁面。'); return; }
  const ACCOUNT = String(window.ytcfg?.get('DELEGATED_SESSION_ID') || window.ytcfg?.get('DATASYNC_ID') || window.ytcfg?.get('SESSION_INDEX') || '0');
  const KEY = 'bm-sort-v1-' + encodeURIComponent(ACCOUNT) + '-' + SOURCE;
  if (location.origin !== 'https://www.youtube.com') throw Error(text('openPlaylistPrompt','請開啟 YouTube 播放清單。'));
  const panelId = COPY_ONLY ? 'bm-playlist-copy' : DATE_ONLY ? 'bm-playlist-sort-date' : 'bm-playlist-sort';
  if (document.getElementById(panelId)) { document.getElementById(panelId).scrollIntoView(); return; }
  const box = document.createElement('div');
  box.id = panelId;
  box.style.cssText = 'position:fixed;right:20px;top:20px;width:420px;max-width:90vw;max-height:85vh;overflow:auto;background:#181818;color:white;border:1px solid #f33;border-radius:14px;padding:20px;z-index:2147483647;font:14px/1.6 sans-serif;box-shadow:0 8px 40px #000';
  const heading = document.createElement('h3'); heading.textContent = COPY_ONLY ? text('copyPlaylist',"複製該清單") : DATE_ONLY ? text('sortDate',"依上傳日期排序") : text('sortAuthor',"依作者排序"); box.append(heading);
  const progressLabel = document.createElement('p'); progressLabel.setAttribute('role','status'); progressLabel.textContent=text('preparing',"準備中 0/0"); box.append(progressLabel);
  const progressBar = document.createElement('progress'); progressBar.max=1; progressBar.value=0; progressBar.style.width='100%'; box.append(progressBar);
  const note = document.createElement('p'); note.textContent = text('authorDescription',"依頻道首次出現順序分組，各組依上傳日期由舊到新排列；並移除較晚出現的重複影片。"); box.append(note);
  if (COPY_ONLY) note.textContent = text('copyDescription',"建立目前播放清單的私人副本。");
  if (DATE_ONLY) note.textContent = text('dateDescription',"全曲依上傳日期由舊到新排列，同日影片維持相對順序；並移除較晚出現的重複影片。");
  const log = document.createElement('pre'); log.style.cssText = 'white-space:pre-wrap;max-height:240px;overflow:auto'; box.append(log);
  const say = text => {
    log.textContent += text + '\n'; log.scrollTop = log.scrollHeight;
    const match=text.match(/(增量掃描|排序進度|移除重複) (\d+)\/(\d+)/);
    if(match){progressLabel.textContent=match[0];progressBar.max=Math.max(1,Number(match[3]));progressBar.value=Number(match[2]);}
    else if(text.startsWith('停止：')||text.startsWith('完成：'))progressLabel.textContent=text;
  };
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-start';
  box.append(actions);
  const button = (text, fn) => { const b = document.createElement('button'); b.textContent = text; b.style.cssText = 'background:#c00;color:white;border:0;border-radius:8px;padding:8px 12px;margin:5px;cursor:pointer'; b.onclick = fn; actions.append(b); return b; };
  let stopped = false;
  let running = false;
  let closeRequested = false;
  const close = button('×', () => {
    closeRequested = true;
    if (!running) { stopped=true; box.remove(); return; }
    closeRequested = true;
    stopped = true;
    close.disabled = true;
    say(text('closingPanel','正在停止，完成目前請求後關閉。'));
  });
  close.setAttribute('aria-label',text('closePanel','關閉'));
  close.title=text('closePanel','關閉');
  box.append(close);
  close.style.cssText='position:absolute;right:10px;top:8px;background:transparent;color:white;border:0;font-size:26px;cursor:pointer;padding:4px 10px';
  heading.style.paddingRight='36px';
  button(text('stopAction',"停止"), () => { stopped = true; say('將在目前請求完成後停止。'); });
  document.body.append(box);
  const check = () => { if (stopped) throw Error('已停止。重新整理頁面後重新執行，可依目前狀態接續。'); };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let requestId = 0;
  function store(op, value) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const timer = setTimeout(() => { document.removeEventListener('bm-sort-reply', receive); reject(Error('擴充功能儲存逾時，請重新載入擴充功能與頁面。')); }, 15000);
      function receive(event) {
        const reply = JSON.parse(event.detail);
        if (reply.id !== id) return;
        clearTimeout(timer); document.removeEventListener('bm-sort-reply', receive);
        if (reply.error) reject(Error(reply.error)); else resolve(reply.value);
      }
      document.addEventListener('bm-sort-reply', receive);
      document.dispatchEvent(new CustomEvent('bm-sort-store', {detail:JSON.stringify({id,op,key:KEY,value})}));
    });
  }
  let state = await store('get');
  if (!state) {
    try { state = JSON.parse(localStorage.getItem('bm-once-sort-v1-' + SOURCE) || 'null'); } catch {}
  }
  const save = () => store('set', state);
  function download(name, data) {
    const a = document.createElement('a'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function find(object, key) {
    if (!object || typeof object !== 'object') return [];
    const result = Object.hasOwn(object, key) ? [object[key]] : [];
    for (const value of Object.values(object)) if (value && typeof value === 'object') result.push(...find(value, key));
    return result;
  }
  const config = window.ytcfg;
  if (!config?.get('INNERTUBE_CONTEXT')) { say('找不到網站設定。請重新整理 YouTube 後再執行。'); return; }
  const context = structuredClone(config.get('INNERTUBE_CONTEXT'));
  const account = String(config.get('DELEGATED_SESSION_ID') || config.get('SESSION_INDEX') || '0');
  async function api(endpoint, body) {
    check();
    if (String(config.get('DELEGATED_SESSION_ID') || config.get('DATASYNC_ID') || config.get('SESSION_INDEX') || '0') !== ACCOUNT) throw Error('帳號已切換，請重新整理頁面後再排序。');
    const cookie = document.cookie.split('; ').find(s => s.startsWith('SAPISID=')) || document.cookie.split('; ').find(s => s.startsWith('__Secure-3PAPISID='));
    if (!cookie) throw Error('找不到登入狀態，請先在這個 Chrome 分頁登入。');
    const secret = cookie.slice(cookie.indexOf('=') + 1);
    const timestamp = Math.floor(Date.now()/1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${timestamp} ${secret} ${location.origin}`));
    const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
    const ctx = structuredClone(context);
    const headers = {'Content-Type':'application/json', Authorization:`SAPISIDHASH ${timestamp}_${hash}`, 'X-Origin':location.origin, 'X-Goog-AuthUser':String(config.get('SESSION_INDEX') || 0)};
    if (config.get('DELEGATED_SESSION_ID')) headers['X-Goog-PageId'] = config.get('DELEGATED_SESSION_ID');
    const response = await fetch('/youtubei/v1/' + endpoint + '?prettyPrint=false', {method:'POST',credentials:'include',headers,body:JSON.stringify({context:ctx,...body}),signal:AbortSignal.timeout(45000)});
    if (!response.ok) throw Error(`${endpoint} HTTP ${response.status}。已停止；不自動重試寫入。`);
    const data = await response.json();
    if (data.error) throw Error(`${endpoint} 回傳錯誤。`);
    return data;
  }
  async function playlist(id, requireEditable = false) {
    let response=await api('browse',{browseId:'VL'+id});
    const lists=find(response.contents,'playlistVideoListRenderer');
    if(lists.length!==1) throw Error('無法辨識 YouTube 清單影片區。');
    if(requireEditable && lists[0].isEditable!==true) throw Error('這份 YouTube 清單沒有可確認的編輯權限。');
    let items=lists[0].contents || [];
    const tracks=[], seen=new Set();
    for(;;) {
      for(const row of find(items,'playlistVideoRenderer')) {
        if(!row.videoId || row.isPlayable===false) throw Error('清單包含不可用的影片，已停止。');
        const removals=find(row,'playlistEditEndpoint').flatMap(e=>e.actions || []).filter(a=>a.action==='ACTION_REMOVE_VIDEO');
        const setVideoId=row.setVideoId || removals[0]?.setVideoId;
        tracks.push({videoId:row.videoId,setVideoId,title:(row.title?.runs || []).map(r=>r.text).join('') || row.title?.simpleText || row.videoId});
      }
      const tokens=find(items,'continuationItemRenderer').flatMap(x=>find(x,'continuationCommand')).map(x=>x.token).filter(Boolean);
      if(!tokens.length)break;
      if(tokens.length!==1 || seen.has(tokens[0]))throw Error('YouTube 清單分頁不符預期。');
      seen.add(tokens[0]);response=await api('browse',{continuation:tokens[0]});
      const actions=find(response,'appendContinuationItemsAction');
      if(actions.length!==1)throw Error('無法讀取 YouTube 清單下一頁。');
      items=actions[0].continuationItems || [];
    }
    if(!tracks.length)throw Error('清單沒有可讀取的影片。');
    return tracks;
  }
  const same = (a,b) => a.length === b.length && a.every((x,i)=>x.videoId===b[i].videoId);
  function sorted(tracks, metadata) {
    const ranks = new Map();
    tracks.forEach(t => { const id=metadata[t.videoId].channelId; if (!ranks.has(id)) ranks.set(id,ranks.size); });
    return tracks.map((t,index)=>({...t,index,...metadata[t.videoId]})).sort((a,b)=>(DATE_ONLY ? 0 : ranks.get(a.channelId)-ranks.get(b.channelId))||a.uploadDate.localeCompare(b.uploadDate)||a.index-b.index);
  }
  async function run() {
    check();
    if (COPY_ONLY) return copyPlaylist();
    state = (await store('get')) || state;
    if (state && state.account !== account) throw Error('登入帳號與先前工作不同，請切回原帳號。');
    say('檢查清單變更…');
    const current = await playlist(SOURCE, true);
    const sameItems = (a,b) => a.length===b.length && a.every(t=>b.some(x=>x.setVideoId===t.setVideoId && x.videoId===t.videoId));
    const sortMode = DATE_ONLY ? 'date' : 'author';
    const resume = state?.mode==='direct' && (state.sortMode || 'author')===sortMode && !state.completed && sameItems(state.tracks,current);
    state = {version:2,mode:'direct',sortMode,source:SOURCE,account,tracks:resume?state.tracks:current,metadata:state?.metadata || {},completed:false};
    await save();
    let copy = current;
    const missing=[];
    const todo = [...new Set(state.tracks.map(t=>t.videoId))].filter(id=>!state.metadata[id]);
    let scanned = 0;
    say(`影片資料快取 ${new Set(state.tracks.map(t=>t.videoId)).size-todo.length}/${new Set(state.tracks.map(t=>t.videoId)).size}；增量掃描 0/${todo.length}`);
    for (const t of state.tracks) {
      check();
      if (state.metadata[t.videoId]) continue;
      say(`增量掃描 ${scanned}/${todo.length}：${t.title}`);
      const data=await api('player',{videoId:t.videoId});
      const details=data.videoDetails;
      const micro=data.microformat?.playerMicroformatRenderer;
      const rawDate=micro?.uploadDate;
      // YouTube returns either a calendar date or an ISO timestamp with offset.
      // Preserve the upload's reported calendar day (do not shift it to UTC).
      const date=typeof rawDate==='string' ? rawDate.slice(0,10) : '';
      const validDate=typeof rawDate==='string'
        && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(rawDate)
        && Number.isFinite(Date.parse(rawDate))
        && Number.isFinite(Date.parse(date))
        && new Date(date).toISOString().slice(0,10)===date;
      if (details?.videoId !== t.videoId || !details.channelId || !validDate) {
        missing.push({videoId:t.videoId,title:t.title});
        const diagnostic = {
          videoId:t.videoId,
          status:data.playabilityStatus?.status,
          reason:data.playabilityStatus?.reason,
          topLevelKeys:Object.keys(data),
          videoDetails:details ? {videoId:details.videoId,channelId:details.channelId,author:details.author} : null,
          microformatKeys:Object.keys(data.microformat || {}),
          formats:Object.fromEntries(Object.entries(data.microformat || {}).map(([key,value])=>[key,{
            keys:Object.keys(value || {}),uploadDate:value?.uploadDate,publishDate:value?.publishDate
          }]))
        };
        console.info('[清單排序診斷]', JSON.stringify(diagnostic));
        button('下載影片診斷',()=>download('video-response-diagnostic.json',diagnostic));
        throw Error('影片資料回應缺少必要欄位，已提前停止。請下載「影片診斷」交給我。');
      } else { state.metadata[t.videoId]={channelId:details.channelId,channel:details.author,uploadDate:date,uploadDateRaw:rawDate}; await save(); }
      scanned++; say(`增量掃描 ${scanned}/${todo.length}`);
      await sleep(350);
    }
    if (missing.length) { state.missing=missing; await save(); button('下載缺資料項目',()=>download('missing-dates.json',missing)); throw Error(`${missing.length} 支缺上傳日期或頻道，清單尚未排序。不使用發行日期代替。`); }
    const latest = await playlist(SOURCE, true);
    if (!same(latest,current) || latest.some((t,i)=>t.setVideoId!==current[i].setVideoId)) throw Error('掃描期間清單已變動，請重新執行。');
    const seenVideo = new Set();
    const unique = [];
    const duplicates = [];
    for (const t of latest) {
      if (seenVideo.has(t.videoId)) duplicates.push(t);
      else { seenVideo.add(t.videoId); unique.push(t); }
    }
    copy = latest;
    if (duplicates.length) {
      say(`發現重複影片 ${duplicates.length} 支，保留首次出現並移除較新重複…`);
      for (const [i,t] of duplicates.entries()) {
        check();
        say(`移除重複 ${i+1}/${duplicates.length}：${t.title || t.videoId}`);
        if (!t.setVideoId) throw Error('重複影片缺少項目 ID，無法移除。');
        const response=await api('browse/edit_playlist',{playlistId:SOURCE,actions:[{action:'ACTION_REMOVE_VIDEO',setVideoId:t.setVideoId}]});
        if (response.status!=='STATUS_SUCCEEDED') throw Error('移除重複回應未確認成功。可重新執行，工具會重新讀取清單。');
        await sleep(250);
      }
      copy = await playlist(SOURCE, true);
      if (!sameItems(copy, unique) || copy.some((t,i)=>t.setVideoId!==unique[i]?.setVideoId || t.videoId!==unique[i]?.videoId)) {
        throw Error('移除重複後清單與預期不符，請重新執行。');
      }
      state.tracks = copy;
      await save();
      say(`已移除重複 ${duplicates.length} 支，剩餘 ${copy.length} 支。`);
    } else {
      copy = unique;
      state.tracks = unique;
    }
    const target=sorted(state.tracks,state.metadata);
    const queues=new Map();
    for (const t of copy) { if (!queues.has(t.videoId)) queues.set(t.videoId,[]); queues.get(t.videoId).push(t); }
    const desired=target.map(t=>queues.get(t.videoId)?.shift());
    if (desired.some(t=>!t?.setVideoId) || [...queues.values()].some(q=>q.length) || new Set(copy.map(t=>t.setVideoId)).size!==copy.length) throw Error('清單項目不完整或已被修改，停止。');
    say('開始調整目前清單順序…');
    for (let i=desired.length-2;i>=0;i--) {
      check();
      const item=desired[i], successor=desired[i+1];
      const at=copy.findIndex(t=>t.setVideoId===item.setVideoId);
      say(`排序進度 ${desired.length-i-1}/${Math.max(0,desired.length-1)}`);
      if (copy[at+1]?.setVideoId===successor.setVideoId) continue;
      const response=await api('browse/edit_playlist',{playlistId:SOURCE,actions:[{action:'ACTION_MOVE_VIDEO_BEFORE',setVideoId:item.setVideoId,movedSetVideoIdSuccessor:successor.setVideoId}]});
      if (response.status!=='STATUS_SUCCEEDED') throw Error('排序回應未確認成功。可重新執行，工具會重新讀取清單。');
      copy.splice(at,1); copy.splice(copy.findIndex(t=>t.setVideoId===successor.setVideoId),0,item);
      await sleep(250);
    }
    const actual=await playlist(SOURCE);
    if (!same(actual,desired)) throw Error('最終順序驗證未通過，請重新執行接續。');
    say(`排序進度 ${Math.max(0,desired.length-1)}/${Math.max(0,desired.length-1)}`);
    state.tracks=actual; state.completed=true; state.updatedAt=new Date().toISOString(); await save();
    say(`完成：${actual.length} 支，順序已重新讀取驗證。已直接更新目前清單。`);
  }
  async function copyPlaylist() {
    say('讀取原清單…');
    const original=await playlist(SOURCE);
    say(`已讀取 ${original.length}/${original.length} 支，建立私人副本…`);
    const title=(document.querySelector('ytd-playlist-header-renderer h1, yt-dynamic-text-view-model h1')?.textContent || document.title || text('playlistName',"播放清單")).trim().slice(0,80);
    let created;
    try {
      created=await api('playlist/create',{title:title+text('copySuffix'," — 副本"),description:text('copySource','來源：')+'https://www.youtube.com/playlist?list='+SOURCE,privacyStatus:'PRIVATE',sourcePlaylistId:SOURCE});
    } catch(error) {
      throw Error(error.message+' 建立結果未確認，請先查看媒體庫，避免重複建立。');
    }
    if(!/^PL[\w-]+$/.test(created.playlistId || '') || created.playlistId===SOURCE) throw Error('未取得有效副本 ID，請先查看媒體庫，不會自動重試。');
    const link=document.createElement('a');
    link.href=location.origin+'/playlist?list='+encodeURIComponent(created.playlistId);
    link.target='_blank';link.rel='noopener';link.style.color='#ff8080';link.textContent=text('openCopy',"開啟複製的清單");box.append(link);
    say('私人副本已建立，驗證影片順序…');
    const copied=await playlist(created.playlistId);
    if(!same(original,copied)) throw Error('副本已建立，但影片數量或順序與讀取時不一致；請開啟副本確認，不會再建立另一份。');
    say(`完成：已複製 ${copied.length}/${original.length} 支，順序已驗證。`);
  }
  const start=button(text('startAction',"開始／接續"),async()=>{start.disabled=true;running=true;try{await navigator.locks.request(KEY,{ifAvailable:true},async lock=>{if(!lock)throw Error('這份清單正在另一分頁排序。');await run();});}catch(error){say('停止：'+error.message);console.error('[清單排序]',error);}finally{running=false;if(closeRequested)box.remove();else{start.disabled=false;say(text('panelFinished','可關閉此視窗；再次操作時從工具箱開啟。'));}}});
  say(COPY_ONLY ? text('copyDescription','建立目前播放清單的私人副本。') : DATE_ONLY ? text('dateDescription','全曲依上傳日期由舊到新排列；並移除較晚出現的重複影片。') : text('authorDescription','依頻道分組，再依上傳日期由舊到新排列；並移除較晚出現的重複影片。'));
  actions.prepend(start);
  if (!closeRequested) start.click();
})().catch(error => { const box=document.getElementById('bm-playlist-sort'); if(box){const message=document.createElement('p');message.textContent='啟動失敗：'+error.message;box.append(message);} console.error('[清單排序]',error); });
