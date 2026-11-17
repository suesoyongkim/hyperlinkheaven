// SOYONG MIXTAPE: one shared audio player, with native audio for the original
// PULPFICTION render and a lightweight Web Audio synthesizer for .mid files.
// All MIDI notes are read from the visitor's original files, not replaced by demo tunes.
const siteBgm=document.getElementById('siteBgm');
const bgmRoot=document.getElementById('bgm-player');
const bgmToggle=document.getElementById('bgmToggle');
const bgmVolume=document.getElementById('bgmVolume');
const bgmStatus=document.getElementById('bgmStatus');
const bgmSeek=document.getElementById('bgmSeek');
const bgmTime=document.getElementById('bgmTime');
const bgmVersionCaption=document.getElementById('bgmVersionCaption');
const trackTitle=document.getElementById('bgmTrackTitle');
const playlistHelp=document.getElementById('bgmFileStatus');
const filePicker=document.getElementById('bgmMidiFiles');
const originalBgmSrc=siteBgm.src;
const bgmTracks=[
  {label:'PULP FICTION',file:'pulpfiction.mid',type:'audio'},
  {label:'EVANGELION',file:'Evangelion.mid',type:'midi',midi:null,asset:'assets/music/evangelion.mid',localScript:'assets/music/evangelion-local.js',cacheKey:'evangelion'},
  {label:'FRIENDS',file:'Friends.mid',type:'midi',midi:null,asset:'assets/music/friends.mid',localScript:'assets/music/friends-local.js',cacheKey:'friends'}
];
const bgmVersions={
 classic:{label:'ORIGINAL',source:'classic',speed:1,wave:'triangle',detail:'01 / ORIGINAL'},
 arcade:{label:'8-BIT',source:'arcade',speed:1,wave:'square',detail:'02 / ARCADE'},
 dream:{label:'DREAM',source:'dream',speed:1,wave:'sine',detail:'03 / DREAM'},
 turbo:{label:'TURBO',source:'classic',speed:1.22,wave:'sawtooth',detail:'04 / FAST'},
 chiptune:{label:'CHIPMUNK',source:'classic',speed:1.43,wave:'square',detail:'05 / CHIPMUNK'},
 slowmo:{label:'SLOW MO',source:'classic',speed:.78,wave:'triangle',detail:'06 / SLOW MOTION'}
};
let bgmTrackIndex=0,bgmMode='classic',currentSourceMode='classic',bgmSwapSerial=0,bgmVolumeHigh=false;
const midiPlayer={ctx:null,master:null,song:null,playing:false,position:0,startClock:0,startPosition:0,nextIndex:0,timer:null,voices:new Set()};
const timeText=(x)=>{x=Number.isFinite(x)?Math.max(0,Math.floor(x)):0;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');};
function songIsMidi(){return bgmTracks[bgmTrackIndex].type==='midi';}
function currentPlaying(){return songIsMidi()?midiPlayer.playing:!siteBgm.paused;}
function bgmAudioSource(name){
  if(name==='arcade')return 'assets/music/pulpfiction-8bit.mp3';
  if(name==='dream')return 'assets/music/pulpfiction-dream.mp3';
  return originalBgmSrc;
}
function midiCurrentTime(){
 if(!midiPlayer.playing || !midiPlayer.ctx)return midiPlayer.position;
 return Math.max(0,midiPlayer.startPosition+(midiPlayer.ctx.currentTime-midiPlayer.startClock)*bgmVersions[bgmMode].speed);
}
function bgmDuration(){return songIsMidi()?(bgmTracks[bgmTrackIndex].midi?.duration||0):(Number.isFinite(siteBgm.duration)?siteBgm.duration:143);}
function bgmPosition(){return songIsMidi()?midiCurrentTime():siteBgm.currentTime;}
function bgmPaint(){
 const song=bgmTracks[bgmTrackIndex],on=currentPlaying(), mode=bgmVersions[bgmMode];
 trackTitle.textContent='♫ '+song.file.toUpperCase();
 bgmToggle.textContent=on?'Ⅱ PAUSE':'▶ PLAY MUSIC';
 bgmToggle.setAttribute('aria-pressed',String(on));
 bgmRoot.classList.toggle('playing',on);
 bgmVersionCaption.textContent=mode.detail+'  /  '+song.label;
 bgmStatus.textContent=(on?'♫ NOW PLAYING':'■ READY')+' / '+song.label+' / '+mode.label;
 bgmRoot.querySelectorAll('[data-bgm-mode]').forEach(button=>{
  const selected=button.dataset.bgmMode===bgmMode;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 bgmRoot.querySelectorAll('[data-bgm-track]').forEach(button=>{
  const selected=Number(button.dataset.bgmTrack)===bgmTrackIndex;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 });
 const p=document.getElementById('playerState');if(p)p.textContent=on?'♫ '+song.label:'OFFLINE';
 bgmTimeUpdate();
}
function bgmTimeUpdate(){
 const length=bgmDuration(),position=bgmPosition();
 bgmTime.textContent=timeText(position)+' / '+(length?timeText(length):'--:--');
 if(length>0&&!bgmSeek.matches(':active'))bgmSeek.value=String(Math.max(0,Math.min(1000,Math.floor(position/length*1000))));
}
// Minimal Standard MIDI File reader: tempo, running status, multiple tracks,
// channel programs, percussion and note on/off. Works without a CDN or server API.
function parseLocalMidi(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
 let p=0;
 const ascii=(n)=>{let s='';while(n--)s+=String.fromCharCode(bytes[p++]);return s;};
 const u16=()=>{if(p+2>bytes.length)throw Error('Truncated MIDI');const n=dv.getUint16(p);p+=2;return n;};
 const u32=()=>{if(p+4>bytes.length)throw Error('Truncated MIDI');const n=dv.getUint32(p);p+=4;return n;};
 const vlq=()=>{let n=0,x=0;do{if(p>=bytes.length||x++>4)throw Error('Invalid MIDI delta');let b=bytes[p++];n=(n<<7)|(b&127);if(!(b&128))return n;}while(true);};
 if(ascii(4)!=='MThd')throw Error('Not a .mid file');
 const headerLength=u32(),headerEnd=p+headerLength;
 if(headerLength<6)throw Error('Invalid MIDI header');
 const format=u16(),trackCount=u16(),division=u16();p=headerEnd;
 if(format>2||division&0x8000)throw Error('Unsupported MIDI timebase');
 const notes=[],tempos=[{tick:0,us:500000}];let maxTick=0;
 for(let track=0;track<trackCount;track++){
  if(p+8>bytes.length)break;
  const kind=ascii(4),len=u32(),end=Math.min(bytes.length,p+len);
  if(kind!=='MTrk'){p=end;continue;}
  let tick=0,running=0,active=new Map();const programs=Array(16).fill(0);
  while(p<end){
   tick+=vlq();if(p>=end)break;
   let status=bytes[p];
   if(status&0x80){p++;if(status<0xf0)running=status;}
   else {if(!running)throw Error('MIDI running status missing');status=running;}
   if(status===0xff){
    const meta=bytes[p++],size=vlq();
    if(meta===0x51&&size===3&&p+3<=end){const us=(bytes[p]<<16)|(bytes[p+1]<<8)|bytes[p+2];tempos.push({tick,us});}
    p+=size;if(meta===0x2f)break;continue;
   }
   if(status===0xf0||status===0xf7){p+=vlq();continue;}
   if(status>=0xf0){const sizes={0xf1:1,0xf2:2,0xf3:1,0xf6:0,0xf8:0,0xfa:0,0xfb:0,0xfc:0,0xfe:0};p+=(sizes[status]||0);continue;}
   const op=status>>4,ch=status&15,one=bytes[p++];
   const two=op===0xc||op===0xd?0:bytes[p++];
   if(op===0xc){programs[ch]=one;continue;}
   const key=ch+':'+one;
   if(op===0x9&&two>0){
    if(!active.has(key))active.set(key,[]);
    active.get(key).push({tick,pitch:one,velocity:two,ch,program:programs[ch]});
   } else if(op===0x8||(op===0x9&&two===0)){
    const starts=active.get(key);if(starts?.length){const note=starts.shift();notes.push({...note,endTick:Math.max(tick,note.tick+1)});}
   }
  }
  maxTick=Math.max(maxTick,tick);
  for(const starts of active.values())for(const note of starts)notes.push({...note,endTick:Math.max(tick,note.tick+1)});
  p=end;
 }
 tempos.sort((a,b)=>a.tick-b.tick);
 let tt=0,sec=0,lastTempo=500000;
 const tempoIndex=[{tick:0,sec:0,us:lastTempo}];
 for(const t of tempos){sec+=(t.tick-tt)*lastTempo/(division*1000000);tt=t.tick;lastTempo=t.us;tempoIndex.push({tick:tt,sec,us:lastTempo});}
 const toSeconds=tick=>{let lo=0,hi=tempoIndex.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(tempoIndex[mid].tick<=tick)lo=mid;else hi=mid-1;}const t=tempoIndex[lo];return t.sec+(tick-t.tick)*t.us/(division*1000000);};
 const playable=notes.filter(n=>n.pitch<=127).map(n=>({start:toSeconds(n.tick),duration:Math.max(.035,toSeconds(n.endTick)-toSeconds(n.tick)),pitch:n.pitch,velocity:n.velocity,channel:n.ch,program:n.program})).sort((a,b)=>a.start-b.start);
 if(!playable.length)throw Error('No playable MIDI notes');
 return {notes:playable,duration:Math.max(toSeconds(maxTick),...playable.slice(-50).map(n=>n.start+n.duration))+.3};
}
function midiFindNext(pos){const notes=midiPlayer.song?.notes||[];let lo=0,hi=notes.length;while(lo<hi){const mid=(lo+hi)>>1;if(notes[mid].start<pos-.03)lo=mid+1;else hi=mid;}return lo;}
function midiStopVoices(){for(const node of midiPlayer.voices){try{node.osc.stop();}catch(_){}try{node.osc.disconnect();node.gain.disconnect();}catch(_){}}midiPlayer.voices.clear();}
function midiPause(reset=false){
 if(midiPlayer.playing)midiPlayer.position=midiCurrentTime();
 midiPlayer.playing=false;
 if(midiPlayer.timer){clearInterval(midiPlayer.timer);midiPlayer.timer=null;}
 midiStopVoices();if(reset)midiPlayer.position=0;
 bgmPaint();
}
function midiScheduleNote(note){
 const mp=midiPlayer,ctx=mp.ctx,mode=bgmVersions[bgmMode],speed=mode.speed;
 const position=midiCurrentTime(),offset=Math.max(0,note.start-position);
 const start=ctx.currentTime+offset/speed+.005;
 const len=Math.max(.035,note.duration/speed);
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 const isDrum=note.channel===9;
 let type=mode.wave;
 if(mode.label==='ORIGINAL')type=note.program>=40&&note.program<=55?'sawtooth':'triangle';
 if(isDrum)type='square';
 osc.type=type;
 const frequency=isDrum?(note.pitch<42?95:note.pitch<49?180:350):440*Math.pow(2,(note.pitch-69)/12);
 osc.frequency.setValueAtTime(frequency,start);
 const volume=(isDrum?.035:.075)*(note.velocity/127);
 const attack=mode.label==='DREAM'?.08:.008;
 const release=mode.label==='DREAM'?.36:mode.label==='ORIGINAL'?.12:.07;
 gain.gain.setValueAtTime(.0001,start);
 gain.gain.linearRampToValueAtTime(volume,start+Math.min(attack,len*.25));
 gain.gain.setValueAtTime(volume*.72,start+Math.max(.012,len-release));
 gain.gain.exponentialRampToValueAtTime(.0001,start+len+release);
 osc.connect(gain).connect(mp.master);
 const record={osc,gain};mp.voices.add(record);
 osc.onended=()=>{mp.voices.delete(record);try{osc.disconnect();gain.disconnect();}catch(_){}};
 osc.start(start);osc.stop(start+len+release+.01);
}
function midiScheduler(){
 const mp=midiPlayer;if(!mp.playing||!mp.song)return;
 const pos=midiCurrentTime();
 if(pos>=mp.song.duration){midiPause(true);midiStart().catch(()=>{});return;}
 const range=pos+Math.max(.5,.65*bgmVersions[bgmMode].speed);
 const notes=mp.song.notes;
 while(mp.nextIndex<notes.length&&notes[mp.nextIndex].start<range){
  const n=notes[mp.nextIndex++];if(n.start+n.duration>pos-.035)midiScheduleNote(n);
 }
 bgmTimeUpdate();
}
async function midiStart(){
 const mp=midiPlayer,song=bgmTracks[bgmTrackIndex].midi;if(!song)return false;
 const Ctx=window.AudioContext||window.webkitAudioContext;
 if(!Ctx){playlistHelp.textContent='THIS BROWSER DOES NOT SUPPORT WEB AUDIO';return false;}
 if(!mp.ctx){mp.ctx=new Ctx();mp.master=mp.ctx.createGain();mp.master.connect(mp.ctx.destination);}
 await mp.ctx.resume();
 siteBgm.pause();mp.song=song;
 if(mp.position>=song.duration)mp.position=0;
 mp.startPosition=mp.position;mp.startClock=mp.ctx.currentTime;
 mp.nextIndex=midiFindNext(mp.position);
 mp.master.gain.value=bgmVolumeHigh?.44:.2;
 mp.playing=true;
 mp.timer=setInterval(midiScheduler,100);midiScheduler();bgmPaint();return true;
}
async function loadMidiTrack(index){
  const track=bgmTracks[index];
  if(track.midi)return true;
  try {
    // On GitHub Pages read a real MIDI file only when a track is chosen.
    // The local JS alternative preserves Safari file:// playback without
    // placing MIDI payloads in the homepage HTML.
    if(location.protocol!=='file:') {
      try {
        const response=await fetch(track.asset,{cache:'force-cache'});
        if(!response.ok)throw new Error('MIDI FILE NOT FOUND');
        track.midi=parseLocalMidi(await response.arrayBuffer());
        playlistHelp.textContent='♫ '+track.file+' LOADED!';
        return true;
      }catch(networkError){
        // The JS fallback is used if static MIDI fetch fails.
      }
    }
    if(!window.WEB_SWEET_WEB_MIDI?.[track.cacheKey]){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=track.localScript;
        script.onload=resolve;
        script.onerror=()=>reject(new Error('LOCAL MIDI DATA NOT FOUND'));
        document.head.appendChild(script);
      });
    }
    const encoded=window.WEB_SWEET_WEB_MIDI?.[track.cacheKey];
    if(!encoded)throw new Error('MIDI DATA NOT FOUND');
    const binary=atob(encoded),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    track.midi=parseLocalMidi(bytes.buffer);
    playlistHelp.textContent='♫ '+track.file+' READY!';
    return true;
  }catch(error){
    playlistHelp.textContent='COULD NOT LOAD '+track.file+'. KEEP THE ASSETS/MUSIC FOLDER WITH INDEX.HTML.';
    return false;
  }
}
async function bgmPlay(){
 if(songIsMidi()){
  const okay=await loadMidiTrack(bgmTrackIndex);
  if(!okay)return;
  try{await midiStart();}catch(error){playlistHelp.textContent='MIDI COULD NOT START: '+error.message;}
 }else{
  midiPause(false);
  try{await siteBgm.play();}catch(_){bgmStatus.textContent='CLICK PLAY TO START MUSIC';}
 }
 bgmPaint();
}
function bgmPause(){if(songIsMidi())midiPause();else siteBgm.pause();bgmPaint();}
function bgmStop(){bgmPause();if(songIsMidi())midiPlayer.position=0;else siteBgm.currentTime=0;bgmPaint();}
function bgmChangeVersion(mode){
 if(!bgmVersions[mode])return;
 const playing=currentPlaying(),position=bgmPosition();
 const prev=bgmMode,next=bgmVersions[mode];bgmMode=mode;
 if(songIsMidi()){
  if(playing){midiPause();midiPlayer.position=position;midiStart().catch(()=>{});}
  bgmPaint();return;
 }
 siteBgm.preservesPitch=false;
 siteBgm.playbackRate=next.speed;
 if(next.source!==currentSourceMode){
  ++bgmSwapSerial;const swap=bgmSwapSerial;
  currentSourceMode=next.source;siteBgm.pause();siteBgm.src=bgmAudioSource(next.source);siteBgm.load();
  siteBgm.addEventListener('loadedmetadata',function once(){
   if(swap!==bgmSwapSerial)return;
   siteBgm.defaultPlaybackRate=next.speed;siteBgm.playbackRate=next.speed;
   siteBgm.currentTime=Math.min(position,Math.max(0,siteBgm.duration-.25));
   if(playing)siteBgm.play().catch(()=>{});bgmPaint();
  },{once:true});
 }else if(playing&&siteBgm.paused){siteBgm.play().catch(()=>{});}
 bgmPaint();
}
async function bgmSelectTrack(index,autoplay=true){
 if(index<0)index=bgmTracks.length-1;
 if(index>=bgmTracks.length)index=0;
 bgmPause();midiPause(true);siteBgm.pause();siteBgm.currentTime=0;
 bgmTrackIndex=index;bgmPaint();
 const track=bgmTracks[index];
 if(track.type==='midi'){
  playlistHelp.textContent='CHECKING '+track.file+'...';
  if(!(await loadMidiTrack(index))){bgmPaint();return;}
 }else playlistHelp.textContent='ORIGINAL AUDIO READY.';
 if(autoplay)await bgmPlay();else bgmPaint();
}
bgmToggle.addEventListener('click',()=>{if(currentPlaying())bgmPause();else bgmPlay();});
bgmVolume.addEventListener('click',()=>{
 bgmVolumeHigh=!bgmVolumeHigh;
 siteBgm.volume=bgmVolumeHigh?.55:.22;
 if(midiPlayer.master)midiPlayer.master.gain.value=bgmVolumeHigh?.44:.2;
 bgmVolume.textContent=bgmVolumeHigh?'VOL: HI':'VOL: LO';
});
bgmRoot.querySelectorAll('[data-bgm-mode]').forEach(btn=>btn.addEventListener('click',()=>bgmChangeVersion(btn.dataset.bgmMode)));
bgmRoot.querySelectorAll('[data-bgm-track]').forEach(btn=>btn.addEventListener('click',()=>bgmSelectTrack(Number(btn.dataset.bgmTrack))));
document.getElementById('bgmPrevTrack').addEventListener('click',()=>bgmSelectTrack(bgmTrackIndex-1));
document.getElementById('bgmNextTrack').addEventListener('click',()=>bgmSelectTrack(bgmTrackIndex+1));
document.getElementById('bgmSurprise').addEventListener('click',()=>{
 const other=Object.keys(bgmVersions).filter(x=>x!==bgmMode);
 bgmChangeVersion(other[Math.random()*other.length|0]);
});
bgmSeek.addEventListener('input',()=>{
 const duration=bgmDuration();if(!duration)return;
 const target=duration*Number(bgmSeek.value)/1000;
 if(songIsMidi()){
  const was=midiPlayer.playing;midiPause();midiPlayer.position=target;
  if(was)midiStart().catch(()=>{});else bgmPaint();
 }else{siteBgm.currentTime=target;bgmTimeUpdate();}
});
filePicker.addEventListener('change',async()=>{
 let count=0;
 for(const file of filePicker.files){
  const t=bgmTracks.find(x=>x.type==='midi'&&x.file.toLowerCase()===file.name.toLowerCase());
  if(!t)continue;
  try{t.midi=parseLocalMidi(await file.arrayBuffer());count++;}
  catch(e){playlistHelp.textContent='INVALID '+file.name+': '+e.message;return;}
 }
 playlistHelp.textContent=count?count+' MIDI FILE(S) READY! CLICK A SONG ABOVE.':'CHOOSE Evangelion.mid AND/OR Friends.mid.';
 bgmPaint();
});
for(const type of ['dragenter','dragover'])bgmRoot.addEventListener(type,e=>{e.preventDefault();bgmRoot.classList.add('bgm-dragging');});
for(const type of ['dragleave','drop'])bgmRoot.addEventListener(type,e=>{e.preventDefault();bgmRoot.classList.remove('bgm-dragging');});
bgmRoot.addEventListener('drop',async(e)=>{
 let count=0;for(const file of e.dataTransfer.files){
  const t=bgmTracks.find(x=>x.type==='midi'&&x.file.toLowerCase()===file.name.toLowerCase());if(!t)continue;
  try{t.midi=parseLocalMidi(await file.arrayBuffer());count++;}catch(_){}
 }
 playlistHelp.textContent=count?'♫ '+count+' MIDI FILE(S) LOADED — CLICK A TRACK TO PLAY':'DROP Evangelion.mid OR Friends.mid';
 bgmPaint();
});
siteBgm.volume=.22;siteBgm.loop=true;
for(const type of ['play','pause','timeupdate','loadedmetadata','ended'])siteBgm.addEventListener(type,()=>{if(!songIsMidi())bgmPaint();});
siteBgm.addEventListener('error',()=>{if(!songIsMidi())bgmStatus.textContent='AUDIO ERROR';});
window.stopSoyongBgm=bgmStop;
window.playSoyongBgm=bgmPlay;
window.isSoyongBgmPlaying=currentPlaying;
window.openSoyongTrack=bgmSelectTrack;
bgmPaint();
window.applySoyongHangul?.(document.body);
