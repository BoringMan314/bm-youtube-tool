const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const engine=fs.readFileSync('src/injected-channel-import.js','utf8');
const bridge=fs.readFileSync('src/feature-playlist-sort-storage.js','utf8');
const CHANNEL='UC44BPjS0430uUu_e-II6bjQ';
const HANDLE='@xinshenggushi';
const DEST='PLdest';
const db={}; let scans=0, creates=0, adds=0, resolveCalls=0; let lastCreateTitle='';
let channelVideos=[{videoId:'bNew0000001',title:'bNew'},{videoId:'aOld0000001',title:'aOld'},{videoId:'bOld0000001',title:'bOld'}];
let destTracks=[];
function playlistContents(tracks){
  return {contents:{playlistVideoListRenderer:{isEditable:true,contents:tracks.map(t=>({playlistVideoRenderer:{videoId:t.videoId,title:{simpleText:t.title||t.videoId},isPlayable:true,setVideoId:t.setVideoId||('s'+t.videoId)}}))}}};
}
async function run(mode='use',{pathname,href,typedTitle,poisonPlayer=false,pageMapping=true,forceLockupUploads=false,forceLockupChannelTab=false,emptyUploads=false,modernDest=false}={}){
  const nodes=[],listeners=new Map();let task;
  const document={cookie:'SAPISID=test',title:'(14) 新生故事 - YouTube',body:{append(){}},getElementById:()=>null,querySelector:()=>null,
    createElement:()=>{const e={style:{},textContent:'',value:'',type:'',placeholder:'',setAttribute(){},remove(){this.removed=true;},addEventListener(){},append(...kids){for(const k of kids){if(k&&typeof k==='object'){this.last=k;nodes.push(k);}}},prepend(){},click(){if(this.onclick) task=this.onclick();}};nodes.push(e);return e;},
    addEventListener:(k,f)=>{if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f);},
    removeEventListener:(k,f)=>listeners.get(k)?.delete(f),
    dispatchEvent:e=>{for(const f of [...(listeners.get(e.type)||[])])f(e);}};
  const cfg={INNERTUBE_CONTEXT:{client:{clientName:'WEB'}},CHANNEL_ID:'UCpoisonedToaOfficial1'};
  const path=pathname||('/channel/'+CHANNEL+'/videos');
  const page=href||('https://www.youtube.com'+path);
  const ytInitialData=pageMapping?{contents:{twoColumnBrowseResultsRenderer:{tabs:[{tabRenderer:{endpoint:{browseEndpoint:{browseId:CHANNEL,canonicalBaseUrl:'/'+HANDLE}}}}]}},frameworkUpdates:{entityBatchUpdate:{mutations:[{payload:{browseEndpoint:{browseId:'UCpoisonedToaOfficial1',canonicalBaseUrl:'/@Toa_Official'}}}]}}}:{};
  const lockupGrid=()=>({richGridRenderer:{contents:channelVideos.map(t=>({lockupViewModel:{
    metadata:{lockupMetadataViewModel:{title:{content:t.title}}},
    contentImage:{thumbnailViewModel:{image:{sources:[{url:'https://i.ytimg.com/vi/'+t.videoId+'/hqdefault.jpg'}]}}},
    rendererContext:{commandContext:{onTap:{innertubeCommand:{watchEndpoint:{videoId:t.videoId}}}}}
  }}))}});
  const ctx={document,location:{origin:'https://www.youtube.com',href:page,pathname:path},
    __forceLockupUploads:forceLockupUploads,
    __forceLockupChannelTab:forceLockupChannelTab,
    __emptyUploads:emptyUploads,
    __modernDest:modernDest,
    window:{bmChannelImportDest:mode==='use'?DEST:'PLrememberedOld',bmChannelImportMessages:{reuseLastDest:'填入上次目標'},ytcfg:{get:k=>cfg[k]},ytInitialData,
      ytInitialPlayerResponse:poisonPlayer?{videoDetails:{channelId:'UCpoisonedToaOfficial1',author:'- Toa Official -'}}:null},
    chrome:{storage:{local:{get:async k=>({[k]:db[k]}),set:async x=>Object.assign(db,structuredClone(x))}}},
    localStorage:{getItem:()=>null},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},
    navigator:{locks:{request:async(k,o,fn)=>fn({name:k})}},
    crypto:webcrypto,TextEncoder,structuredClone,AbortSignal,URL,Blob,console,
    setTimeout:(fn,ms)=>ms===15000?setTimeout(fn,ms):setTimeout(fn,0),clearTimeout,
    fetch:async(url,options)=>{
      const b=JSON.parse(options.body);
      if(String(b.browseId||'').startsWith('@')) return {ok:false,status:400,json:async()=>({error:{message:'bad handle'}})};
      let result;
      if(url.includes('/navigation/resolve_url')){
        resolveCalls++;
        assert.equal(b.url,'https://www.youtube.com/'+HANDLE);
        result={endpoint:{browseEndpoint:{browseId:CHANNEL,canonicalBaseUrl:'/'+HANDLE}}};
      } else if(url.includes('/browse?')){
        if(b.browseId==='VL'+DEST || b.browseId==='VLUULF'+CHANNEL.slice(2) || b.browseId==='VLUU'+CHANNEL.slice(2)){
          if(b.browseId==='VL'+DEST && ctx.__modernDest){
            result={contents:{richGridRenderer:{contents:destTracks.map(t=>({lockupViewModel:{
              metadata:{lockupMetadataViewModel:{title:{content:t.title||t.videoId}}},
              rendererContext:{commandContext:{onTap:{innertubeCommand:{watchEndpoint:{videoId:t.videoId}}}}}
            }}))}}};
          } else if(b.browseId!=='VL'+DEST && ctx.__emptyUploads){
            result={contents:{playlistVideoListRenderer:{isEditable:false,contents:[]}}};
          } else if(b.browseId!=='VL'+DEST && ctx.__forceLockupUploads){
            result={contents:lockupGrid()};
          } else {
            const tracks=b.browseId==='VL'+DEST?destTracks:channelVideos.map((t,i)=>({...t,setVideoId:'c'+i}));
            result=playlistContents(tracks);
          }
        } else if(b.browseId===CHANNEL){
          if(b.params==='videosTab' || ctx.__forceLockupChannelTab){
            result={
              metadata:{channelMetadataRenderer:{externalId:CHANNEL,title:'新生故事'}},
              contents:{twoColumnBrowseResultsRenderer:{tabs:[{tabRenderer:{title:'影片',selected:true,endpoint:{commandMetadata:{webCommandMetadata:{url:'/'+HANDLE+'/videos'}},browseEndpoint:{browseId:CHANNEL,params:'videosTab'}},content:lockupGrid()}}]}}
            };
          } else {
            result={metadata:{channelMetadataRenderer:{externalId:CHANNEL,title:'新生故事'}}};
          }
        } else if(b.browseId==='UCpoisonedToaOfficial1'){
          result={metadata:{channelMetadataRenderer:{externalId:'UCpoisonedToaOfficial1',title:'- Toa Official -'}}};
        } else throw Error('unexpected browse '+b.browseId);
      } else if(url.includes('/create?')){
        creates++; lastCreateTitle=b.title; result={playlistId:DEST};
      } else if(url.includes('/player?')){
        scans++;
        result={videoDetails:{videoId:b.videoId,channelId:CHANNEL,author:'Ch'},microformat:{playerMicroformatRenderer:{uploadDate:(b.videoId.includes('Old')?'2020-01-01':'2025-09-05')+'T03:01:28-07:00'}}};
      } else if(url.includes('/edit_playlist?')){
        assert.equal(b.playlistId,DEST);
        assert.equal(b.actions[0].action,'ACTION_ADD_VIDEO');
        adds++;
        destTracks.push({videoId:b.actions[0].addedVideoId,setVideoId:'d'+adds});
        result={status:'STATUS_SUCCEEDED'};
      } else throw Error(url);
      return {ok:true,json:async()=>result};
    }};
  vm.createContext(ctx);vm.runInContext(bridge,ctx);vm.runInContext(engine,ctx);
  for(let i=0;i<200&&!nodes.some(n=>n.textContent==='使用此清單開始'||n.textContent==='新建私人清單並開始');i++)await new Promise(r=>setTimeout(r,1));
  const useBtn=nodes.find(n=>n.textContent==='使用此清單開始');
  const createBtn=nodes.find(n=>n.textContent==='新建私人清單並開始');
  const destInput=nodes.find(n=>n.placeholder&&String(n.placeholder).includes('PL'));
  const titleInput=nodes.filter(n=>n.placeholder).find(n=>!String(n.placeholder).includes('PL'));
  assert.ok(useBtn&&createBtn&&destInput,'panel controls');
  assert.equal(destInput.value,'','must not auto-fill remembered destination');
  assert.equal(titleInput?.value||'','','must not auto-fill new playlist title');
  assert.ok(nodes.some(n=>String(n.textContent||'').includes('填入上次目標')||String(n.textContent||'').includes(mode==='use'?DEST:'PLrememberedOld')),'reuse last dest control');
  if(typedTitle!=null && titleInput){ titleInput.value=typedTitle; }
  if(mode==='use'){
    destInput.value=DEST;
    task=useBtn.onclick();
  } else {
    task=createBtn.onclick();
  }
  assert.ok(task,'start action');await task;
  assert.ok(nodes.some(n=>String(n.textContent||'').includes('完成：')),nodes.map(n=>n.textContent).join('\n'));
  assert.ok(!nodes.some(n=>String(n.textContent||'').includes('Toa Official')),'must not resolve poisoned player channel');
}
(async()=>{
  await run('use');
  assert.equal(scans,3);
  assert.equal(creates,0);
  assert.equal(adds,3);
  assert.deepEqual(destTracks.map(t=>t.videoId),['aOld0000001','bOld0000001','bNew0000001']);
  assert.equal(db['bm-channel-import-dest'],DEST);
  const priorAdds=adds;const priorScans=scans;
  await run('use');
  assert.equal(scans,priorScans);
  assert.equal(adds,priorAdds);
  destTracks=[];creates=0;adds=0;scans=0;resolveCalls=0;channelVideos=[{videoId:'cOld0000001',title:'cOld'},{videoId:'cNew0000001',title:'cNew'}];
  Object.keys(db).forEach(k=>{if(k.startsWith('bm-channel-import-v1-')) delete db[k];});
  await run('create',{pathname:'/'+HANDLE+'/videos',href:'https://www.youtube.com/'+HANDLE+'/videos',typedTitle:'新生故事',poisonPlayer:true,pageMapping:true});
  assert.equal(creates,1);
  assert.equal(lastCreateTitle,'新生故事');
  assert.equal(adds,2);
  assert.equal(resolveCalls,0,'page canonicalBaseUrl mapping avoids resolve_url');
  assert.deepEqual(destTracks.map(t=>t.videoId),['cOld0000001','cNew0000001']);
  destTracks=[];creates=0;adds=0;scans=0;resolveCalls=0;
  Object.keys(db).forEach(k=>{if(k.startsWith('bm-channel-import-v1-')) delete db[k];});
  await run('create',{pathname:'/'+HANDLE+'/videos',href:'https://www.youtube.com/'+HANDLE+'/videos',typedTitle:'新生故事B',poisonPlayer:true,pageMapping:false});
  assert.ok(resolveCalls>=1,'falls back to navigation/resolve_url');
  assert.equal(lastCreateTitle,'新生故事B');
  assert.equal(adds,2);
  destTracks=[];creates=0;adds=0;scans=0;resolveCalls=0;
  Object.keys(db).forEach(k=>{if(k.startsWith('bm-channel-import-v1-')) delete db[k];});
  channelVideos=[{videoId:'lOld0000001',title:'lOld'},{videoId:'lNew0000001',title:'lNew'}];
  await run('create',{pathname:'/'+HANDLE+'/videos',href:'https://www.youtube.com/'+HANDLE+'/videos',typedTitle:'lockupUU',forceLockupUploads:true,pageMapping:true});
  assert.equal(adds,2);
  assert.deepEqual(destTracks.map(t=>t.videoId),['lOld0000001','lNew0000001']);
  destTracks=[];creates=0;adds=0;scans=0;resolveCalls=0;
  Object.keys(db).forEach(k=>{if(k.startsWith('bm-channel-import-v1-')) delete db[k];});
  channelVideos=[{videoId:'tOld0000001',title:'tOld'},{videoId:'tNew0000001',title:'tNew'}];
  await run('create',{pathname:'/'+HANDLE+'/videos',href:'https://www.youtube.com/'+HANDLE+'/videos',typedTitle:'lockupTab',emptyUploads:true,forceLockupChannelTab:true,pageMapping:true});
  assert.equal(adds,2);
  assert.deepEqual(destTracks.map(t=>t.videoId),['tOld0000001','tNew0000001']);
  destTracks=[];creates=0;adds=0;scans=0;resolveCalls=0;
  Object.keys(db).forEach(k=>{if(k.startsWith('bm-channel-import-v1-')) delete db[k];});
  channelVideos=[{videoId:'mOld0000001',title:'mOld'},{videoId:'mNew0000001',title:'mNew'}];
  await run('create',{pathname:'/'+HANDLE+'/videos',href:'https://www.youtube.com/'+HANDLE+'/videos',typedTitle:'modernDest',modernDest:true,pageMapping:true});
  assert.equal(adds,2);
  assert.deepEqual(destTracks.map(t=>t.videoId),['mOld0000001','mNew0000001']);
  console.log('PASS: channel import maps @handle, lockupViewModel uploads/tab, modern dest without isEditable, no dest autofill, oldest-first add.');
})().catch(e=>{console.error(e);process.exitCode=1;});
