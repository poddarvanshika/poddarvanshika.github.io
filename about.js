(() => {
 function theme(){schedule();}
 const canvas=document.querySelector('#about-artwork'),ctx=canvas.getContext('2d'),steps=[...document.querySelectorAll('.story-step')],section=document.querySelector('.beyond'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const SIZE=300,VIEW=600,OFFSET=(VIEW-SIZE)/2,CELL=3,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},lerp=(a,b,t)=>a+(b-a)*t;
 canvas.width=canvas.height=VIEW*2;ctx.scale(2,2);
 let forms=[],frame=0;
 document.fonts.ready.then(schedule);
 // The supplied patterns define the occupied cells. Only cells are painted to the visible canvas.
 // Keep the flower dot, tennis ball, and yoga head in a separate, persistent correspondence group.
 async function samplePattern(name,landmark){
  const source=new Image();source.src=window.aboutPatternSources[name];await source.decode();
  const off=document.createElement('canvas');off.width=off.height=SIZE;const c=off.getContext('2d',{willReadFrequently:true});
  const scale=262/Math.max(source.naturalWidth,source.naturalHeight),dx=(SIZE-source.naturalWidth*scale)/2,dy=(SIZE-source.naturalHeight*scale)/2;
  c.drawImage(source,dx,dy,source.naturalWidth*scale,source.naturalHeight*scale);
  const pixels=c.getImageData(0,0,SIZE,SIZE).data,cloud=[],feature=[],anchor={x:dx+landmark[0]*scale,y:dy+landmark[1]*scale,r:landmark[2]*scale};
  for(let y=0;y<SIZE;y+=CELL)for(let x=0;x<SIZE;x+=CELL){
   let opacity=0,r=0,g=0,b=0;
   for(let yy=0;yy<CELL;yy++)for(let xx=0;xx<CELL;xx++){
    const k=((y+yy)*SIZE+x+xx)*4,brightness=Math.max(pixels[k],pixels[k+1],pixels[k+2]);
    const a=pixels[k+3]/255*(brightness>24?1:0);opacity+=a;r+=pixels[k]*a;g+=pixels[k+1]*a;b+=pixels[k+2]*a;
   }
   if(opacity<.18)continue;
   const p={x:x+CELL/2,y:y+CELL/2,r:r/opacity,g:g/opacity,b:b/opacity,a:Math.min(1,opacity/(CELL*CELL)*1.5)};
   (Math.hypot(p.x-anchor.x,p.y-anchor.y)<anchor.r+CELL/2?feature:cloud).push(p);
  }
  return {cloud,feature,anchor};
 }
 // Balanced spatial ordering gives nearby cells nearby destinations without random scattering.
 function spatialOrder(points,depth=0){
  if(points.length<2)return points;
  const axis=depth%2?'y':'x',sorted=points.slice().sort((a,b)=>a[axis]-b[axis]),half=Math.floor(sorted.length/2);
  return [...spatialOrder(sorted.slice(0,half),depth+1),...spatialOrder(sorted.slice(half),depth+1)];
 }
 function equalize(points,count){
  const sorted=spatialOrder(points),uses=Array(sorted.length).fill(0),indices=Array.from({length:count},(_,i)=>Math.floor(i*sorted.length/count));
  indices.forEach(i=>uses[i]++);
  return indices.map(i=>({...sorted[i],a:1-Math.pow(1-sorted[i].a,1/uses[i])}));
 }
 Promise.all([samplePattern('flower',[103,154,9]),samplePattern('tennis',[50,40,7]),samplePattern('yoga',[82,89,11])]).then(samples=>{
  const cloudCount=Math.max(...samples.map(s=>s.cloud.length)),featureCount=Math.max(...samples.map(s=>s.feature.length));
  forms=samples.map(s=>({points:[...equalize(s.cloud,cloudCount),...equalize(s.feature,featureCount)],anchor:s.anchor}));
  canvas.dataset.cells=String(cloudCount+featureCount);schedule();
 }).catch(error=>{canvas.setAttribute('aria-label','Artwork could not load');console.error('About artwork:',error);});
 function stateAt(progress){
  if(progress<1.05)return [0,0,0];
  if(progress<1.95)return [0,1,smooth((progress-1.05)/.9)];
  if(progress<2.65)return [1,1,0];
  if(progress<3.85)return [1,2,smooth((progress-2.65)/1.2)];
  return [2,2,0];
 }
 function paint(progress){
  if(!forms.length)return {top:OFFSET,bottom:SIZE+OFFSET,scale:1};
  let [from,to,t]=stateAt(progress);if(reduced.matches){from=to=t<.5?from:to;t=0;}
  const dark=document.documentElement.dataset.theme==='dark',source=forms[from],target=forms[to],gather=Math.sin(Math.PI*t)*.09;
  const cssHeight=canvas.getBoundingClientRect().height;
  const formScale=index=>{
   if(index===0)return .75;
   const visible=forms[index].points.filter(p=>p.a>=.015);
   const ys=visible.map(p=>p.y);
   const height=Math.max(...ys)-Math.min(...ys)+CELL*.9;
   return 120*VIEW/(cssHeight*height);
  };
  const scale=lerp(formScale(from),formScale(to),t);
  ctx.clearRect(0,0,VIEW,VIEW);let top=VIEW,bottom=0;
  source.points.forEach((p,i)=>{
   const q=target.points[i];
   let x=lerp(p.x,q.x,t),y=lerp(p.y,q.y,t);
   // A gentle inward pull brings the grid together while preserving individual cell identity.
   x=VIEW/2+(lerp(x,150,gather)-SIZE/2)*scale;y=VIEW/2+(lerp(y,150,gather*.5)-SIZE/2)*scale;
   const a=lerp(p.a,q.a,t);if(a<.015)return;
   const shade=dark?1.12:.74;ctx.globalAlpha=a*(dark?.96:.88);ctx.fillStyle=`rgb(${lerp(p.r,q.r,t)*shade} ${lerp(p.g,q.g,t)*shade} ${lerp(p.b,q.b,t)*shade})`;
   const cell=CELL*scale;ctx.beginPath();ctx.roundRect(x-cell*.45,y-cell*.45,cell*.9,cell*.9,cell*.27);ctx.fill();top=Math.min(top,y-cell*.45);bottom=Math.max(bottom,y+cell*.45);
  });ctx.globalAlpha=1;
  canvas.dataset.state=from===to?['flower','tennis','yoga'][from]:`${['flower','tennis','yoga'][from]}-to-${['flower','tennis','yoga'][to]}`;
  canvas.dataset.progress=progress.toFixed(3);canvas.dataset.morph=t.toFixed(3);
  canvas.dataset.scale=scale.toFixed(3);
  return {top,bottom,scale};
 }
 function render(){
  frame=0;
  const mobile=innerWidth<=700, pin=canvas.parentElement;
  if(forms.length){
   const lotusBottom=Math.max(...forms[0].points.filter(p=>p.a>=.015).map(p=>VIEW/2+(p.y-SIZE/2)*.75+CELL*.75*.45));
   const pinHeight=pin.offsetHeight,canvasHeight=pinHeight*2;
   const labelTop=-pinHeight*.5+lotusBottom/VIEW*canvasHeight+16;
   section.style.setProperty('--lotus-label-top',labelTop+'px');
  }
  const bounds=section.getBoundingClientRect();
  if(!mobile){
   const dockCenter=section.offsetHeight-100;
   const center=Math.min(dockCenter,Math.max(55,innerHeight*.5-bounds.top));
   // One pixel of document travel per pixel scrolled, through the final yoga pose.
   pin.style.transform=`translateY(${center-55}px)`;
  }else pin.style.transform='';
  const art=canvas.getBoundingClientRect(),anchor=art.top+art.height/2;
  const centers=steps.map(step=>{const r=step.getBoundingClientRect();return r.top+r.height/2;});
  let progress=0;
  for(let i=0;i<centers.length-1;i++)if(anchor>=centers[i])progress=i+clamp((anchor-centers[i])/(centers[i+1]-centers[i]));
  if(anchor>=centers.at(-1))progress=steps.length-1;
  // The added childhood row holds the lotus; the original morph timing follows it.
  const title=steps[0].querySelector('h2'),titleRange=document.createRange();
  titleRange.selectNodeContents(title);
  const guide=titleRange.getBoundingClientRect();
  // The lotus retains its introductory size throughout its travel.
  const occupied=paint(Math.max(0,progress-1));
  const artBottom=art.top+occupied.bottom/VIEW*art.height;
  const focusLine=mobile?innerHeight*.45:anchor;
  const nearest=Math.max(1,steps.reduce((best,step,i)=>{
   if(!i)return best;
   const r=step.getBoundingClientRect(),distance=Math.abs(r.top+step.querySelector('.story-copy').offsetHeight/2-focusLine);
   const bestRect=steps[best].getBoundingClientRect(),bestDistance=Math.abs(bestRect.top+steps[best].querySelector('.story-copy').offsetHeight/2-focusLine);
   return distance<bestDistance?i:best;
  },1));
  steps.forEach((step,i)=>{
   if(!i)return;
   const copy=step.querySelector('.story-copy'),photo=step.querySelector('.story-photo'),r=step.getBoundingClientRect();
   photo.style.setProperty('--photo-width',photo.offsetWidth+'px');
   const gap=r.top-artBottom;
   const t=reduced.matches||mobile?1:smooth((20-gap)/260);
   step.dataset.clearance=gap.toFixed(2);
   const side=i%2?1:-1;
   const width=mobile?bounds.width:Math.min(580,(bounds.width-guide.width)/2-16);
   copy.style.width=width+'px';
   // Measure the heading's ink, not the paragraph box, against the title's edges.
   const headingRange=document.createRange(),headingText=copy.querySelector('h2').firstChild;
   const edge=side>0?0:headingText.length-1;
   headingRange.setStart(headingText,edge);headingRange.setEnd(headingText,edge+1);
   const ink=headingRange.getBoundingClientRect(),box=copy.getBoundingClientRect();
   const center=bounds.left+bounds.width/2;
   const endX=side>0?guide.right-(center-width/2+ink.left-box.left):guide.left-(center-width/2+ink.right-box.left);
   // Keep the photo 16px from the visible text, rather than its wider layout box.
   const textRects=[...copy.querySelectorAll('h2,p')].map(el=>{
    const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect();
   });
   const textEdge=side>0?Math.max(...textRects.map(rect=>rect.right)):Math.min(...textRects.map(rect=>rect.left));
   const startX=textEdge-box.left-width/2+side*(16+photo.offsetWidth/2);
   copy.style.transform=`translateX(${mobile?0:endX*t}px)`;
   const photoX=mobile?0:lerp(startX,endX,t);
   const distance=Math.abs(r.top+copy.offsetHeight/2-focusLine);
   const emphasis=i===nearest?1:.62+.38*(1-smooth(distance/340));
   copy.style.opacity=String(reduced.matches?1:emphasis);
   step.dataset.active=String(i===nearest);
   const endY=copy.offsetHeight+16;
   const startY=(copy.offsetHeight-photo.offsetHeight)/2;
   photo.style.transform=`translate(${photoX}px,${lerp(startY,endY,t)}px)`;
   step.dataset.yield=t.toFixed(3);
  });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('load',schedule);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{schedule();});window.addEventListener('portfolio-theme-change',theme);reduced.addEventListener('change',schedule);theme();
})();
