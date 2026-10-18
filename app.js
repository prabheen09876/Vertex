(function(){
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s,c=document)=>c.querySelector(s), $$ = (s,c=document)=>[...c.querySelectorAll(s)];
  const fine = matchMedia('(pointer:fine)').matches;

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    lenis.on('scroll', (e)=>{ ScrollTrigger.update(); window.SCENE && SCENE.setScroll(e.scroll, e.velocity); });
    gsap.ticker.add(t=>lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0);
  } else {
    addEventListener('scroll', ()=>window.SCENE && SCENE.setScroll(scrollY, 0));
  }
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click', e=>{
    const id=a.getAttribute('href'); if(id.length<2) return;
    const el=$(id); if(!el) return; e.preventDefault();
    lenis ? lenis.scrollTo(el, {duration:1.6}) : el.scrollIntoView?.call(el);
  }));
  if (lenis) lenis.stop();

  /* ---------- Preloader ---------- */
  const count = {v:0};
  const loaderTl = gsap.timeline();
  loaderTl.to(count, {v:100, duration:1.8, ease:'power2.inOut', onUpdate(){
      $('#loaderCount').textContent = Math.round(count.v);
      $('#loaderBar').style.width = count.v+'%';
    }})
    .to('#loader', {yPercent:-100, duration:1, ease:'expo.inOut'}, '+=.15')
    .from('.hero-title .line-mask>span', {yPercent:110, duration:1.2, stagger:.08, ease:'expo.out'}, '-=.45')
    .from('.hero .fade-up, .hero-tags .tag, .hero-coords', {y:24, opacity:0, duration:.9, stagger:.06, ease:'power3.out'}, '-=.9')
    .from('.nav', {yPercent:-100, duration:.9, ease:'expo.out'}, '<')
    .add(()=>{ lenis && lenis.start(); $('#loader').style.display='none'; });

  /* ---------- Cursor ---------- */
  const cursor = $('#cursor'), dot = $('.cursor-dot'), ringEl = $('.cursor-ring'), ringTxt = $('.cursor-ring span');
  if (fine) {
    const p = {x:innerWidth/2,y:innerHeight/2}, r = {x:p.x,y:p.y};
    addEventListener('pointermove', e=>{ p.x=e.clientX; p.y=e.clientY; dot.style.transform=`translate(${p.x}px,${p.y}px)`; });
    gsap.ticker.add(()=>{ r.x+=(p.x-r.x)*.18; r.y+=(p.y-r.y)*.18; ringEl.style.transform=`translate(${r.x}px,${r.y}px)`; });
    document.addEventListener('pointerover', e=>{
      const v = e.target.closest('[data-cursor="view"]'), l = e.target.closest('a,button,.svc,.plan');
      cursor.classList.toggle('is-view', !!v); cursor.classList.toggle('is-link', !v && !!l);
      if (v) ringTxt.textContent = 'View';
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (fine) $$('.magnetic').forEach(el=>{
    const strength = el.classList.contains('cta-btn-big') ? .45 : .3;
    el.addEventListener('pointermove', e=>{
      const b=el.getBoundingClientRect();
      gsap.to(el,{x:(e.clientX-b.left-b.width/2)*strength, y:(e.clientY-b.top-b.height/2)*strength, duration:.5, ease:'power3.out'});
    });
    el.addEventListener('pointerleave', ()=>gsap.to(el,{x:0,y:0,duration:.8,ease:'elastic.out(1,.4)'}));
  });

  /* ---------- Nav hide on scroll ---------- */
  let lastY=0;
  ScrollTrigger.create({ onUpdate(self){ const y=self.scroll(); $('#nav').classList.toggle('hide', y>lastY && y>200); lastY=y; } });

  /* ---------- Scene state per section ---------- */
  $$('[data-scene]').forEach(sec=>{
    ScrollTrigger.create({ trigger:sec, start:'top 55%', end:'bottom 55%',
      onToggle:self=>{ if(self.isActive && window.SCENE) SCENE.setState(sec.dataset.scene); } });
  });
  // Hero parallax out
  gsap.to('.hero-title', {yPercent:-30, opacity:.0, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});
  gsap.to('.hero-tags', {y:-160, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});
  gsap.to('.hero-coords', {y:-90, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});

  /* ---------- Marquee (scroll-velocity driven) ---------- */
  const track = $('#marquee'); let mx = 0, dir = -1;
  gsap.ticker.add(()=>{
    const v = lenis ? lenis.velocity : 0;
    if (v) dir = v>0 ? -1 : 1;
    mx += dir*(1 + Math.abs(v)*.35);
    const w = track.scrollWidth/2; if (mx<-w) mx+=w; if (mx>0) mx-=w;
    track.style.transform = `translateX(${mx}px)`;
  });

  /* ---------- Split-line headings ---------- */
  $$('.split-lines').forEach(h=>{
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    h.innerHTML = parts.map(p=>`<span class="line-mask"><span>${p}</span></span>`).join('');
    gsap.from($$('.line-mask>span',h), {yPercent:110, duration:1.1, stagger:.1, ease:'expo.out', scrollTrigger:{trigger:h, start:'top 85%'}});
  });
  $$('section:not(.hero) .fade-up').forEach(el=>gsap.from(el,{y:30,opacity:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%'}}));

  /* ---------- Intro: word-by-word scrub ---------- */
  const it = $('#introText');
  const hl = ['model,','animate','code','fast','yours'];
  it.innerHTML = it.textContent.trim().split(/\s+/).map(w=>`<span class="w${hl.some(h=>w.startsWith(h))?' hl':''}">${w}</span>`).join(' ');
  gsap.to($$('.w',it), {opacity:1, stagger:.08, ease:'none', scrollTrigger:{trigger:it, start:'top 80%', end:'bottom 45%', scrub:true}});
  $$('.count').forEach(c=>gsap.to({v:0},{v:+c.dataset.to, duration:1.6, ease:'power2.out', scrollTrigger:{trigger:c,start:'top 85%'}, onUpdate(){c.textContent=Math.round(this.targets()[0].v);}}));

  /* ---------- Work: pinned horizontal scroll ---------- */
  const wTrack = $('#workTrack');
  const getDist = ()=> wTrack.scrollWidth - innerWidth;
  const hTween = gsap.to(wTrack, {x:()=>-getDist(), ease:'none', scrollTrigger:{
    trigger:'#work', start:'top top', end:()=>'+='+getDist(), pin:true, scrub:1, invalidateOnRefresh:true,
    onUpdate:self=>gsap.set('#workProg',{scaleX:self.progress})
  }});
  // inner parallax + skew per card
  $$('.work-card').forEach((card,i)=>{
    gsap.fromTo($('.bg',card), {xPercent:-8}, {xPercent:8, ease:'none', scrollTrigger:{trigger:card, containerAnimation:hTween, start:'left right', end:'right left', scrub:true}});
    gsap.fromTo($('.big',card), {xPercent:18}, {xPercent:-18, ease:'none', scrollTrigger:{trigger:card, containerAnimation:hTween, start:'left right', end:'right left', scrub:true}});
    gsap.from(card, {y:i%2?80:-40, rotate:i%2?3:-2, ease:'none', scrollTrigger:{trigger:card, containerAnimation:hTween, start:'left right', end:'center center', scrub:true}});
  });
  // 3D tilt on cards
  if (fine) $$('.work-card').forEach(card=>{
    const inner=$('.inner',card);
    card.addEventListener('pointermove',e=>{const b=card.getBoundingClientRect(),x=(e.clientX-b.left)/b.width-.5,y=(e.clientY-b.top)/b.height-.5;inner.style.transform=`rotateY(${x*14}deg) rotateX(${-y*12}deg)`;});
    card.addEventListener('pointerleave',()=>inner.style.transform='');
  });

  /* ---------- Parallax gallery ---------- */
  $$('.para-item').forEach(el=>{
    const s = +el.dataset.speed;
    gsap.fromTo(el, {y:()=>innerHeight*.5*s, rotate:(s-1)*-6}, {y:()=>-innerHeight*.6*s, rotate:(s-1)*6, ease:'none',
      scrollTrigger:{trigger:'#para', start:'top bottom', end:'bottom top', scrub:true, invalidateOnRefresh:true}});
  });
  gsap.fromTo('.para-title .h2', {scale:.75, opacity:.2}, {scale:1.05, opacity:1, ease:'none', scrollTrigger:{trigger:'#para', start:'top 70%', end:'center center', scrub:true}});

  /* ---------- Process: stacked cards shrink back ---------- */
  const steps = $$('.step');
  if (innerWidth>860) steps.forEach((st,i)=>{
    if (i===steps.length-1) return;
    gsap.to(st, {scale:.9-(steps.length-i)*.012, filter:'brightness(.55)', ease:'none',
      scrollTrigger:{trigger:steps[i+1], start:'top bottom', end:'top '+(14+(i+1)*2)+'%', scrub:true}});
  });
  steps.forEach(st=>gsap.from($('.step-r>*',st), {y:60, rotateX:-25, opacity:0, duration:1.1, ease:'expo.out', scrollTrigger:{trigger:st, start:'top 70%'}}));

  /* ---------- Pricing: tilt + glare, currency toggle ---------- */
  gsap.from('.plan', {y:80, opacity:0, rotateX:-18, duration:1.2, stagger:.12, ease:'expo.out', scrollTrigger:{trigger:'.plans', start:'top 80%'}});
  if (fine) $$('.tilt').forEach(p=>{
    p.addEventListener('pointermove',e=>{const b=p.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;
      p.style.transform=`rotateY(${(x-.5)*10}deg) rotateX(${(.5-y)*10}deg) translateZ(10px)`; p.style.setProperty('--gx',x*100+'%'); p.style.setProperty('--gy',y*100+'%');});
    p.addEventListener('pointerleave',()=>p.style.transform='');
  });
  const tg=$('#curToggle'), knob=$('.knob',tg), tbs=$$('button',tg);
  const placeKnob=b=>{knob.style.width=b.offsetWidth+'px';knob.style.transform=`translateX(${b.offsetLeft-5}px)`;};
  requestAnimationFrame(()=>placeKnob(tbs[0])); document.fonts && document.fonts.ready.then(()=>placeKnob($('button.on',tg)));
  tbs.forEach(b=>b.addEventListener('click',()=>{
    tbs.forEach(x=>x.classList.toggle('on',x===b)); placeKnob(b);
    $$('.amt').forEach(a=>gsap.to(a,{yPercent:-40,opacity:0,duration:.2,onComplete(){a.textContent=a.dataset[b.dataset.cur];gsap.fromTo(a,{yPercent:40,opacity:0},{yPercent:0,opacity:1,duration:.35,ease:'power3.out'});}}));
  }));

  /* ---------- FAQ accordion ---------- */
  $$('.qa').forEach(q=>{
    const btn=$('button',q), ans=$('.ans',q);
    btn.addEventListener('click',()=>{
      const open=!q.classList.contains('open');
      $$('.qa.open').forEach(o=>{ if(o!==q){o.classList.remove('open'); $('.ans',o).style.height='0px';} });
      q.classList.toggle('open',open); ans.style.height = open ? ans.scrollHeight+'px' : '0px';
      setTimeout(()=>ScrollTrigger.refresh(),600);
    });
  });

  /* ---------- CTA ---------- */
  gsap.from('.cta-big .line-mask>span', {yPercent:110, duration:1.2, stagger:.1, ease:'expo.out', scrollTrigger:{trigger:'.cta', start:'top 60%'}});
  gsap.from('.cta-btn-big', {scale:0, rotate:-90, duration:1.2, ease:'elastic.out(1,.6)', scrollTrigger:{trigger:'.cta', start:'top 40%'}});

  /* ---------- Footer: letters rise + clocks ---------- */
  gsap.from('#footWord span', {yPercent:100, stagger:.05, ease:'none', scrollTrigger:{trigger:'.footer', start:'top bottom', end:'bottom bottom', scrub:true}});
  const clocks=$$('.clock');
  const tickClock=()=>clocks.forEach(c=>c.textContent=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:c.dataset.tz}).format(new Date()));
  tickClock(); setInterval(tickClock, 15000);

  addEventListener('load', ()=>ScrollTrigger.refresh());
})();
