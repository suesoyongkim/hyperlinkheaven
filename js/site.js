(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const popupDesktop=$('#popupDesktop');
let popup=null,popBody=null,popupTopIndex=70;

// Apply heavy AppleMyungjo-style Korean only to Hangul runs; keep Latin web typography intact.
function applySoyongHangul(root=document.body){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const candidates=[];
 while(walker.nextNode()){
  const node=walker.currentNode, parent=node.parentElement;
  if(!node.nodeValue||!/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(node.nodeValue))continue;
  if(!parent||parent.closest('script,style,textarea,pre,code,.hangul-serif'))continue;
  candidates.push(node);
 }
 for(const node of candidates){
  const value=node.nodeValue,rx=/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]+/g;
  const frag=document.createDocumentFragment();let offset=0,m;
  while((m=rx.exec(value))!==null){
   if(m.index>offset)frag.appendChild(document.createTextNode(value.slice(offset,m.index)));
   const span=document.createElement('span');span.className='hangul-serif';span.lang='ko';span.textContent=m[0];frag.appendChild(span);offset=m.index+m[0].length;
  }
  if(offset<value.length)frag.appendChild(document.createTextNode(value.slice(offset)));
  node.replaceWith(frag);
 }
}
window.applySoyongHangul=applySoyongHangul;
// Each old-web popup is its own movable window; existing windows remain open.
function raisePop(win){
 if(!win || !win.isConnected)return;
 win.style.zIndex=String(++popupTopIndex);
 popup=win;
 popBody=win.querySelector('.window-body');
}
function closePop(win=popup){
 if(!win)return;
 const video=win.querySelector('video');
 if(video && video.srcObject){video.srcObject.getTracks().forEach(track=>track.stop());video.srcObject=null;}
 win.remove();
 const others=$$('#popupDesktop .window.visible');
 const top=others.sort((a,b)=>Number(a.style.zIndex)-Number(b.style.zIndex)).pop();
 popup=top||null;
 popBody=top?.querySelector('.window-body')||null;
}
popupDesktop.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-popup-close]');
  if(!trigger || !popupDesktop.contains(trigger))return;
  event.preventDefault();
  closePop(trigger.closest('.window'));
});
function openPop(title,html){
 const win=document.createElement('div');
 win.className='window visible';
 win.setAttribute('role','dialog');
 win.setAttribute('aria-modal','false');
 win.setAttribute('aria-label',title);
 win.tabIndex=-1;
 win.innerHTML='<div class="window-bar"><span class="window-title"></span><button type="button" class="close" aria-label="Close this window">X</button></div><div class="window-body"></div>';
 win.querySelector('.window-title').textContent=title;
 const body=win.querySelector('.window-body');
 // Popup content is authored locally. Close buttons use a delegated listener.
 body.innerHTML=String(html);
 popupDesktop.appendChild(win);
 applySoyongHangul(body);
 const rect=win.getBoundingClientRect();
 const pad=14;
 const xmax=Math.max(pad,innerWidth-rect.width-pad), ymax=Math.max(pad,innerHeight-Math.min(rect.height,innerHeight-24)-pad);
 let x=pad,y=pad;
 for(let i=0;i<14;i++){
  x=pad+Math.random()*Math.max(0,xmax-pad);
  y=pad+Math.random()*Math.max(0,ymax-pad);
  const crowd=$$('#popupDesktop .window.visible').filter(el=>el!==win).some(el=>Math.abs(el.offsetLeft-x)<105 && Math.abs(el.offsetTop-y)<72);
  if(!crowd)break;
 }
 win.style.left=Math.round(x)+'px';
 win.style.top=Math.round(y)+'px';
 raisePop(win);
 win.addEventListener('pointerdown',()=>raisePop(win));
 win.querySelector('.close').addEventListener('click',()=>closePop(win));
 const bar=win.querySelector('.window-bar');
 let grab=null;
 bar.addEventListener('pointerdown',event=>{
  if(event.target.closest('button'))return;
  event.preventDefault();
  raisePop(win);
  grab={id:event.pointerId, x:event.clientX,y:event.clientY,left:win.offsetLeft,top:win.offsetTop};
  try{bar.setPointerCapture(event.pointerId)}catch{}
 });
 bar.addEventListener('pointermove',event=>{
  if(!grab || event.pointerId!==grab.id)return;
  const left=grab.left+event.clientX-grab.x,top=grab.top+event.clientY-grab.y;
  win.style.left=Math.round(Math.max(0,Math.min(innerWidth-55,left)))+'px';
  win.style.top=Math.round(Math.max(0,Math.min(innerHeight-28,top)))+'px';
 });
 const release=()=>{grab=null;};
 bar.addEventListener('pointerup',release);
 bar.addEventListener('pointercancel',release);
 win.focus();
 return win;
}
function showUnderConstruction(){openPop('UNDER CONSTRUCTION!','<center><h2>*** COMING SOON! ***</h2><img src="uc.gif" alt="Under construction" style="display:block;max-width:210px;max-height:180px;margin:12px auto" onerror="this.style.display=&quot;none&quot;"><p>SOYONG IS BUILDING ANOTHER LITTLE CORNER OF THE WORLD WIDE WEB.</p><b>PLEASE CHECK BACK SOON! :-)</b></center>');}
document.querySelectorAll('a.under-construction-link').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showUnderConstruction();}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePop();});
function localGet(k,def){try{return JSON.parse(localStorage.getItem('soyong1996_'+k))??def}catch{return def}}
function localPut(k,v){try{localStorage.setItem('soyong1996_'+k,JSON.stringify(v))}catch{}}
// Public, cumulative early-web page-view counter.
// Every fresh page load records one view in the Google Sheet. Reloads count too.
// Clicking the displayed number only checks the current total (without adding a visit).
const visitorCounter=$('#counter');
// Render genuine old-web number tiles without changing the counting API.
function drawVisitorCounter(value){
 if(!visitorCounter)return;
 const shown=String(value);
 visitorCounter.replaceChildren();
 visitorCounter.classList.toggle('is-offline', shown==='OFFLINE');
 for(const character of shown){
  const digit=document.createElement('span');
  digit.className='counter-digit';
  digit.textContent=character;
  digit.setAttribute('aria-hidden','true');
  visitorCounter.appendChild(digit);
 }
}
if(visitorCounter){
 drawVisitorCounter('------');
 visitorCounter.title='CONNECTING TO THE WORLD WIDE WEB...';
 visitorCounter.setAttribute('role','button');
 visitorCounter.setAttribute('tabindex','0');
 visitorCounter.style.cursor='pointer';
}
function loadLiveVisitorCounter(action='visit'){
 if(!visitorCounter)return;
 if(!publicGuestConfigured){
  drawVisitorCounter('OFFLINE');
  visitorCounter.title='Visitor counter is not connected';
  return;
 }
 const stamp=Date.now();
 const cb='soyongVisitorCount_'+stamp+'_'+Math.floor(Math.random()*1000000);
 const tag=document.createElement('script');
 let completed=false;
 let timer;
 const cleanup=()=>{
  if(completed)return;
  completed=true;
  clearTimeout(timer);
  tag.remove();
  try{delete window[cb];}catch(e){window[cb]=undefined;}
 };
 const unavailable=(message)=>{
  drawVisitorCounter('OFFLINE');
  visitorCounter.title=message;
  cleanup();
 };
 window[cb]=(payload)=>{
  if(payload && payload.ok===true && Number.isSafeInteger(Number(payload.count)) && Number(payload.count)>=0){
   drawVisitorCounter(String(payload.count).padStart(6,'0'));
   visitorCounter.title='TOTAL PAGE VIEWS — CLICK TO CHECK LATEST COUNT';
   visitorCounter.setAttribute('aria-label','Total page views: '+payload.count+'. Click to refresh the count.');
   cleanup();
  }else{
   unavailable('Visitor counter API is not ready — update and redeploy guestbook.gs');
  }
 };
 timer=setTimeout(()=>unavailable('Cannot reach the visitor counter — check Apps Script access and deployment'),12000);
 tag.onerror=()=>unavailable('Visitor counter network error — check Apps Script deployment');
 tag.src=PUBLIC_GUESTBOOK_URL+'?action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&t='+stamp;
 document.head.append(tag);
}
if(visitorCounter){
 visitorCounter.addEventListener('click',()=>loadLiveVisitorCounter('count'));
 visitorCounter.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'||e.key===' '){e.preventDefault();loadLiveVisitorCounter('count');}
 });
}


