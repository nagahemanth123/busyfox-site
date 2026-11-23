/* Busy Fox site: shared behaviour. Every module checks for its own markup, so one file serves every page. No network calls. */
(function(){
  'use strict';
  var root = document.documentElement;
  var $ = function(id){ return document.getElementById(id); };
  var all = function(sel, el){ return [].slice.call((el || document).querySelectorAll(sel)); };
  var still = root.classList.contains('still');
  var cssScroll = root.classList.contains('sda');   /* CSS scroll-driven animations own the scroll-linked transforms */
  var clamp = function(v, a, b){ return v < a ? a : v > b ? b : v; };
  var c01 = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };
  var wide = window.matchMedia('(min-width:900px)');

  /* ---------- split headings into rising words ---------- */
  all('[data-split]').forEach(function(h){
    var n = 0, frag = document.createDocumentFragment();
    function words(text, cls){
      text.split(/\s+/).forEach(function(wd){
        if (!wd) return;
        var s = document.createElement('span'); s.className = 'w' + (cls ? ' ' + cls : '');
        var i = document.createElement('i'); i.textContent = wd; i.style.setProperty('--i', n++);
        s.appendChild(i); frag.appendChild(s); frag.appendChild(document.createTextNode(' '));
      });
    }
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    [].slice.call(h.childNodes).forEach(function(nd){
      if (nd.nodeType === 3) words(nd.textContent, ''); else words(nd.textContent, 'em');
    });
    h.textContent = ''; h.appendChild(frag);
  });
  all('[data-rv]').forEach(function(g){
    var kids = g.classList.contains('rv') ? [] : all('.rv', g);
    kids.forEach(function(k, i){ k.style.setProperty('--i', i); });
  });

  /* ---------- elements ---------- */
  var foxSlot = $('foxSlot'), foxFly = $('foxFly'), foxTilt = $('foxTilt'), foxHop = $('foxHop');
  var markSlot = $('markSlot'), mark = $('mark'), brandWord = $('brandWord'), prog = $('prog'), quip = $('quip');
  var stageSlot = $('stageSlot'), stage = $('stage');
  var stepper = $('stepper'), runner = $('runner'), stFill = $('stFill'), stepEls = all('#steps li');
  var mq = $('mq'), mqTrack = $('mqTrack'), svc = $('svc'), foot = $('foot');
  var groups = all('[data-rv]').map(function(el){ return { el:el, top:0, done:false }; });

  /* ---------- marquee build ---------- */
  var mqSet = mqTrack ? mqTrack.innerHTML : '', mqCopies = 1;
  function mqFill(){
    if (!mqTrack) return;
    var one = mqTrack.scrollWidth / mqCopies;
    if (!one) return;
    var need = Math.max(2, Math.ceil((window.innerWidth * 2) / one) + 1);
    if (need !== mqCopies){ var h = ''; for (var i = 0; i < need; i++) h += mqSet; mqTrack.innerHTML = h; mqCopies = need; }
  }

  /* ---------- measure (all layout reads live here) ---------- */
  var m = { dx:0, R:1, s1:.1, shift:32, vh:0, vw:0, heroH:0, foxCx:0, foxCy:0, stageTop:0, docMax:1, footTop:0,
            stTop:0, stLen:0, stH:0, stAt:[], mqW:0, mqTop:0, mqH:0, svcTop:0, svcH:0 };
  var K = 0.5, dirty = true;
  var hasFox = !!foxSlot;
  var tocA = all('.toc a'), tocS = tocA.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }), tocOn = -1;
  function measure(){
    var y = window.scrollY, vh = window.innerHeight;
    m.vh = vh; m.vw = window.innerWidth;
    if (hasFox){
      var a = foxSlot.getBoundingClientRect(), b = markSlot.getBoundingClientRect();
      m.dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      m.R  = Math.max(1, ((a.top + y + a.height / 2) - (b.top + b.height / 2)) / (1 - K));
      m.s1 = b.height / a.height; m.shift = 0;   /* the header keeps its mark, so the word never moves */
      if (cssScroll){ var rs = root.style; rs.setProperty('--fox-r', m.R.toFixed(1) + 'px'); rs.setProperty('--fox-ty', (K * m.R).toFixed(1) + 'px'); rs.setProperty('--fox-dx', m.dx.toFixed(1) + 'px'); rs.setProperty('--fox-s', m.s1.toFixed(4)); rs.setProperty('--bw', (-m.shift).toFixed(1) + 'px'); }
      m.foxCx = a.left + a.width / 2; m.foxCy = a.top + y + a.height / 2;
      m.heroH = $('hero') ? $('hero').offsetHeight : vh;
    }
    if (stageSlot) m.stageTop = stageSlot.getBoundingClientRect().top + y;
    m.docMax = Math.max(1, root.scrollHeight - vh);
    m.footTop = foot.getBoundingClientRect().top + y;
    if (stepper){
      var s = stepper.getBoundingClientRect();
      m.stTop = s.top + y; m.stH = s.height;
      m.stLen = wide.matches ? s.width - runner.offsetWidth : s.height - runner.offsetHeight;
      m.stAt = stepEls.map(function(li){ return wide.matches ? li.offsetLeft : li.offsetTop; });
      if (cssScroll){ root.style.setProperty('--st-len', m.stLen.toFixed(1) + 'px'); root.style.setProperty('--st-h', m.stH.toFixed(1) + 'px'); }
    }
    if (mq){
      mqFill();
      m.mqW = mqTrack.scrollWidth / mqCopies;
      var q = mq.getBoundingClientRect(); m.mqTop = q.top + y; m.mqH = q.height;
    }
    if (svc){ var v = svc.getBoundingClientRect(); m.svcTop = v.top + y; m.svcH = v.height; }
    m.toc = tocS.map(function(el){ return el ? el.getBoundingClientRect().top + y : 1e9; });
    groups.forEach(function(g){ if (!g.done) g.top = g.el.getBoundingClientRect().top + y; });
    dirty = false; force = true;
  }
  function soil(){ dirty = true; }
  window.addEventListener('resize', soil);
  window.addEventListener('load', soil);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soil);
  if ('ResizeObserver' in window) new ResizeObserver(soil).observe(document.body);

  /* ---------- scroll-linked work (runs only when scroll position changes) ---------- */
  var wasRising = null, docked = null, scrolled = null, atFoot = false, stepOn = -1, svcLive = null, force = true;
  function countUp(el){
    var n = +el.dataset.n, k = 0, tot = 9 + n;
    var id = setInterval(function(){ k++; el.textContent = '0' + ((k >= tot) ? n : (k % 10)); if (k >= tot) clearInterval(id); }, 55);
  }
  function reveal(g){
    g.done = true; g.el.classList.add('in');
    if (!still) all('.num', g.el).forEach(countUp);
  }
  function scrollFrame(y){
    var sc = y > 8, k;
    if (sc !== scrolled){ scrolled = sc; root.classList.toggle('scrolled', sc); }
    if (!cssScroll) prog.style.transform = 'scaleX(' + c01(y / m.docMax).toFixed(4) + ')';
    var end = y >= m.docMax - 2;
    for (var i = 0; i < groups.length; i++){ var g = groups[i]; if (!g.done && (end || y + m.vh * 0.9 > g.top)) reveal(g); }
    if (svc){
      var live = y + m.vh > m.svcTop && y < m.svcTop + m.svcH;
      if (live !== svcLive){ svcLive = live; svc.classList.toggle('live', live); }
    }
    var af = y + m.vh >= m.footTop + 30;
    if (af !== atFoot){ atFoot = af; if (af && !still){ mark.classList.remove('nod'); void mark.offsetWidth; mark.classList.add('nod'); } }
    /* section index */
    if (tocA.length){
      var ti = 0; for (k = 0; k < m.toc.length; k++) if (y + m.vh * 0.3 >= m.toc[k]) ti = k;
      if (ti !== tocOn){
        tocOn = ti;
        tocA.forEach(function(a, j){ a.classList.toggle('act', j === ti); });
        var box = tocA[ti].parentNode; if (box.scrollWidth > box.clientWidth) box.scrollLeft = tocA[ti].offsetLeft - 20;
      }
    }
    /* stepper */
    if (stepper){
      var sp = wide.matches ? c01((y + m.vh * 0.82 - m.stTop) / (m.vh * 0.5)) : c01((y + m.vh * 0.5 - m.stTop) / Math.max(1, m.stH));
      var pos = sp * m.stLen;
      if (cssScroll){ /* CSS moves the runner */ }
      else if (wide.matches){ runner.style.transform = 'translate3d(' + pos.toFixed(1) + 'px,0,0)'; stFill.style.transform = 'scaleX(' + sp.toFixed(4) + ')'; }
      else { runner.style.transform = 'translate3d(0,' + pos.toFixed(1) + 'px,0)'; stFill.style.transform = 'scaleY(' + sp.toFixed(4) + ')'; }
      var on = -1; for (k = 0; k < m.stAt.length; k++) if (pos + 18 >= m.stAt[k]) on = k;
      if (on !== stepOn){ stepOn = on; stepEls.forEach(function(li, j){ li.classList.toggle('on', j <= on); }); }
    }
    if (still) return;
    var ex = 0, es = 0, q = 0;
    if (hasFox){
      /* fox into header */
      var p = c01(y / m.R), dk = p >= 1; ex = p * p * (3 - 2 * p); es = 1 - (1 - p) * (1 - p);
      if (dk !== docked){ docked = dk; root.classList.toggle('docked', dk); }
    }
    if (stage){
      q = c01((y + m.vh - m.stageTop) / (m.vh * 0.62)); var rising = q > 0 && q < 1;
      if (rising !== wasRising){ wasRising = rising; stage.classList.toggle('rising', rising); }
    }
    if (cssScroll) return;
    if (hasFox){
      if (!docked) foxFly.style.transform = 'translate3d(' + (m.dx * ex).toFixed(2) + 'px,' + (K * y).toFixed(2) + 'px,0) scale(' + (1 + (m.s1 - 1) * es).toFixed(4) + ')';
      brandWord.style.transform = 'translate3d(' + (-m.shift * (1 - ex)).toFixed(2) + 'px,0,0)';
      if (quip) quip.style.opacity = (1 - c01(y / 110)).toFixed(3);
    }
    if (stage){
      var qe = 1 - Math.pow(1 - q, 3);
      stage.style.transform = 'translate3d(0,' + ((1 - qe) * 64).toFixed(2) + 'px,0) scale(' + (0.94 + 0.06 * qe).toFixed(4) + ')';
    }
  }

  /* ---------- fox: tilt, hop, quips ---------- */
  var tilt = { x:0, y:0, tx:0, ty:0, last:-9999, wrote:'', k:0, kv:0 }, now = 0;
  window.addEventListener('pointermove', function(e){
    if (e.pointerType !== 'mouse' || still) return;
    tilt.tx = clamp((e.clientX - m.foxCx) / (m.vw * 0.5), -1, 1);
    tilt.ty = clamp((e.clientY - (m.foxCy - sy)) / (m.vh * 0.5), -1, 1);
    tilt.last = now;
  }, { passive:true });
  var touchId = null;
  if (foxHop) foxHop.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse') touchId = e.pointerId; }, { passive:true });
  window.addEventListener('pointermove', function(e){
    if (e.pointerId !== touchId || still) return;
    tilt.tx = clamp((e.clientX - m.foxCx) / 110, -1, 1);
    tilt.ty = clamp((e.clientY - (m.foxCy - sy)) / 150, -1, 1);
    tilt.last = now;
  }, { passive:true });
  function touchEnd(e){ if (e.pointerId === touchId) touchId = null; }
  window.addEventListener('pointerup', touchEnd, { passive:true });
  window.addEventListener('pointercancel', touchEnd, { passive:true });
  /* device tilt only where the browser gives it without a permission prompt */
  if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function'){
    window.addEventListener('deviceorientation', function(e){
      if (e.gamma == null || e.beta == null || touchId !== null || still) return;
      tilt.tx = clamp(e.gamma / 30, -1, 1); tilt.ty = clamp((e.beta - 45) / 35, -1, 1); tilt.last = now;
    }, { passive:true });
  }
  function tiltFrame(t){
    if (!hasFox || sy > m.heroH || docked) return;
    var tx = tilt.tx, ty = tilt.ty;
    if (t - tilt.last > 2200){ tx = Math.sin(t / 1500) * 0.42; ty = Math.cos(t / 2100) * 0.28; }
    tilt.x += (tx - tilt.x) * 0.075; tilt.y += (ty - tilt.y) * 0.075;
    tilt.kv = (tilt.kv - tilt.k * 0.09) * 0.88; tilt.k += tilt.kv;      /* spring: a small nod toward the headline word */
    var s = 'perspective(900px) rotateY(' + (tilt.x * 17).toFixed(2) + 'deg) rotateX(' + (-tilt.y * 13 - tilt.k * 9).toFixed(2) + 'deg) rotateZ(' + (tilt.k * 3.5).toFixed(2) + 'deg)';
    if (s !== tilt.wrote){ tilt.wrote = s; foxTilt.style.transform = s; }
  }
  var quips = ['Building brands.', 'Hello from Kadapa.', 'Yes, the fox is busy.', 'Okay, back to editing.'];
  var qi = -1, pokes = 0, quipText = $('quipText');
  function poke(){
    pokes++; qi = (qi + 1) % quips.length;
    if (still || !foxHop.animate){ quipText.textContent = quips[qi]; return; }
    if (pokes % 2){
      foxHop.animate([
        { transform:'translate3d(0,0,0) scale(1,1)' }, { transform:'translate3d(0,6px,0) scale(1.05,.93)', offset:.14 },
        { transform:'translate3d(0,-38px,0) scale(.97,1.05)', offset:.42 }, { transform:'translate3d(0,0,0) scale(1.04,.95)', offset:.7 },
        { transform:'translate3d(0,-6px,0) scale(1,1)', offset:.84 }, { transform:'translate3d(0,0,0) scale(1,1)' }
      ], { duration:760, easing:'cubic-bezier(.3,.6,.4,1)' });
    } else {
      foxHop.animate([
        { transform:'rotate(0)' }, { transform:'rotate(-9deg)', offset:.15 }, { transform:'rotate(8deg)', offset:.35 },
        { transform:'rotate(-6deg)', offset:.55 }, { transform:'rotate(3deg)', offset:.75 }, { transform:'rotate(0)' }
      ], { duration:720, easing:'ease-out' });
    }
    var out = quipText.animate([{ opacity:1, transform:'none' }, { opacity:0, transform:'translate3d(0,-8px,0)' }], { duration:140, easing:'ease-in', fill:'forwards' });
    out.onfinish = function(){
      quipText.textContent = quips[qi]; out.cancel();
      quipText.animate([{ opacity:0, transform:'translate3d(0,10px,0)' }, { opacity:1, transform:'none' }], { duration:520, easing:'cubic-bezier(.3,1.5,.5,1)' });
    };
  }
  if (foxHop) foxHop.addEventListener('click', poke);
  if (foxHop) foxHop.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); poke(); } });

  /* ---------- rotating word ---------- */
  var rotW = all('#rot b'), ri = 0, rotAt = 2600;
  function rotFrame(t){
    if (!rotW.length || t < rotAt || sy > m.heroH) return;
    rotAt = t + 2100;
    var old = rotW[ri]; ri = (ri + 1) % rotW.length; var nw = rotW[ri];
    old.classList.remove('cur'); old.classList.add('out'); tilt.kv += 0.22;
    nw.classList.remove('out'); nw.classList.add('cur');
    setTimeout(function(){ old.classList.remove('out'); }, 650);
  }

  /* ---------- magnetic buttons (mouse only; touch gets the press state) ---------- */
  var mags = [];
  all('.mag').forEach(function(el){
    var o = { el:el, inn:el.firstElementChild, x:0, y:0, vx:0, vy:0, tx:0, ty:0, r:null, live:false };
    el.addEventListener('pointerenter', function(e){
      if (e.pointerType !== 'mouse' || still) return;
      o.r = el.getBoundingClientRect(); o.live = true; if (mags.indexOf(o) < 0) mags.push(o);
    });
    el.addEventListener('pointermove', function(e){
      if (!o.live || !o.r) return;
      o.tx = (e.clientX - (o.r.left + o.r.width / 2)) * 0.32; o.ty = (e.clientY - (o.r.top + o.r.height / 2)) * 0.42;
    }, { passive:true });
    el.addEventListener('pointerleave', function(){ o.live = false; o.tx = 0; o.ty = 0; });
    el.addEventListener('pointerdown', function(e){ if (e.pointerType !== 'mouse' && el.animate && !still) el.animate([{ transform:'scale(1)' }, { transform:'scale(.94)', offset:.3 }, { transform:'scale(1)' }], { duration:420, easing:'cubic-bezier(.3,1.5,.5,1)' }); }, { passive:true });
  });
  function magFrame(){
    for (var i = mags.length - 1; i >= 0; i--){
      var o = mags[i];
      o.vx = (o.vx + (o.tx - o.x) * 0.16) * 0.72; o.vy = (o.vy + (o.ty - o.y) * 0.16) * 0.72;
      o.x += o.vx; o.y += o.vy;
      var rest = !o.live && Math.abs(o.x) < 0.05 && Math.abs(o.y) < 0.05 && Math.abs(o.vx) < 0.05 && Math.abs(o.vy) < 0.05;
      if (rest){ o.x = o.y = o.vx = o.vy = 0; mags.splice(i, 1); o.el.style.transform = ''; if (o.inn) o.inn.style.transform = ''; continue; }
      o.el.style.transform = 'translate3d(' + o.x.toFixed(2) + 'px,' + o.y.toFixed(2) + 'px,0)';
      if (o.inn) o.inn.style.transform = 'translate3d(' + (o.x * 0.35).toFixed(2) + 'px,' + (o.y * 0.35).toFixed(2) + 'px,0)';
    }
  }

  /* ---------- services ---------- */
  var rows = all('.svc-row'), panes = all('.svc-pane'), svcI = 0, cur = $('cur'), svcList = $('svcList');
  function setSvc(i){
    if (i === svcI) return; svcI = i;
    rows.forEach(function(r, k){ r.classList.toggle('on', k === i); });
    panes.forEach(function(p, k){ p.classList.toggle('on', k === i); });
  }
  rows.forEach(function(r){
    var i = +r.dataset.i;
    r.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') setSvc(i); });
    r.addEventListener('focus', function(){ setSvc(i); });
    r.addEventListener('click', function(e){ if (svcI !== i){ e.preventDefault(); setSvc(i); } });   /* first tap previews, a tap on the open row follows the link */
  });
  var cp = { x:0, y:0, tx:0, ty:0, on:false };
  if (svcList) svcList.addEventListener('pointerenter', function(e){ if (e.pointerType !== 'mouse' || still) return; cp.on = true; cp.x = cp.tx = e.clientX; cp.y = cp.ty = e.clientY; cur.classList.add('on'); });
  if (svcList) svcList.addEventListener('pointermove', function(e){ if (cp.on){ cp.tx = e.clientX; cp.ty = e.clientY; } }, { passive:true });
  if (svcList) svcList.addEventListener('pointerleave', function(){ cp.on = false; cur.classList.remove('on'); });
  function curFrame(){
    if (!cur || (!cp.on && Math.abs(cp.tx - cp.x) < 0.3)) return;
    cp.x += (cp.tx - cp.x) * 0.22; cp.y += (cp.ty - cp.y) * 0.22;
    cur.style.transform = 'translate3d(' + cp.x.toFixed(1) + 'px,' + cp.y.toFixed(1) + 'px,0)';
  }

  /* ---------- who we work with: category wall ---------- */
  var wall = $('wall'), tiles = wall ? all('.tile', wall) : [], pinned = -1;
  function setCat(c){
    if (!wall) return;
    wall.classList.toggle('has-act', c >= 0);
    tiles.forEach(function(t){ t.classList.toggle('act', +t.dataset.c === c); });
  }
  function hook(el){
    var c = +el.dataset.c;
    el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') setCat(c); });
    el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') setCat(pinned); });
    el.addEventListener('click', function(){ pinned = (pinned === c) ? -1 : c; setCat(pinned); });
  }
  tiles.forEach(hook);
  tiles.forEach(function(t){
    var c = +t.dataset.c;
    t.addEventListener('focus', function(){ if (t.matches(':focus-visible')) setCat(c); });
    t.addEventListener('blur', function(){ setCat(pinned); });
    t.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); t.click(); } });
  });

  /* ---------- marquee: drifts, follows scroll velocity, draggable ---------- */
  var mx = 0, mv = 60, mdir = 1, drag = null, mqActive = true;
  function mqFrame(dt){
    if (!mqActive || !m.mqW) return;
    if (!drag){ mv += (mdir * 60 - mv) * 0.045; mx -= mv * dt; }
    if (mx <= -m.mqW) mx += m.mqW; else if (mx > 0) mx -= m.mqW;
    mqTrack.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,0,0)';
  }
  function mqKick(d){ if (Math.abs(d) < 1) return; mdir = d > 0 ? 1 : -1; mv = clamp(mv + d * 5, -1400, 1400); }
  if (mq) mq.addEventListener('pointerdown', function(e){
    if (still) return;
    drag = { id:e.pointerId, x:e.clientX, t:performance.now(), v:0 }; mq.classList.add('drag');
    try { mq.setPointerCapture(e.pointerId); } catch(err){}
  });
  if (mq) mq.addEventListener('pointermove', function(e){
    if (!drag || e.pointerId !== drag.id) return;
    var t = performance.now(), dx = e.clientX - drag.x, dt = Math.max(1, t - drag.t);
    mx += dx; drag.v = drag.v * 0.6 + (dx / dt * 1000) * 0.4; drag.x = e.clientX; drag.t = t;
  }, { passive:true });
  function mqEnd(e){
    if (!drag || e.pointerId !== drag.id) return;
    var v = (performance.now() - drag.t > 120) ? 0 : drag.v;
    mv = clamp(-v, -1800, 1800); if (Math.abs(v) > 20) mdir = v < 0 ? 1 : -1;
    drag = null; mq.classList.remove('drag');
  }
  if (mq) mq.addEventListener('pointerup', mqEnd); if (mq) mq.addEventListener('pointercancel', mqEnd);

  /* ---------- FoxCut one bar (a local demo, no network) ---------- */
  (function(){
  var bar = $('bar'); if (!bar) return;
  var barIn = $('barIn'), planList = $('planList'), tabs = all('.tabs button'), shots = stage ? all('img', stage) : [], job = 0;
  var PLANS = {
    reel:     { shot:2, steps:['Make a reel, 30 seconds long', 'Use the footage from today’s cafe shoot', 'Keep the best moments, cut on the beat', 'Add captions', 'Export sized for each platform'] },
    captions: { shot:1, steps:['Open the talking clip', 'Cut the pauses, fillers and repeated lines', 'Write the captions in Telugu', 'Pick a caption style', 'Export sized for each platform'] },
    wedding:  { shot:2, steps:['Make a wedding film, 1 minute long', 'Find the moments that matter', 'Build the highlight in chapters', 'Cut it to the music', 'Export sized for each platform'] },
    campaign: { shot:3, steps:['Start a campaign from your sentence', 'Pick the posts and reels it needs', 'Draft each piece', 'Wait for your yes', 'Export sized for each platform'] },
    other:    { shot:2, steps:['Read what you asked for', 'Pick the format: talking clip, reel or wedding film', 'Keep the best moments from your footage', 'Cut it and add captions', 'Export sized for each platform'] }
  };
  function showShot(i){
    tabs.forEach(function(o){ o.setAttribute('aria-selected', +o.dataset.i === i ? 'true' : 'false'); });
    shots.forEach(function(im, k){ im.classList.toggle('on', k === i); });
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ showShot(+t.dataset.i); }); });
  function guess(text){
    var s = text.toLowerCase();
    if (/caption|subtitle|telugu|talking|podcast/.test(s)) return 'captions';
    if (/wedding|marriage|pelli/.test(s)) return 'wedding';
    if (/campaign|offer|festival|sale|launch/.test(s)) return 'campaign';
    if (/reel|short|cafe|shoot/.test(s)) return 'reel';
    return 'other';
  }
  function tickSvg(){ return '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="11"/><path d="M6.5 11.4l3 3 6-6.4"/></svg>'; }
  function runPlan(key){
    var me = ++job, p = PLANS[key] || PLANS.other;
    bar.classList.add('busy'); planList.innerHTML = '<li class="hint" style="--k:0">Working it out…</li>';
    setTimeout(function(){
      if (me !== job) return;
      bar.classList.remove('busy'); planList.textContent = '';
      p.steps.forEach(function(s, k){
        var li = document.createElement('li'); li.style.setProperty('--k', k);
        li.innerHTML = tickSvg(); var sp = document.createElement('span'); sp.textContent = s; li.appendChild(sp); planList.appendChild(li);
      });
      var ex = document.createElement('li'), k = p.steps.length; ex.className = 'exp'; ex.style.setProperty('--k', k);
      ex.innerHTML = '<span class="exp-l">Exporting\u2026</span><i class="exp-bar"><b></b></i><span class="exp-chips"><em style="--c:0">9:16</em><em style="--c:1">1:1</em><em style="--c:2">16:9</em></span>';
      planList.appendChild(ex);
      setTimeout(function(){ if (me !== job) return; ex.classList.add('done'); ex.firstChild.textContent = 'Exported in three sizes'; }, still ? 0 : 300 + k * 140 + 1050);
      showShot(p.shot);
    }, still ? 0 : 650);
  }
  function typeIn(text, key){
    var me = ++job, i = 0; barIn.value = '';
    if (still){ barIn.value = text; runPlan(key); return; }
    (function next(){
      if (me !== job) return;
      barIn.value = text.slice(0, ++i);
      if (i < text.length) setTimeout(next, 16 + Math.random() * 26); else setTimeout(function(){ if (me === job) runPlan(key); }, 220);
    })();
  }
  all('#chips button').forEach(function(b){ b.addEventListener('click', function(){ typeIn(b.textContent, b.dataset.p); }); });
  bar.addEventListener('submit', function(e){
    e.preventDefault(); var v = barIn.value.trim();
    if (!v){ barIn.focus(); return; }
    barIn.blur(); runPlan(guess(v));
  });
  barIn.addEventListener('input', function(){ job++; touched = true; bar.classList.remove('busy'); });
  var touched = false, toyEl = $('toy');
  [bar, $('chips')].forEach(function(el){ el.addEventListener('pointerdown', function(){ touched = true; }, { passive:true }); });
  barIn.addEventListener('focus', function(){ touched = true; });
  if ('IntersectionObserver' in window){
    var toyIO = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting) return;
      toyIO.disconnect();
      setTimeout(function(){ if (!touched && job === 0){ var b = document.querySelector('#chips button'); typeIn(b.textContent, b.dataset.p); } }, still ? 0 : 500);
    }, { threshold:0.35 });
    toyIO.observe($('bar'));
  }

  })();

  /* ---------- caption styles ---------- */
  var cap = $('cap'), capName = $('capName'), capWords = all('#capLine span'), capBtns = all('#capBtns button');
  var CAPS = [['pop', 'Bold Pop'], ['one', 'One Word'], ['hook', 'Hook Bar'], ['boxes', 'Word Boxes'], ['note', 'Marker Note']];
  var capI = 0, capW = -1, capAt = 0, capActive = true;
  function setCap(i){
    capI = (i + CAPS.length) % CAPS.length; cap.dataset.s = CAPS[capI][0]; capName.textContent = CAPS[capI][1];
    capBtns.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.s === CAPS[capI][0] ? 'true' : 'false'); });
    capW = -1; capAt = 0; paintCap();
  }
  function paintCap(){ capWords.forEach(function(w, k){ w.classList.toggle('hi', k === capW); w.classList.toggle('was', k < capW); }); }
  function capFrame(t){
    if (!cap || !capActive || t < capAt) return;
    capW++; if (capW > capWords.length + 1) capW = 0;
    capAt = t + (capW >= capWords.length ? 500 : 400); paintCap();
  }
  if (cap) cap.addEventListener('click', function(){ setCap(capI + 1); });
  capBtns.forEach(function(b, i){ b.addEventListener('click', function(){ setCap(i); }); });
  if (still){ capW = 0; paintCap(); }

  /* start/stop the two free-running loops when off screen (they default to running if the observer never fires) */
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.target === mq) mqActive = e.isIntersecting; else capActive = e.isIntersecting; });
    }, { rootMargin:'120px 0px' });
    if (mq) io.observe(mq); if (cap) io.observe(cap);
  }

  /* ---------- contact ---------- */
  (function(){
    var h = 12;
    try { h = +new Intl.DateTimeFormat('en-GB', { hour:'numeric', hourCycle:'h23', timeZone:'Asia/Kolkata' }).format(new Date()); } catch(e){ h = new Date().getHours(); }
    if (isNaN(h)) h = 12;
    var gr = $('greet'); if (!gr) return;
    gr.textContent =
      h >= 5 && h < 12 ? 'Good morning from Kadapa. The timeline is open.' :
      h >= 12 && h < 17 ? 'Good afternoon from Kadapa. Somewhere in the office, a reel is exporting.' :
      h >= 17 && h < 22 ? 'Good evening from Kadapa. We’re probably still editing.' :
      'It’s late in Kadapa. Send an email and the fox will read it first thing.';
  })();
  var mail = $('mail'), mailT = 0;
  function copied(){ mail.classList.add('did'); clearTimeout(mailT); mailT = setTimeout(function(){ mail.classList.remove('did'); }, 1800); }
  if (mail) mail.addEventListener('click', function(){
    var txt = mail.dataset.mail;
    function fallback(){
      try {
        var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta);
        if (ok) copied(); else location.href = 'mailto:' + txt;
      } catch(e){ location.href = 'mailto:' + txt; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(copied, fallback); else fallback();
  });

  /* ---------- motion toggle + phone menu ---------- */
  $('motionState').textContent = still ? 'off' : 'on';
  $('motionBtn').addEventListener('click', function(){
    try { localStorage.setItem('bf-motion', still ? 'on' : 'off'); } catch(e){}
    location.reload();
  });
  var menuBtn = $('menuBtn');
  function setMenu(open){ root.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  menuBtn.addEventListener('click', function(){ setMenu(!root.classList.contains('menu-open')); });
  $('sheet').addEventListener('click', function(e){ if (e.target.closest('a')) setMenu(false); });
  window.addEventListener('keydown', function(e){ if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', function(e){ if (root.classList.contains('menu-open') && !e.target.closest('#sheet') && !e.target.closest('#menuBtn')) setMenu(false); });
  wide.addEventListener ? wide.addEventListener('change', function(){ setMenu(false); }) : 0;

  /* ---------- small page pieces ---------- */
  /* services page: tap an illustration to play it again */
  all('.ill-card').forEach(function(c){
    c.addEventListener('click', function(){ var p = c.querySelector('.svc-pane'); p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); });
    c.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); c.click(); } });
  });
  /* links to a section of the page you are already on: move there without a reload */
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('a[href*="#"]') : null; if (!a) return;
    var u; try { u = new URL(a.href); } catch(err){ return; }
    var norm = function(p){ return p.replace(/index\.html$/, ''); };
    if (u.origin !== location.origin || norm(u.pathname) !== norm(location.pathname) || !u.hash) return;
    var el = document.getElementById(u.hash.slice(1)); if (!el) return;
    e.preventDefault(); el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    try { history.replaceState(null, '', u.hash); } catch(err){}
  });
  /* insights page: the sample connection flow (runs in the page, connects to nothing) */
  var flow = $('flow');
  if (flow){
    var flS = $('flowS'), flN = $('flowN'),
        FS = ['This is the kind of list the Meta or LinkedIn screen shows you.', 'You choose what to share. Leave out anything you like.', 'Waiting for your yes.', 'Published. Results arrive in your next report.'],
        FN = ['Step 1 of 3', 'Step 2 of 3', 'Step 3 of 3', 'Done'];
    flow.addEventListener('click', function(e){
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('aria-pressed')){ b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); return; }
      var n = +b.dataset.go;
      if (n === 2 && !flow.querySelector('[aria-pressed="true"]')){ flS.textContent = 'Pick at least one to carry on.'; return; }
      flow.dataset.step = n; flS.textContent = FS[n]; flN.textContent = FN[n];
    });
  }
  /* company page: the two halves of the fox meet as you scroll; press a side to single it out */
  var duo = $('duo');
  if (duo){
    var halves = $('halves');
    if (!cssScroll){
      if (!still && 'IntersectionObserver' in window) new IntersectionObserver(function(en, o){ if (en[0].isIntersecting){ halves.classList.add('met'); o.disconnect(); } }, { threshold:0.6 }).observe(halves);
      else halves.classList.add('met');
    }
    var side = function(v){ if (v) duo.dataset.on = v; else delete duo.dataset.on; };
    all('[data-side]', duo).forEach(function(el){
      el.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') side(el.dataset.side); });
      el.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') side(''); });
      el.addEventListener('click', function(e){ if (e.target.closest('a')) return; side(duo.dataset.on === el.dataset.side ? '' : el.dataset.side); });
    });
  }

  /* ---------- the one shared loop ---------- */
  var sy = -1, last = 0;
  function loop(t){
    now = t;
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    if (dirty) measure();
    var y = window.scrollY;
    if (y !== sy || force){
      if (sy >= 0 && !still) mqKick(y - sy);
      sy = y; force = false; scrollFrame(y);
    }
    if (!still){ tiltFrame(t); if (mags.length) magFrame(); curFrame(); mqFrame(dt); capFrame(t); rotFrame(t); }
    requestAnimationFrame(loop);
  }
  measure(); sy = window.scrollY; scrollFrame(sy); force = false;
  requestAnimationFrame(loop);
})();
