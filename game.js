// Geometry Dash Mini — Pro: levels, name, save progress, full screen, better hitbox
(() => {
  /* ================== SETUP =================== */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const styles = getComputedStyle(canvas);
    const w = parseInt(styles.width);
    const h = parseInt(styles.height);
    canvas.width = Math.max(600, w) * ratio;
    canvas.height = Math.max(320, h) * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    W = canvas.width / ratio; H = canvas.height / ratio;
  }
  fitCanvas();
  window.addEventListener('resize', () => { fitCanvas(); });

  // UI refs
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const pausePanel = document.getElementById('pause');
  const gameOverPanel = document.getElementById('gameOver');
  const btnStart = document.getElementById('btnStart'); // not used but left
  const btnTryAgain = document.getElementById('btnTryAgain');
  const btnToMenu = document.getElementById('btnToMenu');
  const btnTry = document.getElementById('btnTryAgain');
  const btnRestart = document.getElementById('btnRestart');
  const btnPause = document.getElementById('btnPause');
  const btnResume = document.getElementById('btnResume');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  const btnEnterName = document.getElementById('btnEnterName');
  const btnSaveName = document.getElementById('btnSaveName');
  const inputName = document.getElementById('inputName');
  const levelsDiv = document.getElementById('levels');
  const scoreSmall = document.getElementById('scoreSmall');
  const levelNameUI = document.getElementById('levelName');
  const nameDisplay = document.getElementById('nameDisplay');
  const playerNameUI = document.getElementById('playerNameUI');
  const globalBestUI = document.getElementById('globalBest');
  const progressInfo = document.getElementById('progressInfo');
  const btnMute = document.getElementById('btnMute');
  const btnFullscreen = document.getElementById('btnFullscreen');

  // state
  let W = canvas.width, H = canvas.height;
  const groundY = () => Math.floor(H * 0.78);
  let running = false, paused = false, practice = false;
  let speed = 6;
  let score = 0;
  let currentLevel = 0;
  let playerName = localStorage.getItem('gd_player_name') || '';
  nameDisplay.textContent = playerName || '—';
  inputName.value = playerName || '';

  // audio
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audio = AudioCtx ? new AudioCtx() : null;
  let muted = false;
  btnMute.addEventListener('click', () => { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; });

  function sfx(freq=600, t=0.06, type='sine') {
    if (!audio || muted) return;
    const now = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.12, now+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now+t);
    o.connect(g); g.connect(audio.destination);
    o.start(now); o.stop(now + t + 0.02);
  }

  // player
  const player = { x:0, y:0, w:44, h:44, vy:0, grounded:true, color:'#ffd166', trail:[] };
  function resetPlayer() {
    player.x = Math.floor(W * 0.12);
    player.y = groundY() - player.h;
    player.vy = 0;
    player.grounded = true;
    player.trail = [];
  }

  // obstacles and particles
  let obstacles = [];
  let particles = [];
  let spawnTimer = 0;

  /* ================== LEVELS =================== */
  // Each level: {name, speedBase, patterns: array of spawn patterns}
  // Pattern simple format: array of steps; step defines obstacle type & delay
  const LEVELS = [
    {
      id:0, name:'Tập luyện - Dễ', locked:false, speedBase:5,
      patterns:[
        { sequence: [{type:'pillar', w:28, h:60, delay:1000},{type:'gap', delay:600},{type:'pillar', w:20, h:50, delay:1000}], repeat:999 }
      ]
    },
    {
      id:1, name:'Màn 1 — Sơ cấp', locked:false, speedBase:6,
      patterns:[
        { sequence:[{type:'pillar',w:30,h:70,delay:900},{type:'pillar',w:22,h:50,delay:900},{type:'gap',delay:700}], repeat:999 }
      ]
    },
    {
      id:2, name:'Màn 2 — Trung cấp', locked:true, speedBase:7,
      patterns:[
        { sequence:[{type:'pillar',w:26,h:80,delay:800},{type:'spike',count:2,delay:700},{type:'gap',delay:600}], repeat:999 }
      ]
    },
    {
      id:3, name:'Màn 3 — Khó', locked:true, speedBase:9,
      patterns:[
        { sequence:[{type:'pillar',w:28,h:110,delay:800},{type:'spike',count:3,delay:650},{type:'pillar',w:20,h:50,delay:700}], repeat:999 }
      ]
    }
  ];

  // load saved progress
  const SAVE_KEY = 'gd_save_v1';
  let saveData = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  if (!saveData.unlocked) {
    saveData.unlocked = [0,1]; // default unlocked levels (0 = practice, 1 = first)
    saveData.best = {}; // best per level
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  function saveProgress() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  }

  // init level list UI
  function renderLevelList() {
    levelsDiv.innerHTML = '';
    LEVELS.forEach(l => {
      const unlocked = saveData.unlocked.includes(l.id);
      const item = document.createElement('div');
      item.className = 'level-item' + (unlocked ? '' : ' locked');
      item.textContent = l.name + (saveData.best && saveData.best[l.id] ? ` • Best: ${saveData.best[l.id]}` : '');
      item.onclick = () => {
        if (!unlocked) {
          alert('Màn chưa mở khoá — chơi màn trước để mở!');
          return;
        }
        startLevel(l.id);
      };
      levelsDiv.appendChild(item);
    });
    // progress info
    const unlockedCount = saveData.unlocked.length;
    progressInfo.textContent = `Progress: ${unlockedCount}/${LEVELS.length}`;
    // global best
    const bestVals = Object.values(saveData.best || {});
    const globalBest = bestVals.length ? Math.max(...bestVals) : 0;
    globalBestUI.textContent = `Best tổng: ${globalBest}`;
  }
  renderLevelList();

  /* ================== SPAWN HELPERS =================== */
  function spawnObstacleDef(def) {
    if (def.type === 'pillar') {
      const hgt = def.h || (28 + Math.random() * Math.min(140, H*0.28));
      const wdt = def.w || (18 + Math.random() * 40);
      obstacles.push({ x: W + 50, y: groundY() - hgt, w: Math.floor(wdt), h: Math.floor(hgt), type:'pillar', passed:false });
    } else if (def.type === 'spike') {
      // count spikes
      const count = def.count || 1;
      for (let i=0;i<count;i++){
        const s = 18 + Math.random()*18;
        obstacles.push({ x: W + 30 + i*(s+6), y: groundY() - s, w: Math.floor(s), h: Math.floor(s), type:'spike', passed:false });
      }
    } else if (def.type === 'gap') {
      // spawn nothing, delay handled by spawn system
    }
  }

  function emit(x,y,color,n=12) {
    for (let i=0;i<n;i++){
      particles.push({
        x,y,
        vx:(Math.random()-0.5)*6,
        vy:(Math.random()-1.5)*6,
        life: 40 + Math.random()*30,
        col: color
      });
    }
  }

  // improved hitbox with padding
  function isColliding(a,b){
    const pad = 6; // giảm hitbox nhẹ để tránh bị chết oan
    return !(
      a.x + a.w - pad < b.x ||
      a.x + pad > b.x + b.w ||
      a.y + a.h - pad < b.y ||
      a.y + pad > b.y + b.h
    );
  }

  /* ================== GAME FLOW =================== */
  function startLevel(levelId, isPractice=false) {
    currentLevel = levelId;
    practice = !!isPractice;
    score = 0;
    obstacles = [];
    particles = [];
    spawnTimer = 0;
    const L = LEVELS.find(x=>x.id===levelId);
    speed = L ? L.speedBase : 6;
    resetPlayer();
    running = true;
    paused = false;
    showHUD();
    levelNameUI.textContent = L ? L.name : 'Level';
    sfx(660,0.06,'sine');
  }

  function endRun(died=false) {
    running = false;
    if (!died) return;
    // update best
    const prevBest = saveData.best[currentLevel] || 0;
    if (score > prevBest) {
      saveData.best[currentLevel] = score;
      // unlock next if exists
      const nextId = currentLevel + 1;
      if (!saveData.unlocked.includes(nextId) && LEVELS.some(x=>x.id===nextId)) {
        saveData.unlocked.push(nextId);
      }
      saveProgress();
      renderLevelList();
    }
    // show game over UI
    document.getElementById('endScore').textContent = `Score: ${score}`;
    setTimeout(()=> showGameOver(), 200);
  }

  // UI helpers
  function showMenu() {
    menu.classList.remove('hidden');
    hud.classList.add('hidden');
    pausePanel.classList.add('hidden');
    gameOverPanel.classList.add('hidden');
  }
  function showHUD() {
    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    pausePanel.classList.add('hidden');
    gameOverPanel.classList.add('hidden');
  }
  function showPause() {
    pausePanel.classList.remove('hidden');
    hud.classList.add('hidden');
  }
  function showGameOver() {
    gameOverPanel.classList.remove('hidden');
    hud.classList.add('hidden');
  }

  // input
  function jump() {
    if (!running) {
      // if menu visible, start current unlocked first level
      if (menu.classList.contains('hidden')) return;
      startLevel(saveData.unlocked[0] || 0);
      return;
    }
    if (player.grounded) {
      player.vy = -14;
      player.grounded = false;
      sfx(880,0.08,'triangle');
      emit(player.x + player.w/2, player.y + player.h, '#ffd166', 8);
    }
  }
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); jump(); }
    if (e.code === 'KeyP') { if (running) togglePause(); }
  });
  canvas.addEventListener('mousedown', e => { jump(); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, {passive:false});

  // UI button handlers
  document.getElementById('btnTryAgain').addEventListener('click', ()=> startLevel(currentLevel));
  document.getElementById('btnToMenu').addEventListener('click', ()=> { running=false; showMenu(); });
  document.getElementById('btnRestart').addEventListener('click', ()=> startLevel(currentLevel));
  document.getElementById('btnPause').addEventListener('click', ()=> togglePause());
  document.getElementById('btnResume').addEventListener('click', ()=> { paused=false; showHUD(); });
  document.getElementById('btnBackToMenu').addEventListener('click', ()=> { running=false; showMenu(); });

  btnEnterName.addEventListener('click', ()=> {
    inputName.focus();
  });
  btnSaveName.addEventListener('click', ()=> {
    const v = inputName.value.trim().slice(0,12);
    playerName = v || 'Player';
    nameDisplay.textContent = playerName;
    localStorage.setItem('gd_player_name', playerName);
    alert('Lưu tên thành công: ' + playerName);
  });

  btnMute.addEventListener('click', ()=> { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; });

  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      canvas.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  // populate levels UI buttons with lock state and best
  renderLevelList();

  // pause toggle
  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) showPause(); else showHUD();
  }

  /* ================== GAME LOOP =================== */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - last);
    last = now;

    if (running && !paused) {
      // physics
      player.vy += 0.9 * (dt/16);
      player.y += player.vy * (dt/16);
      if (player.y + player.h >= groundY()) {
        player.y = groundY() - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      // spawn logic based on level pattern
      const lvl = LEVELS.find(x=>x.id===currentLevel) || LEVELS[0];
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        // pick current pattern's next item
        const pattern = lvl.patterns[0]; // for simplicity, we use first pattern
        const seq = pattern.sequence;
        // select a random step from sequence to simulate varied distance
        const step = seq[Math.floor(Math.random() * seq.length)];
        spawnObstacleDef(step);
        spawnTimer = (step.delay || 900) / (1 + Math.min(1.5, score/100));
      }

      // move obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        ob.x -= speed * (dt/16);
        if (!ob.passed && ob.x + ob.w < player.x) {
          ob.passed = true;
          score++;
          scoreSmall.textContent = score;
          sfx(520 + Math.min(700, score*6), 0.04, 'sine');
          // difficulty bump
          if (!practice && score % 10 === 0) speed = Math.min(22, speed + 1);
        }
        if (ob.x + ob.w < -60) obstacles.splice(i,1);
      }

      // collisions
      for (const ob of obstacles) {
        if (isColliding(player, ob)) {
          // special leniency for spike top: if player sufficiently above spike's peak, allow
          if (ob.type === 'spike' && player.y + player.h <= ob.y + 6) {
            // pass
          } else {
            // died
            emit(player.x + player.w/2, player.y + player.h/2, '#ff7a18', 26);
            sfx(120, 0.18, 'sawtooth');
            endRun(true);
            break;
          }
        }
      }

      // particles physics
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * (dt/16);
        p.y += p.vy * (dt/16);
        p.vy += 0.22 * (dt/16);
        p.life -= dt;
        if (p.life <= 0) particles.splice(i,1);
      }

      // trail
      if (running) {
        player.trail.unshift({ x: player.x, y: player.y, t: 30 });
        if (player.trail.length > 12) player.trail.pop();
      }
    }

    render(now);
    requestAnimationFrame(loop);
  }

  function render(now) {
    // clear
    ctx.clearRect(0,0,W,H);

    // background gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#03203a'); g.addColorStop(1,'#05111c');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // parallax blobs
    ctx.save(); ctx.globalAlpha = 0.08;
    for (let i=0;i<6;i++){
      const px = ((now/12) + i*220) % (W+300) - 150;
      const py = 60 + (i%3)*40;
      ctx.beginPath(); ctx.ellipse(px, py, 120, 40, 0,0,Math.PI*2);
      ctx.fillStyle = '#0e3a56'; ctx.fill();
    }
    ctx.restore();

    // ground
    const gy = groundY();
    ctx.fillStyle = '#071827'; ctx.fillRect(0, gy, W, H-gy);

    // midground stripes
    ctx.save(); ctx.globalAlpha = 0.12;
    for (let i=-2;i<8;i++){
      ctx.fillRect((i*300 + ((now/12) % 300)) % (W+320) - 160, gy - 44, 200, 12);
    }
    ctx.restore();

    // obstacles
    for (const ob of obstacles){
      if (ob.type === 'pillar'){
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ob.x + 4, ob.y + 8, Math.min(12, ob.w-8), ob.h - 12);
      } else {
        // spike triangle
        ctx.save();
        ctx.translate(ob.x + ob.w/2, ob.y + ob.h/2);
        ctx.beginPath();
        ctx.moveTo(-ob.w/2, ob.h/2); ctx.lineTo(0, -ob.h/2); ctx.lineTo(ob.w/2, ob.h/2);
        ctx.closePath(); ctx.fillStyle = '#ff6b6b'; ctx.fill();
        ctx.restore();
      }
    }

    // particles
    for (const p of particles){
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 70));
      ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1;
    }

    // player trail
    for (let i = 0; i < player.trail.length; i++){
      const t = player.trail[i];
      const alpha = 0.6 * (1 - i / player.trail.length);
      ctx.fillStyle = `rgba(255,209,102,${alpha})`;
      ctx.fillRect(t.x - i*1.5, t.y + i*1.2, player.w * (0.9 - i*0.02), player.h * (0.9 - i*0.02));
    }

    // player
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 12;
    ctx.fillStyle = player.color; roundRect(ctx, player.x, player.y, player.w, player.h, 6); ctx.fill();
    ctx.restore();

    // overlay HUD text
    ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(W - 160, 14, 148, 36);
    ctx.fillStyle = '#e6eef6'; ctx.font = '600 14px Inter, system-ui';
    ctx.fillText(`Score: ${score}`, W - 140, 36);

    // update small UI values
    scoreSmall.textContent = score;
    // save best display
    const lvlBest = saveData.best[currentLevel] || 0;
    // update name
    nameDisplay.textContent = playerName || '—';
  }

  // rounded rect helper
  function roundRect(ctx, x, y, w, h, r){
    if (w < 2*r) r = w/2; if (h < 2*r) r = h/2;
    ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  // initial setup
  resetPlayer();
  showMenu();
  requestAnimationFrame(loop);

  // expose API (for console tinkering)
  window.GDPRO = {
    startLevel: startLevel,
    getSave: () => JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'),
    resetSave: () => { localStorage.removeItem(SAVE_KEY); location.reload(); }
  };

})();
