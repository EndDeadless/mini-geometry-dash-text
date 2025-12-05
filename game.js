// game.js — shared engine
(() => {
  // CONFIG: you can edit these maps below if want
  const LEVELS = {
    1: {
      name: 'Level 1 — Easy Run',
      color: '#4ade80',
      speedBase: 6,
      // obstacle positions (x offset from spawn baseline); engine will spawn moving obstacles
      pattern: [400, 800, 1200, 1700, 2200]
    },
    2: {
      name: 'Level 2 — Spike Hell',
      color: '#60a5fa',
      speedBase: 8,
      pattern: [300, 560, 820, 1040, 1280, 1540, 1840]
    },
    3: {
      name: 'Level 3 — Ultra Dash',
      color: '#f87171',
      speedBase: 10,
      pattern: [220, 420, 640, 860, 1080, 1320, 1560, 1820, 2060, 2320]
    }
  };

  // read LEVEL_ID set by level pages
  const LEVEL_ID = window.LEVEL_ID || 1;
  const LEVEL = LEVELS[LEVEL_ID] || LEVELS[1];

  // DOM
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  document.documentElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // full-screen sizing
  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    canvas.width = Math.max(600, vw * dpr);
    canvas.height = Math.max(320, vh * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W = canvas.width / dpr;
    H = canvas.height / dpr;
  }
  let W=800,H=450;
  fit();
  window.addEventListener('resize', fit);

  // UI overlay
  const topPanel = document.createElement('div');
  topPanel.className = 'panelTop';
  topPanel.innerHTML = `<strong>${LEVEL.name}</strong> &nbsp; <span id="playerDisplay"></span> &nbsp; <button id="btnMute" class="smallBtn">🔊</button> <button id="btnBack" class="smallBtn">🏠</button>`;
  document.body.appendChild(topPanel);
  const playerDisplay = document.getElementById('playerDisplay');
  const btnMute = document.getElementById('btnMute');
  const btnBack = document.getElementById('btnBack');

  btnBack.addEventListener('click', ()=> location.href = 'index.html');

  // sound
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audio = AudioCtx ? new AudioCtx() : null;
  let muted = false;
  btnMute.addEventListener('click', ()=> { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; });

  function sfx(freq=600,t=0.06,type='sine'){ if(!audio||muted) return; const now = audio.currentTime; const o = audio.createOscillator(); const g = audio.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.12, now+0.005); g.gain.exponentialRampToValueAtTime(0.0001, now+t); o.connect(g); g.connect(audio.destination); o.start(now); o.stop(now+t+0.02); }

  // player (auto-run): x fixed, world moves left
  const player = { x: 140, y:0, w:44, h:44, vy:0, grounded:true, color:'#ffd166' };

  function resetPlayer(){
    player.y = groundY() - player.h;
    player.vy = 0;
    player.grounded = true;
    player.trail = [];
  }

  function groundY(){ return Math.floor(H * 0.78); }

  // obstacles array
  let obstacles = [];
  let parts = [];
  // engine meta
  let speed = LEVEL.speedBase;
  let score = 0;
  let lastTime = performance.now();
  let running = true;

  // progress & save
  const SAVE_KEY = 'gd_mini_save_v1';
  let save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if(!save.unlocked){ save.unlocked = [1]; save.best = {}; localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  const playerName = localStorage.getItem('gd_mini_name') || 'Player';
  playerDisplay.textContent = `Player: ${playerName}`;

  // build obstacles from LEVEL.pattern — spawn with offset
  function initLevel(){
    obstacles = [];
    score = 0;
    speed = LEVEL.speedBase;
    // we push obstacle objects with x relative to viewport
    for(const px of LEVEL.pattern){
      // randomize type: pillar or spike
      if(Math.random() < 0.28){
        // spike cluster
        const count = 1 + Math.floor(Math.random()*2);
        for(let i=0;i<count;i++){
          const s = 18 + Math.random()*18;
          obstacles.push({ x: W + px + i*(s+6), y: groundY() - s, w: s, h: s, type:'spike', passed:false });
        }
      } else {
        const h = 38 + Math.random()* (Math.min(140, H*0.28));
        const w = 18 + Math.random()*40;
        obstacles.push({ x: W + px, y: groundY() - h, w: w, h: h, type:'pillar', passed:false });
      }
    }
    resetPlayer();
  }

  // input: space / click / touch => jump
  function doJump(){
    if(player.grounded){
      player.vy = -14;
      player.grounded = false;
      sfx(880,0.08,'triangle');
      emit(player.x + player.w/2, player.y + player.h, '#ffd166', 10);
    }
  }
  window.addEventListener('keydown', e => { if(e.code === 'Space'){ e.preventDefault(); doJump(); } });
  canvas.addEventListener('mousedown', doJump);
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); doJump(); }, {passive:false});

  // particles
  function emit(x,y,col,n=12){
    for(let i=0;i<n;i++){
      parts.push({ x,y, vx:(Math.random()-0.5)*6, vy:(Math.random()-1.5)*6, life: 40 + Math.random()*30, col });
    }
  }

  // collision with padding
  function isColliding(a,b){
    const pad = 6;
    return !(
      a.x + a.w - pad < b.x ||
      a.x + pad > b.x + b.w ||
      a.y + a.h - pad < b.y ||
      a.y + pad > b.y + b.h
    );
  }

  // game loop
  function loop(now){
    const dt = Math.min(40, now - lastTime);
    lastTime = now;

    // physics
    if(running){
      player.vy += 0.9 * (dt/16);
      player.y += player.vy * (dt/16);
      if(player.y + player.h >= groundY()){
        player.y = groundY() - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      // move obstacles left (world moves)
      for(let i = obstacles.length-1; i>=0; i--){
        const ob = obstacles[i];
        ob.x -= speed * (dt/16);
        // scoring when passed
        if(!ob.passed && ob.x + ob.w < player.x){
          ob.passed = true;
          score++;
          sfx(520 + Math.min(700, score*6), 0.03, 'sine');
          // small difficulty bump
          if(score % 8 === 0) speed = Math.min(22, speed + 1);
        }
        if(ob.x + ob.w < -80) obstacles.splice(i,1);
      }

      // particle physics
      for(let i = parts.length-1; i>=0; i--){
        const p = parts[i];
        p.x += p.vx * (dt/16);
        p.y += p.vy * (dt/16);
        p.vy += 0.22 * (dt/16);
        p.life -= dt;
        if(p.life <= 0) parts.splice(i,1);
      }

      // collision checks
      for(const ob of obstacles){
        // allow tiny leniency for spike top
        if(isColliding(player, ob)){
          if(ob.type === 'spike' && player.y + player.h <= ob.y + 6){
            // landed on spike top — allow
          } else {
            // died
            emit(player.x + player.w/2, player.y + player.h/2, '#ff7a18', 26);
            sfx(140, 0.16, 'sawtooth');
            onDeath();
            running = false;
            break;
          }
        }
      }

      // player trail
      player.trail = player.trail || [];
      player.trail.unshift({ x: player.x, y: player.y, t: 30 });
      if(player.trail.length > 12) player.trail.pop();
    }

    render();
    requestAnimationFrame(loop);
  }

  // render
  function render(){
    // clear
    ctx.clearRect(0,0,W,H);

    // background gradient
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#03203a'); grad.addColorStop(1,'#05111c');
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    // parallax blobs
    ctx.save(); ctx.globalAlpha = 0.08;
    for(let i=0;i<6;i++){
      const px = ((performance.now()/12) + i*220) % (W+300) - 150;
      const py = 60 + (i%3)*40;
      ctx.beginPath(); ctx.ellipse(px, py, 120, 40, 0,0,Math.PI*2);
      ctx.fillStyle = '#0e3a56'; ctx.fill();
    }
    ctx.restore();

    // ground
    const gy = groundY();
    ctx.fillStyle = '#071827'; ctx.fillRect(0, gy, W, H-gy);

    // obstacles
    for(const ob of obstacles){
      if(ob.type === 'pillar'){
        // shadow & body
        ctx.fillStyle = '#081018';
        ctx.fillRect(ob.x, ob.y + 6, ob.w, ob.h);
        const g = ctx.createLinearGradient(0,ob.y,0,ob.y+ob.h);
        g.addColorStop(0, LEVEL.color); g.addColorStop(1, '#c02626');
        ctx.fillStyle = g;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ob.x + 4, ob.y + 8, Math.min(12, ob.w-8), ob.h - 12);
      } else {
        // spike
        ctx.save();
        ctx.translate(ob.x + ob.w/2, ob.y + ob.h/2);
        ctx.beginPath();
        ctx.moveTo(-ob.w/2, ob.h/2); ctx.lineTo(0, -ob.h/2); ctx.lineTo(ob.w/2, ob.h/2);
        ctx.closePath(); ctx.fillStyle = '#ff6b6b'; ctx.fill();
        ctx.restore();
      }
    }

    // particles
    for(const p of parts){
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 70));
      ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1;
    }

    // player trail
    for(let i=0;i< (player.trail||[]).length; i++){
      const t = player.trail[i];
      const a = 0.6 * (1 - i / player.trail.length);
      ctx.fillStyle = `rgba(255,209,102,${a})`;
      ctx.fillRect(t.x - i*1.5, t.y + i*1.2, player.w * (0.9 - i*0.02), player.h * (0.9 - i*0.02));
    }

    // player
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 12;
    ctx.fillStyle = player.color; roundRect(ctx, player.x, player.y, player.w, player.h, 6); ctx.fill();
    ctx.restore();

    // HUD small
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(W - 160, 14, 148, 36);
    ctx.fillStyle = '#e6eef6'; ctx.font = '600 14px Inter, system-ui';
    ctx.fillText(`Score: ${score}`, W - 140, 36);
  }

  function roundRect(ctx,x,y,w,h,r){
    if(w<2*r) r = w/2; if(h<2*r) r = h/2;
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  // death handling
  function onDeath(){
    // save best if > previous
    const SAVE = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    SAVE.best = SAVE.best || {};
    const prev = SAVE.best[LEVEL_ID] || 0;
    if(score > prev) {
      SAVE.best[LEVEL_ID] = score;
      // unlock next level
      const next = LEVEL_ID + 1;
      SAVE.unlocked = SAVE.unlocked || [1];
      if(!SAVE.unlocked.includes(next) && LEVELS[next]) SAVE.unlocked.push(next);
      localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE));
    }
    // show a simple overlay
    setTimeout(()=> {
      alert('Thua rồi — Score: ' + score);
      // go back to menu
      location.href = 'index.html';
    }, 200);
  }

  // spawn more obstacles dynamically if array empty (safety)
  function refillIfNeeded(){
    if(obstacles.length < 2){
      // spawn few random based on pattern
      const base = W + 600;
      const k = LEVEL.pattern;
      for(const off of k){
        const kind = Math.random() < 0.28 ? 'spike' : 'pillar';
        if(kind === 'spike'){
          const s = 18 + Math.random()*18;
          obstacles.push({ x: base + off, y: groundY()-s, w: s, h: s, type:'spike', passed:false });
        } else {
          const h = 38 + Math.random()* (Math.min(140, H*0.28));
          const w = 18 + Math.random()*40;
          obstacles.push({ x: base + off, y: groundY()-h, w:w, h:h, type:'pillar', passed:false });
        }
      }
    }
  }

  // init & start
  initLevel();
  refillIfNeeded();
  requestAnimationFrame(loop);

  // helpers: expose for debugging
  window.GD = { LEVEL_ID, getSave: ()=> JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') };

})();
