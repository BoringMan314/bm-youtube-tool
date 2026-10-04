'use strict';
document.getElementById('importChannelVideos').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  const status = document.getElementById('status');
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab?.url || 'about:blank');
    if (url.origin !== 'https://www.youtube.com') throw Error(chrome.i18n.getMessage('openChannelPrompt'));
    const path = url.pathname;
    const ok = /^\/(channel\/UC[\w-]+|@[^/]+)(\/videos)?\/?$/.test(path) || path === '/watch';
    if (!ok) throw Error(chrome.i18n.getMessage('openChannelPrompt'));
    const dest = (await chrome.storage.local.get('bm-channel-import-dest'))['bm-channel-import-dest'] || '';
    const keys = ["closePanel","closingPanel","panelFinished","channelTools","importChannel","importChannelDescription","openChannelPrompt","panelOpened","stopAction","startAction","preparing","playlistName","copySource","destPlaylistLabel","destPlaylistPlaceholder","useDestPlaylist","createDestPlaylist","createDestTitleLabel","reuseLastDest","openCopy"];
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['src/feature-playlist-sort-storage.js']});
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func: (messages,dest) => { window.bmChannelImportMessages=messages; window.bmChannelImportDest=dest; },args:[Object.fromEntries(keys.map(key=>[key,chrome.i18n.getMessage(key)])),dest]});
    await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',files:['src/injected-channel-import.js']});
    status.textContent = chrome.i18n.getMessage('panelOpened');
  } catch(error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