$('#smiley').onclick=()=>{openPop('YOU CLICKED THE SMILEY :-)','<center><h3>HAVE A NICE DAY!</h3><p>:-) :-) :-) :-) :-)</p><button data-popup-close="1">THANKS!</button></center>')};
// Contact shortcuts use real mailto: and Instagram URLs; no placeholder popups.
const sidebarEmail = $('#sideEmailLink');
const sidebarInstagram = $('#sideInstagramLink');


const movieFiles={
  'Pulp Fiction':{director:'Quentin Tarantino',year:'1994',note:"A film on SOYONG'S movie shelf."},
  'Like You Know It All':{director:'Hong Sang-soo',year:'2009',note:'Korean title: 잘 알지도 못하면서.'},
  'Image scraps':{director:'SOYONG',year:'ONGOING',note:'A messy collection of images and things I want to look at again.'}
};
$$('.movieInfo').forEach(el=>el.onclick=()=>{
  const title=el.dataset.film,info=movieFiles[title];if(!info)return;
  openPop('MOVIE FILE: '+title,'<b>'+esc(title)+'</b><p>'+esc(info.director)+' / '+esc(info.year)+'</p><p>'+esc(info.note)+'</p><button data-popup-close="1">CLOSE</button>');
});
const crateNotes={
  west:['N.W.A. / WEST COAST','LOUD BASS. OLD-SCHOOL RAP.'],
  chicano:['CHICANO RAP / 90s','A LITTLE LOWRIDER RADIO STATION.'],
  ambient:['AMBIENT / LATE NIGHT','FOR STAYING UP AND BROWSING THE INTERNET.']
};
function openCrate(key){const rec=crateNotes[key];if(!rec)return;openPop("SOYONG'S RECORD CRATE",'<center><b>'+esc(rec[0])+'</b><p>'+esc(rec[1])+'</p><p>MORE ALBUMS WILL GO HERE SOON...</p><button data-popup-close="1">CLOSE</button></center>');}
$$('.recordInfo').forEach(el=>el.addEventListener('click',()=>openCrate(el.dataset.record)));
$('#randomRecord').addEventListener('click',()=>{const keys=Object.keys(crateNotes);openCrate(keys[Math.floor(Math.random()*keys.length)]);});
$$('.collectInfo').forEach(el=>el.onclick=()=>openPop('OBJECT DATABASE',`<b>${el.dataset.name}</b><p>FILE STATUS: UNDER CONSTRUCTION.</p><button data-popup-close="1">OK</button>`));
$('#randomMood').onclick=()=>{const moods=['NEON RED // NIGHT CITY // FILM GRAIN','1990s PHOTOGRAPHS // BAD SCANS // GOOD MEMORIES','DARK GREEN // OLD MONITORS // AFTER MIDNIGHT','DAYLIGHT DISPOSABLE CAMERA // BLURRED MOTION'];const moodWin=openPop('IMAGE MOOD GENERATOR','<b>'+moods[Math.floor(Math.random()*moods.length)]+'</b><p>Press again for another mood.</p><button class="againMood">AGAIN!</button>');moodWin.querySelector('.againMood').onclick=$('#randomMood').onclick;};
const glyphs=['★','✦','✸','♥','☄','☆'];let trail=false;let tick=0;
function starAt(x,y){if(!trail)return;const el=document.createElement('span');el.className='trail-star';el.textContent=glyphs[Math.random()*glyphs.length|0];el.style.left=x+'px';el.style.top=y+'px';$('#trail-layer').appendChild(el);setTimeout(()=>el.remove(),680)}
document.addEventListener('pointermove',e=>{if((tick++%3)===0)starAt(e.clientX,e.clientY)});
$('#cursorLink').onclick=()=>{trail=!trail;openPop('CURSOR TRAIL.EXE','<center>CURSOR TRAIL: '+(trail?'ON':'OFF')+'<p>MOVE YOUR MOUSE!</p><button data-popup-close="1">OK</button></center>')};

