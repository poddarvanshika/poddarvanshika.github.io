(() => {
 const stack=document.querySelector('.photo-stack'), photos=[...stack.querySelectorAll('img')], dots=[...document.querySelectorAll('[data-slide]')], status=document.querySelector('#photo-status');
 let current=0;
 function show(index){current=(index+5)%5;photos.forEach((photo,i)=>{const depth=(i-current+5)%5;photo.style.zIndex=5-depth;photo.style.setProperty('--rotation',[2,-3,4,-2,1][depth]+'deg');photo.style.setProperty('--x',[0,-7,5,-3,2][depth]+'px');photo.style.setProperty('--y',(-depth*3)+'px');photo.style.setProperty('--scale',1-depth*.012);photo.setAttribute('aria-hidden',String(depth!==0));});dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===current)));status.textContent=`Photograph ${current+1} of 5`;}
 stack.addEventListener('click',()=>show(current+1));stack.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));}if(e.key==='Home'){e.preventDefault();show(0);}if(e.key==='End'){e.preventDefault();show(4);}});dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));show(0);
 const toggle=document.querySelector('#theme-toggle');function theme(){const dark=window.portfolioTheme.get()==='dark';toggle.setAttribute('aria-checked',String(dark));toggle.title=dark?'Switch to light mode':'Switch to dark mode';schedule();}toggle.addEventListener('click',()=>window.portfolioTheme.set(window.portfolioTheme.get()==='dark'?'light':'dark'));
 const canvas=document.querySelector('#about-artwork'),ctx=canvas.getContext('2d'),steps=[...document.querySelectorAll('.story-step')],section=document.querySelector('.beyond'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const SIZE=300,VIEW=450,OFFSET=(VIEW-SIZE)/2,CELL=3,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},lerp=(a,b,t)=>a+(b-a)*t;
 canvas.width=canvas.height=VIEW*2;ctx.scale(2,2);
 let forms=[],frame=0;
 function fitToggle(){
  const word=document.querySelector('#hello-word'),last=word.getBoundingClientRect(),hr=document.querySelector('.intro-title').getBoundingClientRect(),style=getComputedStyle(word),c=document.createElement('canvas').getContext('2d');
  c.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const m=c.measureText('s'),ascent=m.actualBoundingBoxAscent,descent=m.actualBoundingBoxDescent,fontAscent=m.fontBoundingBoxAscent||parseFloat(style.fontSize)*.8,fontDescent=m.fontBoundingBoxDescent||parseFloat(style.fontSize)*.2,glyphHeight=ascent+descent,height=Math.max(34,glyphHeight);
  toggle.style.setProperty('--switch-height',height+'px');toggle.style.left=(last.right-hr.left+16)+'px';toggle.style.top=(last.top-hr.top+(last.height-fontAscent-fontDescent)/2+fontAscent-ascent-(height-glyphHeight)/2)+'px';
 }
 fitToggle();document.fonts.ready.then(()=>{fitToggle();schedule();});
 // The supplied patterns define the occupied cells. Only cells are painted to the visible canvas.
 // Keep the flower dot, tennis ball, and yoga head in a separate, persistent correspondence group.
 async function samplePattern(name,landmark){
  const source=new Image();source.src=`assets/about/${name}-pattern.png`;await source.decode();
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
  const scale=lerp(from===0?1:1.5,to===0?1:1.5,t);
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
  const mobile=innerWidth<=700,art=canvas.getBoundingClientRect(),bounds=section.getBoundingClientRect(),anchor=art.top+art.height/2;
  const centers=steps.map(step=>{const r=step.getBoundingClientRect();return r.top+r.height/2;});
  let progress=0;for(let i=0;i<centers.length-1;i++)if(anchor>=centers[i])progress=i+clamp((anchor-centers[i])/(centers[i+1]-centers[i]));if(anchor>=centers[steps.length-1])progress=steps.length-1;
  const occupied=paint(progress),artBottom=art.top+occupied.bottom/VIEW*art.height;
  const baseSize=art.width/1.5,formWidth=baseSize*occupied.scale;
  const pinTop=innerHeight*(mobile?.25:.5)-baseSize/2,pinned=bounds.top<=pinTop+.5;
  steps.forEach((step,i)=>{
   const copy=step.querySelector('.story-copy'),r=step.getBoundingClientRect(),gap=r.top-artBottom;
   const travel=clamp((20-gap)/100);
   let move=pinned?(mobile?smooth((20-gap)/20):travel*(2-travel)):0;if(reduced.matches&&move>0)move=1;
   const full=Math.min(580,bounds.width),side=Math.max(100,(bounds.width-formWidth)/2-24),width=mobile?full:lerp(full,Math.min(full,side),move);
   copy.style.width=width+'px';copy.style.setProperty('--shift',((i%2?1:-1)*(mobile?12:(formWidth/2+24+width/2))*move)+'px');
   // On narrow screens the narrative stays readable below the artwork instead of becoming thin columns.
   copy.style.opacity=mobile?1-move:1;
   step.dataset.clearance=gap.toFixed(2);step.dataset.yield=move.toFixed(3);
  });
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{fitToggle();schedule();});window.addEventListener('portfolio-theme-change',theme);reduced.addEventListener('change',schedule);theme();
})();
