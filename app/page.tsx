'use client';
import { useEffect, useRef, useState } from 'react';
import { filters, frames, Frame, Filter, PHOTO_WIDTH, PHOTO_HEIGHT, renderStrip, SVA_END, prepareSvaArtwork, SVA_WINDOWS } from '../lib/strip';

type Phase = 'home' | 'loading' | 'ready' | 'capturing' | 'error' | 'editor' | 'printing' | 'done';
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

function LiveFrame({ stream, photo, index, active, count, artwork }: { artwork?: HTMLCanvasElement|null; stream: MediaStream|null; photo?:string; index:number; active:boolean; count:number|null }) {
  const ref=useRef<HTMLVideoElement>(null);
  const overlay=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    if(!artwork||!overlay.current)return;
    const window=SVA_WINDOWS[index]; const canvas=overlay.current;
    canvas.width=window.width;canvas.height=window.height;
    canvas.getContext('2d')!.drawImage(artwork,window.x,window.y,window.width,window.height,0,0,window.width,window.height);
  },[artwork,index]);
  useEffect(()=>{const video=ref.current;if(video&&stream&&!photo){video.srcObject=stream;void video.play().catch(()=>{});}return()=>{if(video)video.srcObject=null;};},[stream,photo]);
  return <div className={`live-frame ${active?'active':''} ${photo?'exposed':''}`}>
    {photo?<img src={photo} alt={`Captured photo ${index+1}`} />:<video ref={ref} muted playsInline autoPlay aria-label={`Live camera frame ${index+1}`} />}
    {artwork&&<canvas ref={overlay} className="sva-person-overlay" aria-label={`SVA portrait overlay ${index+1}`} />}
    <span className="frame-number">0{index+1}</span>{photo?<span className="frame-check">✓</span>:active&&count!==null?<span className="count">{count}</span>:null}
  </div>;
}

