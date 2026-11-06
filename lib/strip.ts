export const SVA_END = '2027-01-01T05:00:00Z'; // Midnight after Dec 31, 2026, New York.
export const frames = [
  { id: 'silver', name: 'Silver', color: '#c4c6c8', ink: '#27292b' },
  { id: 'black', name: 'Black', color: '#141414', ink: '#ffffff' },
  { id: 'white', name: 'White', color: '#ffffff', ink: '#171717' },
  { id: 'blue', name: 'Blue', color: '#204cc9', ink: '#ffffff' },
  { id: 'red', name: 'Red', color: '#c82230', ink: '#ffffff' },
  { id: 'orange', name: 'Orange', color: '#ef7135', ink: '#28170c' },
  { id: 'ocean', name: 'Ocean', color: '#114e69', ink: '#d6f7ff' },
  { id: 'halloween', name: 'Halloween', color: '#21162c', ink: '#ff9948' },
  { id: 'christmas', name: 'Christmas', color: '#173c2f', ink: '#f6e9c8' },
  { id: 'newyear', name: 'New Year', color: '#13151c', ink: '#dfc985' },
  { id: 'sva', name: 'SVA · limited', color: '#d7352b', ink: '#ffffff' },
] as const;
export type Frame = typeof frames[number]['id'];
export const filters = ['Original', 'Faded', 'Fuji film', 'Neon', 'Pixel', 'Mono'] as const;
export type Filter = typeof filters[number];
export const STRIP_WIDTH = 840, PHOTO_WIDTH = 744, PHOTO_HEIGHT = 496;
export const STRIP_HEIGHT = 2264;

// Positions in the supplied 432 × 1156 SVA artwork. Only these green windows are keyed.
export const SVA_WINDOWS = [40, 289, 537, 786].map(y => ({ x: 29, y, width: 372, height: 220 }));

export function prepareSvaArtwork(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (const window of SVA_WINDOWS) {
    for (let y=window.y; y<window.y+window.height; y++) {
      for (let x=window.x; x<window.x+window.width; x++) {
        const i=(y*canvas.width+x)*4;
        const r=pixels.data[i], g=pixels.data[i+1], b=pixels.data[i+2];
        const greenExcess=g-Math.max(r,b);
        if (greenExcess>35 && g>90) {
          const removal=Math.min(1,(greenExcess-35)/65);
          pixels.data[i+3]=Math.round(255*(1-removal));
          // Remove green edge spill without altering opaque portraits or the footer.
          pixels.data[i+1]=Math.round(g-(g-Math.max(r,b))*removal);
        }
      }
    }
  }
  ctx.putImageData(pixels,0,0);
  return canvas;
}

export function filteredPhoto(source: HTMLCanvasElement, filter: Filter) {
  const canvas = document.createElement('canvas'); canvas.width = PHOTO_WIDTH; canvas.height = PHOTO_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  if (filter === 'Pixel') {
    const small = document.createElement('canvas'); small.width = 93; small.height = 62;
    small.getContext('2d')!.drawImage(source, 0, 0, 93, 62);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
  } else ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (filter === 'Original' || filter === 'Pixel') return canvas;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
    const l=.299*r+.587*g+.114*b;
    if (filter === 'Mono') { const v=(l-128)*1.12+128; pixels.data[i]=v; pixels.data[i+1]=v; pixels.data[i+2]=v; }
    if (filter === 'Faded') { pixels.data[i]=r*.73+49; pixels.data[i+1]=g*.72+45; pixels.data[i+2]=b*.68+48; }
    if (filter === 'Fuji film') { pixels.data[i]=(r-128)*1.09+134; pixels.data[i+1]=(g-128)*1.04+134; pixels.data[i+2]=(b-128)*.92+118; }
    if (filter === 'Neon') { pixels.data[i]=(r-l)*1.6+l+18; pixels.data[i+1]=(g-l)*1.5+l-12; pixels.data[i+2]=(b-l)*1.7+l+30; }
  }
  ctx.putImageData(pixels,0,0); return canvas;
}

