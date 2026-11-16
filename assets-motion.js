(() => {
 'use strict';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover: hover) and (pointer: fine)');
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let replay=()=>{};
 const cloneOf=source=>{const c=source.cloneNode(true);[c,...c.querySelectorAll('*')].forEach(n=>{['id','aria-labelledby','aria-describedby','aria-label','data-name-word','data-cursor'].forEach(a=>n.removeAttribute(a));if(n.matches('button,a,[tabindex]'))n.tabIndex=-1;n.classList.remove('is-waiting');});c.setAttribute('aria-hidden','true');c.inert=true;return c;};
 function heroLens(stage){
  const glass=stage.querySelector('.magnifier .lens-glass'),world=glass.querySelector('.lens-world'),source=stage.querySelector('.hero-name'),copy=cloneOf(source);
  world.replaceChildren(copy);let alive=true,measured=0;
  function update(force=false){if(!alive)return;const a=stage.getBoundingClientRect(),t=source.getBoundingClientRect(),l=glass.getBoundingClientRect();
   if(force||measured!==a.width){measured=a.width;const s=getComputedStyle(source);world.style.width=a.width+'px';world.style.height=a.height+'px';copy.style.width=t.width+'px';['fontSize','lineHeight','letterSpacing'].forEach(k=>copy.style[k]=s[k]);}
   copy.style.left=t.left-a.left+'px';copy.style.top=t.top-a.top+'px';const x=l.left+l.width/2-a.left,y=l.top+l.height/2-a.top;
   world.style.transform=`translate3d(${glass.clientWidth/2-x*2}px,${glass.clientHeight/2-y*2}px,0) scale(2)`;
   const words=copy.querySelectorAll('.name-word');source.querySelectorAll('.name-word').forEach((n,i)=>words[i].style.maskImage=n.style.maskImage);
  }
  document.fonts.ready.then(()=>update(true));update(true);return{update,destroy(){alive=false;world.replaceChildren();}};
 }
 function mountHero(main){
  const hero=main.querySelector('.hero');if(!hero)return()=>{};
  const stage=hero.querySelector('.hero-stage'),controller=new AbortController(),opt={signal:controller.signal},animations=new Set(),particles=new Set(),timers=new Set(),active=new Set();let alive=true;
  const later=(f,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(alive)f();},ms);timers.add(id);};
  function animate(n,k,o){const a=n.animate(k,o);animations.add(a);a.finished.finally(()=>animations.delete(a)).catch(()=>{});return a;}
  hero.querySelectorAll('[data-aux]').forEach((n,i)=>n.style.setProperty('--aux-delay',i*65+'ms'));
  replay=()=>{hero.classList.remove('aux-ready');later(()=>hero.classList.add('aux-ready'),reduced.matches?0:90);};
  const enter=()=>later(()=>hero.classList.add('aux-ready'),reduced.matches?0:950);
  if(document.documentElement.classList.contains('intro-pending')){document.addEventListener('portfolio-enter',enter,{...opt,once:true});later(()=>hero.classList.add('aux-ready'),5600);}else enter();
  hero.querySelectorAll('[data-flip]').forEach(n=>{let busy=false;const flip=()=>{if(reduced.matches||busy)return;busy=true;animate(n,[{transform:'perspective(650px) rotateX(0)'},{transform:'perspective(650px) rotateX(175deg) translateZ(18px)',offset:.48},{transform:'perspective(650px) rotateX(360deg)'}],{duration:950,easing:'cubic-bezier(.4,0,.2,1)'}).finished.finally(()=>busy=false).catch(()=>{});};n.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')flip();},opt);n.closest('a,button')?.addEventListener('focus',flip,opt);});
  hero.querySelectorAll('[data-name-word]').forEach(word=>word.addEventListener('click',e=>{
   if(active.has(word))return;if(reduced.matches){animate(word,[{opacity:1},{opacity:.65},{opacity:1}],{duration:180});return;}
   const r=word.getBoundingClientRect(),sr=stage.getBoundingClientRect(),x=e.detail?clamp(e.clientX-r.left,0,r.width):r.width*.5,y=e.detail?clamp(e.clientY-r.top,0,r.height):r.height*.5,radius=clamp(r.height*.4,30,72),cell=radius<42?8:12,s=getComputedStyle(word),local=[],motions=[];
   active.add(word);word.style.maskImage=`radial-gradient(circle ${radius}px at ${x}px ${y}px,transparent 98%,#000 100%)`;
   for(let ty=Math.max(0,y-radius);ty<Math.min(r.height,y+radius);ty+=cell)for(let tx=Math.max(0,x-radius);tx<Math.min(r.width,x+radius);tx+=cell){
    if(Math.hypot(tx+cell/2-x,ty+cell/2-y)>radius+cell/2)continue;
    const f=document.createElement('span'),t=document.createElement('span');f.className='name-fragment';f.setAttribute('aria-hidden','true');Object.assign(f.style,{width:cell+'px',height:cell+'px',left:r.left-sr.left+tx+'px',top:r.top-sr.top+ty+'px'});t.className='name-fragment-text';t.textContent=word.textContent;
    ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','letterSpacing','lineHeight','color'].forEach(k=>t.style[k]=s[k]);Object.assign(t.style,{width:r.width+'px',height:r.height+'px',left:-tx+'px',top:-ty+'px',textAlign:'left',maskImage:`radial-gradient(circle ${radius}px at ${x}px ${y}px,#000 98%,transparent 100%)`});
    f.append(t);stage.append(f);local.push(f);particles.add(f);const angle=Math.atan2(ty+cell/2-y,tx+cell/2-x)+(Math.random()-.5)*.65,d=24+Math.random()*radius*1.25,dx=Math.cos(angle)*d,dy=Math.sin(angle)*d-15,turn=(Math.random()-.5)*130;
    motions.push(animate(f,[{transform:'translate(0,0) rotate(0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${turn}deg) scale(.8)`,opacity:.9,offset:.3},{transform:`translate(${dx*1.05}px,${dy-6}px) rotate(${turn*1.08}deg) scale(.85)`,opacity:.9,offset:.53},{transform:'translate(0,0) rotate(0) scale(1)',opacity:1}],{duration:1650,easing:'cubic-bezier(.2,.65,.25,1)',fill:'forwards'}));
   }
   Promise.allSettled(motions.map(a=>a.finished)).then(()=>{word.style.maskImage='';local.forEach(f=>{f.remove();particles.delete(f);});motions.forEach(a=>a.cancel());active.delete(word);});
  },opt));
  const toggle=hero.querySelector('[data-motion-toggle]');const sync=()=>{const paused=document.body.classList.contains('motion-paused');toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'움직임 재생':'움직임 멈춤';};sync();toggle.addEventListener('click',()=>{document.body.classList.toggle('motion-paused');sync();document.dispatchEvent(new Event('portfolio-motion-change'));},opt);
  const stopSculptures=window.PortfolioSculptures?.mount(stage)||(()=>{});
  return()=>{alive=false;controller.abort();timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());particles.forEach(n=>n.remove());active.forEach(n=>n.style.maskImage='');stopSculptures();replay=()=>{};};
 }
 function mountAbout(main){
  const about=main.querySelector('.about-section');if(!about)return()=>{};
  const controller=new AbortController(),opt={signal:controller.signal},lens=document.createElement('div');lens.className='about-lens';lens.setAttribute('aria-hidden','true');lens.inert=true;lens.innerHTML='<span class="lens-handle"></span><span class="lens-ring"></span><span class="lens-glass"><span class="lens-world"></span></span><span class="lens-tag">1.8×</span>';
  const world=lens.querySelector('.lens-world'),copy=cloneOf(about),symbol=about.querySelector('.about-symbol svg'),copySymbol=copy.querySelector('.about-symbol svg');world.append(copy);document.body.append(lens);let point=null,frame=0,disposed=false,width=0;
  function hide(){point=null;lens.classList.remove('is-active');document.body.classList.remove('is-magnifying');cancelAnimationFrame(frame);frame=0;}
  function draw(){frame=0;if(!point||disposed)return;const r=about.getBoundingClientRect(),size=lens.offsetWidth,g=lens.querySelector('.lens-glass'),x=clamp(point.x,size/2+6,innerWidth-size/2-6),y=clamp(point.y,size/2+6,innerHeight-size/2-6);if(width!==r.width){width=r.width;copy.style.width=r.width+'px';world.style.width=r.width+'px';world.style.height=r.height+'px';}lens.style.transform=`translate3d(${x-size/2}px,${y-size/2}px,0)`;world.style.transform=`translate3d(${g.clientWidth/2-(point.x-r.left)*1.8}px,${g.clientHeight/2-(point.y-r.top)*1.8}px,0) scale(1.8)`;copySymbol.style.transform=getComputedStyle(symbol).transform;frame=requestAnimationFrame(draw);}
  about.addEventListener('pointermove',e=>{if(!fine.matches||e.pointerType==='touch'||innerWidth<=700)return;const target=e.target.closest('p,h2,h3,.practice-list,.about-symbol,.about-aside');if(!target){hide();return;}point={x:e.clientX,y:e.clientY};lens.classList.add('is-active');document.body.classList.add('is-magnifying');if(!frame)frame=requestAnimationFrame(draw);},{...opt,passive:true});
  about.addEventListener('pointerleave',hide,opt);addEventListener('scroll',hide,{...opt,passive:true});document.addEventListener('keydown',hide,opt);document.addEventListener('visibilitychange',hide,opt);fine.addEventListener('change',hide,opt);
  const observer=new IntersectionObserver(entries=>{about.classList.toggle('about-in-view',entries[0].isIntersecting);if(!entries[0].isIntersecting)hide();});observer.observe(about);
  return()=>{disposed=true;hide();controller.abort();observer.disconnect();lens.remove();};
 }
 function mount(main){const a=mountHero(main),b=mountAbout(main);return()=>{a();b();};}
 function start(goHome){
  const mark=document.querySelector('.signature-mark'),name=document.querySelector('.signature-copy');
  document.querySelectorAll('[data-logo]').forEach(n=>n.addEventListener('click',async e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();if(!reduced.matches){mark.getAnimations().forEach(a=>a.cancel());mark.animate([{transform:'rotate(0) scale(1)'},{transform:'rotate(-20deg) scale(.88)',offset:.2},{transform:'rotate(365deg) scale(1.1)',offset:.8},{transform:'rotate(360deg) scale(1)'}],{duration:950,easing:'cubic-bezier(.2,.7,.2,1)'});name.getAnimations().forEach(a=>a.cancel());name.animate([{transform:'perspective(600px) rotateX(0)'},{transform:'perspective(600px) rotateX(360deg)'}],{duration:900,easing:'cubic-bezier(.4,0,.2,1)'});}await goHome();replay();}));
  const scrolled=()=>document.body.classList.toggle('header-scrolled',scrollY>70);addEventListener('scroll',scrolled,{passive:true});scrolled();document.addEventListener('visibilitychange',()=>document.body.classList.toggle('page-inactive',document.hidden));
  if(!document.documentElement.classList.contains('intro-pending'))return;
  const gate=document.querySelector('.entry-gate'),surface=document.querySelector('.site-surface'),point=gate.querySelector('.entry-point');gate.hidden=false;surface.inert=true;let opening=false,animation=null,auto;
  function finish(){document.documentElement.classList.remove('intro-pending');gate.hidden=true;surface.inert=false;animation?.cancel();clearTimeout(window.introSafety);if(document.activeElement===point)mark.focus({preventScroll:true});}
  async function open(){if(opening)return;opening=true;clearTimeout(auto);document.dispatchEvent(new Event('portfolio-enter'));if(reduced.matches){finish();return;}animation=surface.animate([{clipPath:'circle(0px at 50vw 50vh)'},{clipPath:`circle(${Math.hypot(innerWidth,innerHeight)}px at 50vw 50vh)`}],{duration:1100,easing:'cubic-bezier(.65,0,.15,1)',fill:'forwards'});await animation.finished.catch(()=>{});finish();}
  point.addEventListener('click',open,{once:true});auto=setTimeout(open,1350);reduced.addEventListener('change',()=>{if(reduced.matches){open();finish();}});addEventListener('pagehide',finish,{once:true});
 }
 window.PortfolioMotion={heroLens,mount,start};
})();