function showOldWebSurprise(){openPop('A LITTLE INTERNET SURPRISE','<center><h3>YOU FOUND A SECRET CORNER!</h3><p>HELLO FROM SOYONG :-)</p></center>');}
$('#rainBtn').onclick=showOldWebSurprise;$('#chaosLink').onclick=showOldWebSurprise;
// Vintage wallpaper switch: jagged blue tile by default; old starfield or solid black also available.
const cloudWallpaper='linear-gradient(rgba(255,255,255,.23), rgba(255,255,255,.23)), url("imagine_cloud_blue.jpg") repeat 0 0 #fff';
const starWallpaper='url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAIAAAABc2X6AAAAnElEQVR4nO3ZQQ6DIBAFUGx6ZzmCnnq6MOmCWBemg0beWxFJBsgf2VAKAAA8VkTkFX/llb6nowPP89xtH5uI2OL9Dv7unVH0tGmaSikRsQ1Sltj92mS7rmvS8rtSD3ykf0t3MNylBQAAAAAAAAyl1vprarjn0ise2jM12S7LctVOutLSHd2tqYZLOPHSarI9+K8eRUsDAAAAADCyD3znJtSqiakgAAAAAElFTkSuQmCC") repeat #000';
const bgModes=[['BLUE',cloudWallpaper],['STARS',starWallpaper],['BLACK','#000']];
let bgModeIndex=0;
function setWebsiteWallpaper(index){
  bgModeIndex=index;
  const [name,pattern]=bgModes[index];
  document.documentElement.style.background=pattern;
  document.documentElement.style.backgroundSize = name === 'BLUE' ? 'auto, 150px 150px' : 'auto';
  document.body.style.background='transparent';
  const link=$('#starsLink');
  if(link){link.textContent='CHANGE BACKGROUND ['+name+']';link.title='BLUE → STARS → BLACK';}
}
$('#starsLink').onclick=()=>setWebsiteWallpaper((bgModeIndex+1)%bgModes.length);
setWebsiteWallpaper(0);
let asciiIx=0;const ascii=[' /\\_/\\\n( o.o )\n > ^ <',' /\\_/\\\n( >.< )\n  >★<',' /\\_/\\\n( -.- )\n (   )','  /\\_/\\\n (=^.^=)\n  (")(")'];
function asciiChange(){$('#asciiBox').textContent=ascii[++asciiIx%ascii.length];}$('#asciiBox').onclick=asciiChange;$('#asciiLink').onclick=asciiChange;
$('#glitchLink').onclick=()=>{document.body.style.filter='invert(1) hue-rotate(80deg)';setTimeout(()=>document.body.style.filter='',500);};
const portals=['#about','#sue-zone','#friends-zone','#playground','#turtleClub','#guestbook','#dj-zone'];$('#randomLink').onclick=()=>{const dest=portals[Math.random()*portals.length|0];location.hash=dest;openPop('RANDOM PAGE JUMP','<center>YOU HAVE OPENED '+dest.toUpperCase()+'<p><button data-popup-close="1">NICE</button></p></center>')};
// PUBLIC GUESTBOOK CONNECTION: put your Apps Script deployment URL here after setup.
// The page does NOT claim that a message is shared until the online API responds.
const PUBLIC_GUESTBOOK_URL = 'https://script.google.com/macros/s/AKfycbwgsNjordR6jhGME84uPMdVQBSbxjT3kwXfuiAQwuoJ9tec_iTukX5QVd4hLTFgBDGQHQ/exec';
const publicGuestConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(PUBLIC_GUESTBOOK_URL);
loadLiveVisitorCounter();
function esc(v){return String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function guestStatus(msg){const e=$('#guestbookStatus');if(e)e.textContent=msg;}
let guestEntries=[];
function renderEntries(){
 const area=$('#visitorNotes'); if(!area)return;
 area.replaceChildren();
 $('#guestbookCount').textContent='MESSAGES: '+guestEntries.length;
 if(!guestEntries.length){const n=document.createElement('div');n.className='entry';n.textContent='NO MESSAGES YET. BE THE FIRST!';area.append(n);return;}
 guestEntries.slice(-100).reverse().forEach(o=>{
  const n=document.createElement('div');n.className='entry';
  const head=document.createElement('b');head.textContent=String(o.name||'GUEST');
  const date=document.createElement('small');date.textContent=' / '+String(o.date||'');
  const msg=document.createElement('div');msg.textContent=String(o.message||'');
  n.append(head,date,msg);area.append(n);
 });
}
function signGuest(){location.hash='#guestbook';setTimeout(()=>$('#guestFormInline input[name="name"]')?.focus(),60);}
$('#guestLink').onclick=signGuest;
$('#palomailGuest').onclick=(event)=>{event.preventDefault();signGuest();};
function loadPublicGuestbook({quiet=false}={}){
 if(!publicGuestConfigured){if(!quiet)guestStatus('SETUP NEEDED — NOT YET SAVING ONLINE');return Promise.resolve(false);}
 if(!quiet)guestStatus('READING THE PUBLIC GUESTBOOK...');
 return new Promise(resolve=>{
   const cb='soyongGuest_'+Date.now()+'_'+Math.floor(Math.random()*100000);
   const script=document.createElement('script');
   let done=false;
   const complete=(ok)=>{if(done)return;done=true;clearTimeout(timer);script.remove();delete window[cb];resolve(ok);};
   const timer=setTimeout(()=>{if(!quiet)guestStatus('COULD NOT LOAD MESSAGES. TRY REFRESH.');complete(false);},8500);
   window[cb]=(payload)=>{
     if(payload && payload.ok && Array.isArray(payload.entries)){
       guestEntries=payload.entries.slice(-100);renderEntries();
       if(!quiet)guestStatus('PUBLIC GUESTBOOK // CONNECTED');
       complete(true);
     }else{if(!quiet)guestStatus('GUESTBOOK API ERROR — CHECK GOOGLE SHEET CONNECTION.');complete(false);}
   };
   script.onerror=()=>{if(!quiet)guestStatus('NETWORK ERROR — TRY AGAIN.');complete(false);};
   script.src=PUBLIC_GUESTBOOK_URL+'?action=list&callback='+encodeURIComponent(cb)+'&t='+Date.now();
   document.head.append(script);
 });
}
const guestForm=$('#guestFormInline');
let guestSending=false;
const guestSendButton=$('#signBtn');
const guestSendLabel=guestSendButton.textContent;
const pauseGuestCheck=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
guestForm.onsubmit=async(e)=>{
 e.preventDefault();
 if(guestSending)return; // one click = one request; never send twice while checking
 if(!publicGuestConfigured){guestStatus('CONNECT GOOGLE SHEETS BEFORE SENDING PUBLIC MESSAGES.');return;}
 const f=new FormData(guestForm);
 if(String(f.get('website')||'')){guestStatus('FORM ERROR — PLEASE RELOAD THE PAGE.');return;}
 const name=String(f.get('name')||'').trim().slice(0,28);
 const message=String(f.get('message')||'').trim().slice(0,300);
 if(!name || !message){guestStatus('PLEASE WRITE YOUR NAME AND MESSAGE.');return;}
 guestSending=true;
 guestSendButton.disabled=true;
 guestSendButton.textContent='✉ SENDING...';
 guestStatus('SENDING YOUR LETTER... PLEASE WAIT.');
 let postHadNetworkError=false;
 try{
   // GAS's ContentService writes to Sheets and redirects its response. For a
   // static web page, no-cors hides the response, so don't infer success here.
   const form=new URLSearchParams({name,message,website:'',action:'post'});
   try{
     await fetch(PUBLIC_GUESTBOOK_URL,{
       method:'POST',mode:'no-cors',redirect:'follow',
       headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form
     });
   }catch(err){postHadNetworkError=true;}
   // Google Sheets can take a few seconds to show the new row. Check again
   // automatically instead of asking visitors to click SEND a second time.
   const waitTimes=[550,850,1250,1600,2000,2400,2900];
   let confirmed=false;
   for(let i=0;i<waitTimes.length;i++){
     guestStatus('DELIVERING LETTER... CHECKING MAILBOX ('+(i+1)+'/'+waitTimes.length+')');
     await pauseGuestCheck(waitTimes[i]);
     const loaded=await loadPublicGuestbook({quiet:true});
     if(loaded && guestEntries.some(o=>o.name===name && o.message===message)){
       confirmed=true;
       break;
     }
   }
   if(confirmed){
     guestForm.reset();
     guestStatus('✉ MESSAGE POSTED! EVERYONE CAN READ IT.');
   }else{
     guestStatus(postHadNetworkError
       ? 'CONNECTION ERROR — CHECK THE MESSAGES BEFORE SENDING AGAIN.'
       : 'SENT, BUT NOT CONFIRMED YET — CHECK MESSAGES BEFORE RETRYING.');
   }
 }finally{
   guestSending=false;
   guestSendButton.disabled=false;
   guestSendButton.textContent=guestSendLabel;
 }
};
$('#guestRefresh').onclick=()=>loadPublicGuestbook();
loadPublicGuestbook();
// Webcams require permission and HTTPS; public guestbook requires the deployed API.
$('#webcamBtn').onclick=async()=>{const webcamWin=openPop('WEBCAM.EXE','<div class="center">Connecting to camera...<p><video autoplay playsinline muted style="max-width:100%;max-height:180px;border:3px inset gray"></video></p><button data-popup-close="1">DISCONNECT</button></div>');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Webcam needs localhost or HTTPS.');const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});const v=webcamWin.querySelector('video');if(!v||!webcamWin.isConnected){stream.getTracks().forEach(t=>t.stop());return;}v.srcObject=stream;}catch(err){if(webcamWin.isConnected)webcamWin.querySelector('.window-body').innerHTML='<b>WEBCAM NOT AVAILABLE.</b><p>'+esc(err.message)+'</p><p>To use webcam, open this page on localhost or HTTPS and allow camera access.</p><button type="button" data-popup-close="1">OK</button>';}};
// Both old-web jukebox buttons now control the SAME uploaded MIDI soundtrack.
// Removed the unrelated synth demo so there is no possibility of a second tune.
$('#playBtn').onclick=()=>{if(!window.isSoyongBgmPlaying?.())window.playSoyongBgm?.();};
$('#stopBtn').onclick=()=>window.stopSoyongBgm?.();
$('#midiLink').onclick=()=>{document.getElementById('bgm-player').scrollIntoView({behavior:'smooth',block:'start'});if(!window.isSoyongBgmPlaying?.())bgmToggle.click();};
$$('.badges img').forEach(img=>img.onclick=()=>openPop('MY INTERNET BUTTONS','<center>YOU FOUND A VERY OLD BUTTON!<br>TAKE ONE FOR YOUR HOME PAGE.<p><button data-popup-close="1">OK</button></p></center>'));

// DJ & McDonald's image shelves: try likely same-folder GIF names until a real file is found.
const djGifCandidates=[
 ['dj1.gif','djing1.gif','dj-1.gif','dj_1.gif','DJ1.gif','dj.gif','turntable.gif','vinyl.gif','recordplayer.gif'],
 ['dj2.gif','djing2.gif','dj-2.gif','dj_2.gif','DJ2.gif','disc.gif','record.gif'],
 ['dj3.gif','djing3.gif','dj-3.gif','dj_3.gif','DJ3.gif','djbooth.gif','mixer.gif'],
 ['dj4.gif','djing4.gif','dj-4.gif','dj_4.gif','DJ4.gif'],
 ['dj5.gif','djing5.gif','dj-5.gif','dj_5.gif','DJ5.gif']
];
const mcdGifCandidates=[
 ['mcd1.gif','mac1.gif','mcdonald1.gif','mcdonalds1.gif','mcd-1.gif','mc1.gif','mcdo1.gif','mcdonalds.gif','mcdonald.gif'],
 ['mcd2.gif','mac2.gif','mcdonald2.gif','mcdonalds2.gif','mcd-2.gif','mc2.gif','mcdo2.gif'],
 ['mcd3.gif','mac3.gif','mcdonald3.gif','mcdonalds3.gif','mcd-3.gif','mc3.gif','mcdo3.gif'],
 ['mcd4.gif','mac4.gif','mcdonald4.gif','mcdonalds4.gif','mcd-4.gif','mc4.gif','mcdo4.gif'],
 ['mcd5.gif','mac5.gif','mcdonald5.gif','mcdonalds5.gif','mcd-5.gif','mc5.gif','mcdo5.gif'],
 ['mcd6.gif','mac6.gif','mcdonald6.gif','mcdonalds6.gif','mcd-6.gif','mc6.gif','mcdo6.gif']
];
function findGifFile(options){return new Promise(resolve=>{
 let i=0;const tryNext=()=>{
   if(i>=options.length){resolve(null);return;}
   const path=options[i++],img=new Image();img.onload=()=>resolve(path);img.onerror=tryNext;img.src=path;
 };tryNext();
});}
async function renderInterestRack(id,groups,label){
 const rack=document.getElementById(id);if(!rack)return;
 const files=await Promise.all(groups.map(findGifFile));
 files.forEach((file,index)=>{
   if(!file)return;
   const item=document.createElement('a');item.href='javascript:void(0)';item.className='interest-gif';item.title='OPEN '+file;
   const image=document.createElement('img');image.src=file;image.alt=label+' animation '+(index+1);image.loading='lazy';
   const caption=document.createElement('small');caption.textContent=file.toUpperCase();
   item.append(image,caption);
   item.onclick=(event)=>{event.preventDefault();openPop(label+' / '+file.toUpperCase(),'<center><img style="max-width:92%;max-height:300px;object-fit:contain" src="'+encodeURI(file)+'" alt="'+label+' GIF"><br><button data-popup-close="1">CLOSE</button></center>');};
   rack.append(item);
 });
 if(!files.some(Boolean)){const msg=document.createElement('div');msg.className='interest-notice';msg.textContent='GIF SHELF READY — PUT THE '+label+' GIF FILES NEXT TO INDEX.HTML.';rack.append(msg);}
}
renderInterestRack('djGifRack',djGifCandidates,'DJING');
renderInterestRack('mcdGifRack',mcdGifCandidates,'McDONALD’S');

// User-supplied vintage GIFs are loaded relatively: index.html and 10 GIFs in the same folder.
$$('.gif-asset img').forEach(img=>{
  function missing(){img.closest('.gif-asset')?.classList.add('missing');}
  img.addEventListener('error',missing);
  if(img.complete && img.naturalWidth===0) missing();
});
$('#heartGif')?.closest('a')?.addEventListener('click',e=>{e.preventDefault();});
$('#heartWandGif')?.closest('a')?.addEventListener('click',e=>{e.preventDefault();});
$('#heartFrameGif')?.closest('a')?.addEventListener('click',e=>{e.preventDefault();signGuest();});
$('#graveGifLink')?.addEventListener('click',e=>{e.preventDefault();openPop('R.I.P. 404 - DEAD LINK CEMETERY','<center><h3>HERE LIES THE LOST INTERNET</h3><p>1996 ~ FOREVER</p><p>All the links we clicked and pages we forgot...</p><button data-popup-close="1">PAY RESPECTS</button></center>');});


// The old GIF upload/exchange feature has been removed.
// Decorative GIFs, guestbook, counter and turtle game remain enabled.

// TURTLE.NET 1997 — Feed the turtles, read their individual mail, collect postage stamps.
const turtleCountKey='slownetTurtleLettersV1';
const turtleStampKey='slownetTurtleStampsV2';
const turtleIds=['11','15','23','26','27','35','36','37','38','39','40','46'];
const turtlePersonalities={
 '11':{say:'I HAVE BEEN WAITING SINCE 1997.',mail:'DEAR VISITOR, I WAS JUST TAKING A SMALL BREAK FROM DOING ABSOLUTELY NOTHING. YOUR LETTUCE WAS A WONDERFUL INTERRUPTION. PLEASE COME BACK IN ANOTHER DECADE.'},
 '15':{say:'DO YOU LIKE MY LITTLE HAT?',mail:'HELLO!!! I PUT ON MY FANCIEST HAT TO RECEIVE YOUR LETTUCE. THIS IS OFFICIALLY THE BEST-DRESSED LUNCH I HAVE EVER HAD. YOUR FRIEND, TURTLE 15.'},
 '23':{say:'INSERT LETTUCE TO CONTINUE.',mail:'WELCOME TO TURTLE ARCADE. YOU GOT 001 LEAF AND 9999 POINTS! NEW HIGH SCORE: SLOWEST PLAYER ON THE WORLD WIDE WEB. WOULD YOU LIKE TO PLAY AGAIN? Y/N'},
 '26':{say:'SPEED LIMIT: ONE STEP PER HOUR.',mail:'SPECIAL DELIVERY! I CAME AS FAST AS I COULD. WHICH IS TO SAY: NOT FAST AT ALL. THANK YOU FOR SUPPORTING TURTLE EXPRESS. NO REFUNDS.'},
 '27':{say:'MY SKATEBOARD IS FASTER THAN ME.',mail:'DUDE!!! I TRIED TO DELIVER THIS POSTCARD ON MY SKATEBOARD. I ARRIVED BEFORE I LEFT. THE INTERNET IS A STRANGE PLACE. THANKS FOR THE LEAF.'},
 '35':{say:'I FOUND A NICE PLACE TO SIT.',mail:'I WAS ON MY WAY TO THE OTHER SIDE OF THE POND. THEN I SAW A REALLY NICE ROCK AND SAT DOWN. I MAY NEVER LEAVE. PLEASE SEND MORE LETTUCE.'},
 '36':{say:'HELLO MY FRIEND!!! :-)',mail:'HELLO MY INTERNET FRIEND! THIS IS YOUR OFFICIAL FRIENDSHIP POSTCARD FROM TURTLE 36. WE ARE NOW FRIENDS. THIS ARRANGEMENT CANNOT BE UNDONE.'},
 '37':{say:'I MIGHT BE A DINOSAUR. SHHH.',mail:'A SECRET: I HAVE NOT DECIDED WHETHER I AM A TURTLE OR A DINOSAUR. PLEASE DO NOT INFORM THE WEBMASTER. YOUR LEAF WAS DELICIOUS EITHER WAY.'},
 '38':{say:'I AM SMALL, BUT VERY BUSY.',mail:'THIS IS THE SMALLEST POSTCARD IN THE HISTORY OF TURTLE.NET. IT TOOK ME ALL AFTERNOON TO WRITE IT. I HOPE YOU CAN READ IT. HI.'},
 '39':{say:'ONE LEAF = ONE BANJO SOLO.',mail:'PLINK, PLONK, PLINK. I WROTE YOU A SONG ABOUT LETTUCE. THE POST OFFICE WOULD NOT ALLOW ME TO MAIL THE MUSIC, SO HERE IS A VERY QUIET POSTCARD INSTEAD.'},
 '40':{say:'I AM STILL PLAYING THAT SONG.',mail:'HELLO FROM MY NEVER-ENDING BANJO TOUR! THANK YOU FOR THE SNACK. MY NEXT CONCERT BEGINS IN 3 TO 5 BUSINESS YEARS. PLEASE KEEP YOUR TICKET.'},
 '46':{say:'POSTCARD FROM THE DEEP BLUE SEA.',mail:'DEAR LAND PERSON, I CROSSED AN ENTIRE OCEAN TO ACCEPT YOUR LETTUCE. THE SEA HAS NO WIFI. PLEASE TELL THE WORLD WIDE WEB I SAID HELLO.'}
};
let lettuce=Math.max(0,Number(localGet(turtleCountKey,localGet('lettuce',0)))||0);
let turtleVisited=localGet(turtleStampKey,[]);
if(!Array.isArray(turtleVisited))turtleVisited=[];
turtleVisited=[...new Set(turtleVisited.map(String).filter(id=>turtleIds.includes(id)))];
let turtleSelectedId='11';
let turtleDelivering=false;
let turtleDeliveryTimer=null;
const turtleElements=$$('#turtleClub .turtle-pal');
const turtleKiosk=$('#turtleResponse');
const turtleMeter=$('#turtleLoadBar');
const turtleFeedButton=$('#feedTurtles');
const turtleLeaf=$('#leafToken');
const turtleStamps=$('#turtleStamps');
function updateLettuce(){
 $('#lettuceCount').textContent=String(lettuce).padStart(3,'0');
 $('#turtleStampProgress').textContent=turtleVisited.length+' / 12 FOUND';
 turtleStamps.replaceChildren();
 turtleIds.forEach(id=>{
  const found=turtleVisited.includes(id);
  const stamp=document.createElement('button');
  stamp.type='button';
  stamp.className='turtle-stamp-item'+(found?' collected':'');
  stamp.dataset.stampId=id;
  stamp.textContent=found?'✉ '+id:'? '+id;
  stamp.title=found?'Stamp found! Select Turtle '+id:'Feed Turtle '+id+' to unlock';
  stamp.setAttribute('aria-label',(found?'Collected':'Missing')+' stamp for Turtle '+id);
  stamp.addEventListener('click',()=>selectTurtle(id));
  turtleStamps.appendChild(stamp);
 });
 const prize=$('#turtleAlbumPrize');
 prize.textContent=turtleVisited.length===12?'*** CONGRATULATIONS! YOU ARE AN HONORARY CITIZEN OF TURTLE.NET. PLEASE WALK SLOWLY. ***':'';
}
function selectTurtle(id){
 if(!turtlePersonalities[id]||turtleDelivering)return;
 turtleSelectedId=id;
 const name='TURTLE '+id;
 $('#turtleSelected').textContent=name;
 $('#turtleDestination').textContent=name;
 $('#turtleSpeechName').textContent=name+' SAYS:';
 $('#turtleSpeech').textContent=turtlePersonalities[id].say;
 turtleFeedButton.textContent='[ FEED TURTLE '+id+' ]';
 turtleElements.forEach(el=>{
  const active=el.dataset.turtle==='Turtle '+id;
  el.classList.toggle('selected',active);
  el.setAttribute('aria-pressed',active?'true':'false');
 });
 if($('#turtleMood').textContent!=='LETTER DELIVERED')$('#turtleMood').textContent='READY TO FEED';
 turtleKiosk.textContent='> '+name+' SELECTED. NOW FEED SOME LETTUCE!';
}
function finishTurtlePost(id){
 turtleDelivering=false;
 const name='TURTLE '+id;
 lettuce++;localPut(turtleCountKey,lettuce);localPut('lettuce',lettuce);
 const newStamp=!turtleVisited.includes(id);
 if(newStamp){turtleVisited.push(id);localPut(turtleStampKey,turtleVisited);}
 updateLettuce();
 $('#turtleMood').textContent='YOU\'VE GOT MAIL!';
 turtleKiosk.textContent=newStamp?'> NEW STAMP UNLOCKED! CHECK YOUR ALBUM BELOW.':'> LETTER DELIVERED! YOUR TURTLE IS HAPPY.';
 $('#turtleLetter').textContent=turtlePersonalities[id].mail;
 $('#turtleLetterStamp').textContent='FROM '+name+' // LETTER #'+String(lettuce).padStart(3,'0')+' // POSTMARK: TURTLE.NET';
 $('#turtleMail').classList.add('visible');
 turtleFeedButton.disabled=false;
 $('#randomTurtle').disabled=false;
 turtleLeaf.removeAttribute('aria-disabled');
 turtleElements.forEach(el=>el.classList.remove('turtle-chewing'));
 if(turtleVisited.length===12){$('#turtleAlbumPrize').classList.add('celebrate');}
}
function feedTheTurtles(id=turtleSelectedId){
 if(turtleDelivering){turtleKiosk.textContent='> PLEASE WAIT. ONE LEAF AT A TIME!';return;}
 if(!turtlePersonalities[id])id=turtleSelectedId;
 selectTurtle(id);
 turtleDelivering=true;
 turtleFeedButton.disabled=true;
 $('#randomTurtle').disabled=true;
 turtleLeaf.setAttribute('aria-disabled','true');
 $('#turtleMail').classList.remove('visible');
 $('#turtleMood').textContent='DIALING...';
 const target=turtleElements.find(el=>el.dataset.turtle==='Turtle '+id);
 if(target)target.classList.add('turtle-chewing');
 const phases=[
  {pct:3, msg:'DIALING TURTLE.NET AT 14.4 KBPS', mood:'CONNECTING', wait:220},
  {pct:6, msg:'LISTENING FOR MODEM NOISE', mood:'CONNECTING', wait:190},
  {pct:11, msg:'CONNECTION ESTABLISHED', mood:'CONNECTING', wait:180},
  {pct:17, msg:'PACKING A FRESH LETTUCE LEAF', mood:'PACKING LETTUCE', wait:200},
  {pct:24, msg:'ADDING EXTRA CRUNCH', mood:'PACKING LETTUCE', wait:170},
  {pct:31, msg:'TURTLE IS CHEWING. CRUNCH... CRUNCH...', mood:'CHEWING!', wait:230},
  {pct:39, msg:'TURTLE IS STILL CHEWING...', mood:'CHEWING!', wait:170},
  {pct:47, msg:'LICKING STAMP', mood:'SENDING POSTCARD', wait:160},
  {pct:54, msg:'STAMP STUCK SLIGHTLY CROOKED', mood:'SENDING POSTCARD', wait:180},
  {pct:62, msg:'POSTCARD IS TRAVELLING THROUGH CYBERSPACE', mood:'SENDING POSTCARD', wait:190},
  {pct:70, msg:'STOPPING AT A SLOW SERVER', mood:'SENDING POSTCARD', wait:160},
  {pct:77, msg:'PASSING THROUGH THE WORLD WIDE WEB', mood:'SENDING POSTCARD', wait:175},
  {pct:85, msg:'ALMOST AT THE MAILBOX', mood:'SENDING POSTCARD', wait:155},
  {pct:92, msg:"YOU'VE GOT MAIL!", mood:'SENDING POSTCARD', wait:145},
  {pct:100, msg:'DELIVERY COMPLETE', mood:'LETTER DELIVERED', wait:120}
 ];
 turtleMeter.style.width='0%';
 clearTimeout(turtleDeliveryTimer);
 let stepIndex=0;
 const advance=()=>{
  const phase=phases[stepIndex];
  turtleMeter.style.width=phase.pct+'%';
  turtleKiosk.textContent='> '+phase.msg+' ... '+String(phase.pct).padStart(3,'0')+'%';
  $('#turtleMood').textContent=phase.mood;
  stepIndex += 1;
  if(stepIndex>=phases.length){
   turtleDeliveryTimer=null;
   finishTurtlePost(id);
   return;
  }
  turtleDeliveryTimer=setTimeout(advance, phase.wait);
 };
 turtleDeliveryTimer=setTimeout(advance, 170);
}
updateLettuce();
selectTurtle('11');
turtleFeedButton.addEventListener('click',()=>feedTheTurtles());
$('#randomTurtle').addEventListener('click',()=>{
 const options=turtleIds.filter(id=>id!==turtleSelectedId);
 selectTurtle(options[Math.floor(Math.random()*options.length)]);
});
turtleElements.forEach(el=>el.addEventListener('click',e=>{e.preventDefault();const id=(el.dataset.turtle||'Turtle 11').replace(/[^0-9]/g,'');selectTurtle(id);}));
// Existing turtle links outside the game now bring visitors to their turtle's feeding station.
$$('.turtle-pal').filter(el=>!el.closest('#turtleClub')).forEach(el=>el.addEventListener('click',e=>{
 e.preventDefault();
 const id=(el.dataset.turtle||'Turtle 11').replace(/[^0-9]/g,'');
 selectTurtle(id);
 $('#turtleClub').scrollIntoView({behavior:'smooth',block:'center'});
}));
turtleLeaf.addEventListener('click',()=>feedTheTurtles());
turtleLeaf.addEventListener('dragstart',e=>{if(turtleDelivering){e.preventDefault();return;}e.dataTransfer.setData('text/plain','turtle-lettuce');e.dataTransfer.effectAllowed='copy';});
turtleLeaf.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();feedTheTurtles();}});
const turtlePond=$('#pondDrop');
turtlePond.addEventListener('dragover',e=>{if(turtleDelivering)return;e.preventDefault();e.dataTransfer.dropEffect='copy';turtlePond.classList.add('dragover');});
turtlePond.addEventListener('dragleave',e=>{if(!turtlePond.contains(e.relatedTarget))turtlePond.classList.remove('dragover');});
turtlePond.addEventListener('drop',e=>{e.preventDefault();turtlePond.classList.remove('dragover');if(e.dataTransfer.getData('text/plain')!=='turtle-lettuce')return;const target=e.target.closest('.turtle-pal');feedTheTurtles(target?(target.dataset.turtle||'').replace(/[^0-9]/g,''):turtleSelectedId);});
$('#turtleFacts').addEventListener('click',()=>openPop('TURTLE.NET — HELP FILE (1997)',`<center><h3>WELCOME TO TURTLE.NET!</h3><p>1. CLICK A TURTLE TO CHOOSE YOUR NEW FRIEND.</p><p>2. CLICK THE LETTUCE OR [ FEED TURTLE ], OR DRAG THE LETTUCE ONTO A TURTLE.</p><p>3. WAIT FOR YOUR POSTCARD FROM 1997.</p><p>4. COLLECT ALL 12 POSTAGE STAMPS!</p><p>POSTCARDS MAILED: ${lettuce}. NO EXPRESS DELIVERY.</p><button data-popup-close="1">[ OKAY, I GET IT! ]</button></center>`));