export function renderStrip(canvas: HTMLCanvasElement, photos: HTMLCanvasElement[], frame: Frame, filter: Filter, svaArtwork?: HTMLCanvasElement | null) {
  canvas.width=STRIP_WIDTH; canvas.height=STRIP_HEIGHT;
  const ctx=canvas.getContext('2d')!;
  const theme=frames.find(f=>f.id===frame)!;
  ctx.fillStyle=theme.color; ctx.fillRect(0,0,canvas.width,canvas.height);
  if (frame==='silver') {
    const gradient=ctx.createLinearGradient(0,0,canvas.width,100);
    gradient.addColorStop(0,'#a8aaad'); gradient.addColorStop(.35,'#f0f0f1'); gradient.addColorStop(.65,'#b9bbbd'); gradient.addColorStop(1,'#dddfe0');
    ctx.fillStyle=gradient; ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  ctx.strokeStyle=theme.ink; ctx.fillStyle=theme.ink;
  if (frame==='ocean') {
    ctx.globalAlpha=.45; ctx.lineWidth=3;
    for(let y=10;y<canvas.height;y+=32){ctx.beginPath();for(let x=0;x<=canvas.width;x+=8){const py=y+Math.sin(x/28+y/60)*9; if(x===0)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();}ctx.globalAlpha=1;
  }
  if (frame==='halloween'||frame==='christmas'||frame==='newyear') {
    for(let y=25;y<canvas.height;y+=86) for(const x of [23,817]){
      ctx.save();ctx.translate(x,y);
      if(frame==='halloween'){ctx.fillStyle='#ff9948';ctx.beginPath();ctx.ellipse(0,0,13,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#21162c';ctx.fillRect(-7,-3,4,4);ctx.fillRect(3,-3,4,4);ctx.fillRect(-4,4,8,2);}
      if(frame==='christmas'){ctx.strokeStyle='#f6e9c8';ctx.lineWidth=2;for(let a=0;a<3;a++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();}}
      if(frame==='newyear'){ctx.fillStyle='#dfc985';ctx.beginPath();for(let p=0;p<8;p++){let a=p*Math.PI/4;let r=p%2?3:12;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}
      ctx.restore();
    }
  }
  for (let index=0;index<4;index++) {
    const x=frame==='sva'?29/432*STRIP_WIDTH:48;
    const y=frame==='sva'?SVA_WINDOWS[index].y/1156*STRIP_HEIGHT:48+index*520;
    const w=frame==='sva'?372/432*STRIP_WIDTH:PHOTO_WIDTH;
    const h=frame==='sva'?220/1156*STRIP_HEIGHT:PHOTO_HEIGHT;
    if (photos[index]) {
      const photo=filteredPhoto(photos[index],filter);
      const cropHeight=photo.width*h/w;
      ctx.drawImage(photo,0,(photo.height-cropHeight)/2,photo.width,cropHeight,x,y,w,h);
    } else {
      const placeholder=ctx.createLinearGradient(x,y,x+w,y+h);
      placeholder.addColorStop(0,'#b6b9bd');placeholder.addColorStop(1,'#e5e6e8');
      ctx.fillStyle=placeholder;ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#73777c';ctx.textAlign='center';ctx.font='24px sans-serif';
      ctx.fillText(`YOUR PHOTO 0${index+1}`,x+w/2,y+h/2);
    }
  }
  if(frame==='sva') {
    if (!svaArtwork) throw new Error('SVA artwork has not loaded');
    // Camera photos sit underneath the fixed people, border, lettering, and seal.
    ctx.drawImage(svaArtwork,0,0,STRIP_WIDTH,STRIP_HEIGHT);
    return;
  }
  ctx.fillStyle=theme.ink; ctx.textAlign='center';ctx.font='500 30px sans-serif';
  const title=frame==='ocean'?'SOMEWHERE BY THE SEA':frame==='halloween'?'AFTER DARK':frame==='christmas'?'MERRY & BRIGHT':frame==='newyear'?'HERE’S TO WHAT’S NEXT':'HI THERE';
  ctx.fillText(title,420,2185);
  ctx.font='16px sans-serif';ctx.globalAlpha=.8;
  ctx.fillText('FOUR MOMENTS. ONE MEMORY.',420,2222);ctx.globalAlpha=1;
}
