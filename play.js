(() => {
  const base='assets/explorations/';
  // Order follows the gallery's right-to-left scroll progression.
  const projects=[
    {title:'Rhythm Based Combat Game',description:'Hit the pedals perfectly on the music beat to win the fight',type:'video',src:'tangible-interaction.mp4',poster:'tangible-poster.jpg',ratio:368/416},
    {title:'VR Educational environment',description:'Step into the worlds of endangered and extinct animals',type:'video',src:'elephant-vr.mp4',poster:'elephant-poster.jpg',ratio:1280/720},
    {title:'Antara, Board Game',description:'A strategy game where winning means letting go',type:'image',src:'antara-board-game.png',ratio:1451/1834,alt:'People playing Antara around a colorful geometric board'},
    {title:'Book Cover Animation',description:'Made using After Effects',type:'image',src:'social-media-reel.png',ratio:1905/1618,alt:'Great Eastern Hotel cover animation shown in an Instagram post'},
    {title:'The art of presentation',description:'Hand painted outfit I wore for Miss Teen Diva 2021 National Costume Round',type:'image',src:'miss-teen-diva.png',ratio:1180/1004,alt:'Hand-painted motifs and the finished outfit on the runway'},
    {title:'Daze.yo, creative venture',description:'A small business exploring metal-wire jewellery with 4x returns',type:'image',src:'daisy-o.png',ratio:880/800,alt:'Metal-wire jewellery displayed at the Daze.yo stall'}
  ];
  const track=document.querySelector('.exploration-track'),stage=document.querySelector('.exploration-stage'),gallery=document.querySelector('.panorama'),world=document.querySelector('.panorama-world');
  const title=document.querySelector('#project-title'),description=document.querySelector('#project-description');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  let frame=0,active=-1,position=0,manualIndex=0,galleryVisible=false;
  const videos=[];
  function makeMedia(project){
    const media=document.createElement(project.type==='video'?'video':'img');
    media.src=base+project.src;
    if(project.type==='video'){
      media.poster=base+project.poster;media.muted=true;media.playsInline=true;media.loop=true;media.controls=false;media.preload='metadata';
      media.setAttribute('aria-label',project.title+' video');
    }else{media.alt=project.alt;media.decoding='async';}
    return media;
  }
  const cards=projects.map((project,i)=>{
    const card=document.createElement('button');card.type='button';card.className='panorama-card';card.tabIndex=-1;
    card.setAttribute('aria-label',`Select ${project.title}`);
    const media=makeMedia(project);media.className='project-media';card.append(media);videos[i]=project.type==='video'?media:null;
    card.addEventListener('click',()=>goTo(i));world.append(card);
    return card;
  });
  function syncPlayback(){
    videos.forEach((video,i)=>{
      if(!video)return;
      if(i===active&&galleryVisible&&!document.hidden&&!reduced.matches){video.play().catch(()=>{});}else video.pause();
    });
  }
  function select(index){
    if(index===active)return;active=index;
    title.textContent=projects[index].title;description.textContent=projects[index].description;
    cards.forEach((card,i)=>{card.dataset.active=String(i===index);card.setAttribute('aria-pressed',String(i===index));card.tabIndex=i===index?0:-1;});
    stage.dataset.activeProject=String(index+1);syncPlayback();
  }
  function render(){
    frame=0;
    const travel=Math.max(1,track.offsetHeight-stage.offsetHeight);
    position=reduced.matches?manualIndex:clamp(-track.getBoundingClientRect().top/travel,0,1)*(projects.length-1);
    const w=gallery.clientWidth,h=gallery.clientHeight,maxHeight=Math.min(h*.88,w<=700?280:360),gap=2*Math.max(28,w*.022);
    const sizes=projects.map(project=>{const width=Math.min(maxHeight*project.ratio,w*.82);return {width,height:width/project.ratio};});
    // Use each medium's actual width to preserve spacing along the horizontal gallery.
    const centers=[0];
    for(let i=1;i<cards.length;i++)centers[i]=centers[i-1]+(sizes[i-1].width+sizes[i].width)/2+gap;
    const circumference=centers.at(-1)+(sizes.at(-1).width+sizes[0].width)/2+gap;
    const segment=Math.min(cards.length-2,Math.floor(position)),fraction=position-segment;
    const distance=centers[segment]+(centers[segment+1]-centers[segment])*fraction;
    let nearest=0,nearestDistance=Infinity;
    cards.forEach((card,i)=>{
      const offset=((centers[i]-distance+circumference*1.5)%circumference)-circumference/2;
      const proximity=clamp(1-Math.abs(offset)/Math.max(1,sizes[i].width+gap),0,1);
      const scale=.82+.18*(proximity*proximity*(3-2*proximity));
      card.style.width=sizes[i].width+'px';card.style.height=sizes[i].height+'px';
      card.style.transform=`translate(-50%,-50%) translateX(${offset}px) scale(${scale})`;
      card.style.zIndex=String(20-Math.round(Math.abs(offset)/100));
      const hidden=Math.abs(offset)-sizes[i].width/2>w/2;
      card.style.visibility=hidden?'hidden':'visible';
      card.setAttribute('aria-hidden',String(hidden));
      if(Math.abs(offset)<nearestDistance){nearest=i;nearestDistance=Math.abs(offset);}
    });
    select(nearest);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(render);}
  function goTo(index){
    manualIndex=clamp(index,0,projects.length-1);
    if(reduced.matches){render();return;}
    const top=scrollY+track.getBoundingClientRect().top;
    window.scrollTo({top:top+manualIndex/(projects.length-1)*(track.offsetHeight-stage.offsetHeight),behavior:'smooth'});
  }
  gallery.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const index=event.key==='Home'?0:event.key==='End'?projects.length-1:clamp(active+(event.key==='ArrowRight'?1:-1),0,projects.length-1);
    goTo(index);gallery.focus({preventScroll:true});
  });
  new IntersectionObserver(entries=>{galleryVisible=entries[0].isIntersecting;syncPlayback();},{threshold:.15}).observe(gallery);
  document.addEventListener('visibilitychange',syncPlayback);
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('pageshow',event=>{if(!event.persisted&&!location.hash)window.scrollTo({top:0,behavior:'instant'});schedule();});
  reduced.addEventListener('change',()=>{manualIndex=Math.max(0,active);schedule();syncPlayback();});
  new ResizeObserver(schedule).observe(gallery);document.fonts.ready.then(schedule);render();
})();