$('#retroMusicGif')?.addEventListener('click',e=>{e.preventDefault();$('#playBtn').click();document.getElementById('bgm-player').scrollIntoView({behavior:'smooth',block:'start'});});
$$('.party-click').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openPop('IT IS NOW PARTY TIME !!!','<center><h3 style="color:red">★ PARTY AT SOYONG\'S HOUSE ★</h3>BRING YOUR OWN GIF!<p><b>COME TO <span class="hangul-serif" lang="ko">불광동</span>!</b></p><p>:-) :-D ;-) </p><button data-popup-close="1">PARTY ON!</button></center>');}));
$$('.dead-click').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();openPop('404 INTERNET CEMETERY','<center><h3>HERE LIES AN OLD LINK</h3><p>IT WAS VERY POPULAR IN 1997.</p><p>NOW NOBODY KNOWS WHERE IT WENT.</p><button data-popup-close="1">F</button></center>');}));
$$('.gif-toy').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();gifSurprise();}));


// My English nickname and future friends' homepages.

// Click-to-view for the eight original friendship GIFs. Filenames remain unchanged.
$$('[data-preview-friend-gif]').forEach(button=>button.addEventListener('click',()=>{
  const name=button.dataset.previewFriendGif||'';
  if(!/^friend[1-8]\.gif$/.test(name))return;
  const title=button.querySelector('small')?.textContent||'FRIENDSHIP GIF';
  openPop('FRIENDSHIP ARCHIVE — '+title,
    '<div style="text-align:center"><img src="'+name+'" alt="'+title+'" style="max-width:95%;max-height:300px;object-fit:contain;image-rendering:auto" onerror="this.style.display=\'none\';this.nextElementSibling.textContent=\'PUT '+name+' BESIDE index.html\'"><p style="font:11px Courier New,monospace;color:#444">'+title+'</p><button type="button" data-popup-close="1">[ CLOSE ]</button></div>');
}));