export default function Booth(){
  const [phase,setPhase]=useState<Phase>('home');
  const [media,setMedia]=useState<MediaStream|null>(null);
  const stream=useRef<MediaStream|null>(null), source=useRef<HTMLVideoElement>(null);
  const generation=useRef(0), busy=useRef(false), photos=useRef<HTMLCanvasElement[]>([]);
  const [shots,setShots]=useState<string[]>([]), [count,setCount]=useState<number|null>(null), [flash,setFlash]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
  const [frame,setFrame]=useState<Frame>('silver'),[filter,setFilter]=useState<Filter>('Original');
  const [svaAvailable,setSvaAvailable]=useState(false);
  const [svaArtwork,setSvaArtwork]=useState<HTMLCanvasElement|null>(null);
  const preview=useRef<HTMLCanvasElement>(null), file=useRef<File|null>(null), url=useRef<string|null>(null);
  const [strip,setStrip]=useState<string|null>(null);
  const [exporting,setExporting]=useState(false);

  function stop(){stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setMedia(null);}
  function chooseFrame(){++generation.current;busy.current=false;stop();photos.current=[];setShots([]);setCount(null);setFlash(false);setNotice('');setPhase('editor');}
  function home(){++generation.current;busy.current=false;stop();setCount(null);setFlash(false);setPhase('home');}
  useEffect(()=>{
    setSvaAvailable(Date.now()<Date.parse(SVA_END));
    const artwork=new Image();artwork.onload=()=>setSvaArtwork(prepareSvaArtwork(artwork));artwork.src='/sva-greenscreen.png';
    const hidden=()=>{if(document.hidden&&busy.current){++generation.current;busy.current=false;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setMedia(null);setCount(null);setFlash(false);setError('Your session paused. Try again when you’re ready for four fresh photos.');setPhase('error');}};
    document.addEventListener('visibilitychange',hidden);
    return()=>{++generation.current;stream.current?.getTracks().forEach(t=>t.stop());if(url.current)URL.revokeObjectURL(url.current);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[phase]);
  useEffect(()=>{if(phase==='editor'&&preview.current)renderStrip(preview.current,[],frame,filter,svaArtwork);},[phase,frame,filter,svaArtwork]);
  useEffect(()=>{if(phase!=='printing')return;const timer=setTimeout(()=>setPhase('done'),4600);return()=>clearTimeout(timer);},[phase]);

  async function start(){
    if(frame==='sva'&&Date.now()>=Date.parse(SVA_END)){setSvaAvailable(false);setFrame('silver');setNotice('The SVA edition has ended. Please choose another frame.');setPhase('editor');return;}
    const token=++generation.current;stop();busy.current=false;photos.current=[];setShots([]);setCount(null);setFlash(false);setNotice('');setPhase('loading');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('secure');
      const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080}}});
      if(token!==generation.current){next.getTracks().forEach(t=>t.stop());return;}
      stream.current=next;setMedia(next);
      const video=source.current;if(!video)throw new Error('preview');video.srcObject=next;await video.play();
      if(token!==generation.current)return;
      next.getVideoTracks()[0].onended=()=>{if(token!==generation.current)return;++generation.current;busy.current=false;setCount(null);setFlash(false);setError('Your camera disconnected. Reconnect it and try again.');setPhase('error');};
      setPhase('ready');
    }catch(cause){if(token!==generation.current)return;stop();setError(cause instanceof Error&&cause.message==='secure'?'Open this app on localhost or a secure HTTPS address to use your camera.':cause instanceof Error&&cause.name==='NotAllowedError'?'Camera access is off. In Safari, open the page menu → Website Settings → Camera → Allow. In other browsers, allow Camera in the site permissions beside the address, then try again.':'We couldn’t start your camera. Check your camera permissions and close any other app using it, then try again.');setPhase('error');}
  }
  async function capture(){
    if(busy.current||phase!=='ready')return;busy.current=true;const token=generation.current;setPhase('capturing');
    try{
      for(let index=0;index<4;index++){
        for(let number=3;number>0;number--){if(token!==generation.current)return;setCount(number);await pause(1000);}
        if(token!==generation.current)return;
        const video=source.current;if(!video||video.readyState<2||!video.videoWidth||document.hidden)throw new Error('interrupted');
        const photo=document.createElement('canvas');photo.width=PHOTO_WIDTH;photo.height=PHOTO_HEIGHT;const ctx=photo.getContext('2d')!;
        const w=Math.min(video.videoWidth,video.videoHeight*1.5),h=w/1.5;
        ctx.translate(PHOTO_WIDTH,0);ctx.scale(-1,1);ctx.drawImage(video,(video.videoWidth-w)/2,(video.videoHeight-h)/2,w,h,0,0,PHOTO_WIDTH,PHOTO_HEIGHT);
        photos.current.push(photo);setShots(photos.current.map(p=>p.toDataURL('image/jpeg',.92)));setCount(null);setFlash(true);
        await pause(140);if(token!==generation.current)return;setFlash(false);await pause(350);
      }
      if(token!==generation.current)return;stop();await print(token);
    }catch{if(token!==generation.current)return;stop();setCount(null);setFlash(false);setError('That session was interrupted. Let’s start again and capture all four moments.');setPhase('error');}
    finally{busy.current=false;}
  }
  async function print(token=generation.current){
    if(exporting)return;setExporting(true);setNotice('');
    try{
      const canvas=document.createElement('canvas');renderStrip(canvas,photos.current,frame,filter,svaArtwork);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('export')),'image/png'));
      if(token!==generation.current)return;
      file.current=new File([blob],`hi-there-${Date.now()}.png`,{type:'image/png'});
      if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setStrip(url.current);setPhase('printing');
    }catch{if(token!==generation.current)return;setPhase('error');setError('The strip couldn’t be prepared. Please try again.');}finally{setExporting(false);}
  }
  async function save(){
    if(!file.current||!strip||saving)return;setSaving(true);setNotice('');
    try{
      const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
      if(mobile&&navigator.canShare?.({files:[file.current]}))await navigator.share({files:[file.current]});
      else{const link=document.createElement('a');link.href=strip;link.download=file.current.name;link.click();setNotice('Your photo strip has been downloaded.');}
    }catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setNotice('Sharing couldn’t open. Try again, or touch and hold the strip to save it.');}finally{setSaving(false);}
  }
  const camera=['loading','ready','capturing','error'].includes(phase);
  return <main className={`app phase-${phase}`}>
    <video className="capture-source" ref={source} muted autoPlay playsInline aria-hidden="true" />
    {phase==='home'?<section className="entrance" aria-label="Photo booth entrance">
      <img className="entrance-photo" src="/booth-night.png" alt="Silver photo booth at night, illuminated by a HI THERE light box" />
      <h1 className="sr-only">HI THERE</h1>
      <button className="chrome-button enter-button" onClick={chooseFrame}>Take a Photo <span aria-hidden="true">↗</span></button>
    </section>:<>
      <header className="app-header"><button onClick={home} className="wordmark" aria-label="HI THERE home">HI THERE<span>®</span></button><span className="step-label">{camera?'02 / IN THE BOOTH':phase==='editor'?'01 / CHOOSE YOUR FRAME':phase==='printing'?'03 / PRINTING':'04 / KEEP THE MOMENT'}</span></header>
      {camera&&<section className="camera-page">
        <div className="page-heading"><span className="eyebrow">FOUR LITTLE MOMENTS</span><h1>{phase==='capturing'?'A new frame. A new you.':'Make yourself a memory.'}</h1></div>
        <div className={`live-strip live-strip-${frame}`} style={frame!=='silver'?{background:frames.find(f=>f.id===frame)?.color}:undefined}>{[0,1,2,3].map(i=><LiveFrame key={i} index={i} stream={media} photo={shots[i]} active={phase==='capturing'&&i===shots.length} count={count} artwork={frame==='sva'?svaArtwork:null}/>)}{frame==='sva'&&<div className="sva-live-footer"><img src="/sva-greenscreen.png" alt="YOU FAIL 0% — School of Visual Arts"/></div>}</div>
        {(phase==='loading'||phase==='error')&&<div className="camera-message" role="status"><p>{phase==='loading'?'Allow camera access to step into the booth.':error}</p>{phase==='error'&&<button className="small-button" onClick={()=>void start()}>Try camera again</button>}</div>}
        <div className="capture-controls"><p aria-live="polite">{phase==='capturing'?`PHOTO ${Math.min(shots.length+1,4)} OF 4 · ${count??'CAPTURED'}`:'4 PHOTOS · 3 SECOND COUNTDOWN EACH'}</p><button className={`shutter ${phase==='capturing'?'running':''}`} disabled={phase!=='ready'} onClick={()=>void capture()} aria-label="Take four photos"><span/></button><span className="fine-print">{phase==='capturing'?'Hold the moment. Then change your pose.':'All four frames are live. Tap to begin.'}</span></div>
      </section>}
      {phase==='editor'&&<section className="editor-page"><div className="page-heading"><span className="eyebrow">BEFORE YOU STEP INSIDE</span><h1>Make it yours.</h1></div><div className="editor-layout"><div className="preview-stage"><canvas ref={preview} className="strip-preview" aria-label={`${frame} frame preview with four camera spaces`}/></div><div className="options-panel"><fieldset><legend>01 <span>Choose a frame</span></legend><div className="frame-options">{frames.filter(f=>f.id!=='sva'||(svaAvailable&&svaArtwork)).map(f=><button key={f.id} aria-pressed={frame===f.id} className={`frame-choice ${frame===f.id?'selected':''}`} onClick={()=>setFrame(f.id)}><span className={`swatch swatch-${f.id}`} style={{backgroundColor:f.color,color:f.ink}}>{['ocean','halloween','christmas','newyear','sva'].includes(f.id)?({ocean:'≈',halloween:'☾',christmas:'❄',newyear:'✧',sva:'SVA'} as Record<string,string>)[f.id]:''}</span><span>{f.name}</span></button>)}</div>{frame==='sva'&&<p className="edition-note">SVA limited edition · available through Dec 31, 2026.</p>}</fieldset><fieldset><legend>02 <span>Set the mood</span></legend><div className="filter-options">{filters.map(f=><button key={f} aria-pressed={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></fieldset><button className="chrome-button print-button" onClick={()=>void start()}>Continue to camera <span aria-hidden="true">↗</span></button><p className="fine-print">Choose your look, then take four photos. Printing starts automatically.</p><p className="notice" role="status">{notice}</p></div></div></section>}
      {phase==='printing'&&<section className="printing-page"><div className="page-heading"><span className="eyebrow">A KEEPSAKE IN THE MAKING</span><h1>Good things take a moment.</h1></div><div className="printer"><div className="printer-plaque"><i/><i/><i/><i/><strong>PHOTOS<br/>DELIVERED HERE</strong><small>HI THERE / KEEP THE MEMORY</small></div><div className="printer-body"><i/><i/><div className="printer-slot"/><div className="paper-window">{strip&&<img src={strip} alt="Your photo strip emerging from the printer" className="emerging-strip"/>}</div><div className="printer-lip"/></div></div><p className="printing-status" role="status">PRINTING YOUR MOMENTS<span>...</span></p></section>}
      {phase==='done'&&<section className="finished-page"><div className="page-heading"><span className="eyebrow">FRESH FROM THE BOOTH</span><h1>A little piece of right now.</h1></div>{strip&&<img src={strip} className="finished-strip" alt="Your finished four-photo strip"/>}<div className="finished-actions"><button className="chrome-button" onClick={()=>void save()} disabled={saving}>{saving?'Opening…':'Save photo'} <span aria-hidden="true">↓</span></button><button className="text-button" onClick={chooseFrame}>Take another one ↗</button><p className="fine-print" role="status">{notice||'On iPhone, choose “Save Image” in the share sheet.'}</p></div></section>}
    </>}
    <div className={`flash ${flash?'active':''}`} aria-hidden="true"/>
  </main>;
}
