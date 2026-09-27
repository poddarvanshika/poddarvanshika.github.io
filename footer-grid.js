(() => {
  const footer = document.querySelector('footer');
  const canvas = footer.querySelector('.footer-hover-grid');
  const ctx = canvas.getContext('2d');
  let cells = [], width = 0, height = 0, pointer = null, previous = null, frame = 0;
  function hash(x,y) { const n = Math.sin(x*127.1+y*311.7)*43758.5453; return n-Math.floor(n); }
  function noise(x,y) {
    const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;
    u=u*u*(3-2*u);v=v*v*(3-2*v);
    return hash(a,b)*(1-u)*(1-v)+hash(a+1,b)*u*(1-v)+hash(a,b+1)*(1-u)*v+hash(a+1,b+1)*u*v;
  }
  const smooth = t => t*t*t*(t*(t*6-15)+10);
  function resize() {
    width=footer.clientWidth;height=footer.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);cells=[];
    for(let y=.5;y+4.5<height;y+=5) for(let x=.5;x+4.5<width;x+=5) {
      const n=noise(x/150+7,y/170),d=noise(x/65,y/75+8),hue=180+Math.max(0,Math.min(1,(n-.24)/.52))*105;
      cells.push({x,y,dark:'hsl('+hue+' '+(48+d*22)+'% '+(29+d*34)+'%)',light:'hsl('+Math.min(hue,265)+' '+(48+d*22)+'% '+((29+d*34)*1.1)+'%)',texture:.48+d*.48,boundary:Math.min(1,y/24,(height-y)/24),peak:0,seen:-10000});
    }
    previous=null;
  }
  function distance(x,y,a,b) {
    const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):1;
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  }
  function draw(now) {
    ctx.clearRect(0,0,width,height);
    const rect=footer.getBoundingClientRect();
    const current=pointer&&pointer.x>=rect.left&&pointer.x<=rect.right&&pointer.y>=rect.top&&pointer.y<=rect.bottom?{x:pointer.x-rect.left,y:pointer.y-rect.top}:null;
    const dark=document.documentElement.dataset.theme==='dark';
    let remaining=false;
    for(const p of cells) {
      const d=current?distance(p.x+2.25,p.y+2.25,previous||current,current):Infinity;
      const strength=d<200?smooth(1-d/200)*p.texture*p.boundary:0;
      const residual=p.peak*(1-smooth(Math.max(0,Math.min(1,(now-p.seen-200)/200))));
      if(strength>=residual&&strength>0){p.peak=strength;p.seen=now;}
      const alpha=Math.max(strength,residual);
      if(alpha<.0001)continue;
      remaining=true;ctx.globalAlpha=alpha*.64;ctx.fillStyle=dark?p.dark:p.light;
      ctx.beginPath();ctx.roundRect(p.x,p.y,4.5,4.5,1.35);ctx.fill();
    }
    ctx.globalAlpha=1;previous=current;
    frame=!document.hidden&&(current||remaining)?requestAnimationFrame(draw):0;
  }
  function start(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
  window.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};start();},{passive:true});
  window.addEventListener('scroll',()=>{previous=null;start();},{passive:true});
  window.addEventListener('blur',()=>{pointer=null;start();});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){pointer=null;start();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;pointer=null;}else start();});
  window.addEventListener('portfolio-theme-change',start);
  new ResizeObserver(()=>{resize();start();}).observe(footer);
  resize();
})();