// Two tiny 1990s GIF neighborhoods.
const lavaUnits=$$('#lavaShelf .lava-unit');
$('#lavaPick').addEventListener('click',()=>{
  if(!lavaUnits.length)return;
  lavaUnits.forEach(el=>el.classList.remove('is-picked'));
  const index=Math.floor(Math.random()*lavaUnits.length);
  lavaUnits[index].classList.add('is-picked');
  $('#lavaStatus').textContent=(lavaUnits[index].querySelector('.zone-filename')?.textContent||'LAMP')+' IS YOUR LUCKY LAMP !!!';
});
$('#lavaLights').addEventListener('click',()=>{
  const active=$('#lavaShelf').classList.toggle('lava-dark');
  $('#lavaLights').textContent=active?'[ TURN ON THE LIGHTS ]':'[ TURN OFF THE LIGHTS ]';
  $('#lavaLights').setAttribute('aria-pressed',String(active));
  $('#lavaStatus').textContent=active?'NIGHT MODE ACTIVATED':'ALL 5 LAMPS ONLINE';
});
$$('[data-preview-gif]').forEach(button=>button.addEventListener('click',()=>{
  const name=button.getAttribute('data-preview-gif')||'';
  if(!/^(?:lava[1-5]|korea[1-9])\.gif$/.test(name))return;
  const isLava=name.startsWith('lava');
  const displayName=button.querySelector('.zone-filename')?.textContent||name;
  openPop((isLava?'LAVA LAMP ARCHIVE':'KOREA GIF ARCHIVE')+' — '+displayName,
    '<div style="text-align:center"><img src="'+name+'" alt="'+name+'" style="display:block;margin:7px auto 12px;max-width:95%;max-height:260px;object-fit:contain;image-rendering:auto" onerror="this.style.display=\'none\';this.nextElementSibling.textContent=\'GIF FILE NOT FOUND. PUT '+name+' BESIDE index.html\'"><p style="font:bold 13px Courier New,monospace;color:#00008b">'+displayName+'</p><p style="font:10px Courier New,monospace">Original file: '+name+'</p><button type="button" data-popup-close="1">[ OK ]</button></div>');
}));

})();
