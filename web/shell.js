/* JJ Ecosystem — native shell
   Loads saved data from on-device storage, then starts the app.
   Your notes live only on this device (IndexedDB). App updates never touch them. */
(function(){
  'use strict';
  var VERSION='__VERSION__';
  var C=window.Capacitor;
  var isNative=!!(C&&C.isNativePlatform&&C.isNativePlatform());
  function plug(n){try{if(!C)return null;if(C.registerPlugin)return C.registerPlugin(n);return C.Plugins&&C.Plugins[n]}catch(e){return null}}
  var FS=isNative?plug('Filesystem'):null,SH=isNative?plug('Share'):null,APP=isNative?plug('App'):null;

  /* ---- on-device storage (IndexedDB) ---- */
  var DBN='jj-ecosystem',STORE='kv',dbp=null;
  function db(){return dbp||(dbp=new Promise(function(ok,no){var r=indexedDB.open(DBN,1);r.onupgradeneeded=function(){r.result.createObjectStore(STORE)};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}}))}
  function idbGet(k){return db().then(function(d){return new Promise(function(ok,no){var q=d.transaction(STORE).objectStore(STORE).get(k);q.onsuccess=function(){ok(q.result)};q.onerror=function(){no(q.error)}})})}
  function idbPut(k,v){return db().then(function(d){return new Promise(function(ok,no){var tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,k);tx.oncomplete=function(){ok()};tx.onerror=function(){no(tx.error)}})})}
  var pending=null,writing=false;
  function flushQ(){if(writing)return;writing=true;(function next(){if(pending===null){writing=false;return}var j=pending;pending=null;idbPut('state',j).then(next,function(e){console.error('save failed',e);next()})})()}
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}

  /* ---- files: save to Documents/JJ Ecosystem, share sheet as a fallback or on request ---- */
  function b64(blob){return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(String(r.result).split(',')[1])};r.onerror=function(){no(r.error)};r.readAsDataURL(blob)})}
  function share(uri,name){return SH.share({title:name,files:[uri],dialogTitle:'Send '+name}).catch(function(e){if(!/cancel/i.test(String(e&&e.message)))throw e})}
  function say(m,a){try{if(window.toast)window.toast(m,a)}catch(e){}}
  function saveFile(name,blob){
    if(!isNative||!FS){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},2000);return Promise.resolve()}
    return b64(blob).then(function(data){
      return FS.writeFile({path:'JJ Ecosystem/'+name,data:data,directory:'DOCUMENTS',recursive:true}).then(function(r){
        say('Saved to Documents › JJ Ecosystem',{label:'Share',fn:function(){share(r.uri,name)}});
      },function(){
        return FS.writeFile({path:name,data:data,directory:'CACHE'}).then(function(r){return share(r.uri,name)});
      });
    });
  }

  window.JJ_APP={version:VERSION,native:isNative,
    persist:function(S){try{pending=JSON.stringify(S)}catch(e){return}flushQ()},
    saveFile:saveFile};

  /* ---- Android back button: close the top-most panel, otherwise leave the app ---- */
  function vis(sel){var el=document.querySelector(sel);return !!(el&&!el.hidden&&el.getClientRects().length)}
  function call(fn){try{if(typeof window[fn]==='function'){window[fn]();return true}}catch(e){}return false}
  function onBack(){
    if(vis('#lock')){APP&&APP.minimizeApp();return}
    var scrim=document.querySelector('.gadj-scrim');if(scrim){scrim.click();return}
    if(vis('#cdlg')){var c=document.querySelector('#cdlg [data-r="0"]');if(c){c.click();return}}
    var steps=[['#pop','closePop'],['#slash','closeSlash'],['#dmenu','closeMenu'],['#modal','closeExport'],['#tpanel','closeTheme'],['#cpanel','closeCover'],['#spanel','closeSettings'],['#trash','closeTrash'],['#npanel','closeNotes'],['#peek','closePeek']];
    for(var i=0;i<steps.length;i++){if(vis(steps[i][0])&&call(steps[i][1]))return}
    var side=document.querySelector('#side.open');if(side&&call('closeDrawer'))return;
    /* nothing open: back leaves the app */
    APP&&APP.minimizeApp();
  }

  /* ---- start ---- */
  function start(st){
    if(st)window.JJ_BOOT=st;
    var src=document.getElementById('jjmain').textContent,s=document.createElement('script');s.textContent=src;document.body.appendChild(s);
    if(APP){
      APP.addListener('backButton',onBack);
      var pausedAt=0;
      APP.addListener('pause',function(){pausedAt=Date.now();try{window.flushSave&&window.flushSave()}catch(e){}});
      APP.addListener('resume',function(){try{var m=+((typeof S!=='undefined'&&S.settings&&S.settings.autolock)||0);if(m>0&&pausedAt&&Date.now()-pausedAt>m*60000&&window.lockApp)window.lockApp()}catch(e){}});
    }
    document.addEventListener('visibilitychange',function(){if(document.hidden){try{window.flushSave&&window.flushSave()}catch(e){}}});
  }
  idbGet('state').then(function(j){var st=null;try{if(j)st=JSON.parse(j)}catch(e){}start(st)},function(){start(null)});
})();
