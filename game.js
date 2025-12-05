// Geometry Dash Mini — Upgraded visuals + effects
(() => {
  // --- canvas setup ---
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function fit() {
    const ratio = window.devicePixelRatio || 1;
    const styles = getComputedStyle(canvas);
    const w = parseInt(styles.width);
    const h = parseInt(styles.height);
    canvas.width = Math.max(600, w) * ratio;
    canvas.height = Math.max(320, h) * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  fit();
  window.addEventListener('resize', () => { fit(); resizeGame(); });

  // --- UI refs ---
  const overlay = document.getElementById('overlay');
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const gameOver = document.getElementById('gameOver');
  const btnStart = document.getElementById('btnStart');
  const btnPractice = document.getElementById('btnPractice');
  const btnRetry = document.getElementById('btnRetry');
  const btnBack = document.getElementById('btnBack');
  const btnRestart = document.getElementById('btnRestart');
  const btnMute = document.getElementById('btnMute');
  const bestUI = document.getElementById('bestUI');
  const scoreSmall = document.getElementById('scoreSmall');
  const endScore = document.getElementById('endScore');

  // --- state ---
  let W = canvas.width / (window.devicePixelRatio || 1);
  let H = canvas.height / (window.devicePixelRatio || 1);
  function resizeGame(){ W = canvas.width / (window.devicePixelRatio || 1); H = canvas.height / (window.devicePixelRatio || 1); }
  resizeGame();

  const groundY = () => Math.floor(H * 0.78);
  let running = false, practice = false;
  let speed = 6;
  let score = 0;
  let best = parseInt(localStorage.getItem('gd_best_v2') || '0', 10);
  bestUI.textContent = `Best: ${best}`;
  scoreSmall.textContent = score;

  // audio
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audio = AudioCtx ? new AudioCtx() : null;
  let muted = false;
  btnMute.addEventListener('click', () => { muted = !muted; btnMute.textContent = muted ? '🔇' : '🔊'; });

  function sfx(freq=600, t=0.06, type='sine'){
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

  // --- player ---
  const player = {
    x: 0, y:0, w:40, h:40, vy:0, grounded:true, color:'#ffd166', trail: []
  };

  function resetPlayer() {
    player.x = Math.floor(W * 0.12);
    player.y = groundY() - player.h;
    player.vy = 0;
    player.grounded = true;
    player.trail = [];
  }

  // obstacles: array of {x,y,w,h,type}
  let obstacles = [];
  let spawnTimer = 0;

  function spawnObstacle() {
    const type = Math.random() < 0.35 ? 'spike' : 'pillar';
    if (type === 'pillar') {
      const hgt = 28 + Math.random() * Math.min(140, H*0.28);
      const wdt = 18 + Math.random() * 42;
      obstacles.push({ x: W + 50, y: groundY() - hgt, w: Math.floor(wdt), h: Math.floor(hgt), type });
    } else {
      // spike cluster (triangles)
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i=0;i<count;i++){
        const s = 18 + Math.random()*18;
        obstacles.push({ x: W + 30 + i*(s+4), y: groundY() - s, w: Math.floor(s), h: Math.floor(s), type:'spike' });
      }
    }
  }

  // particles
  const particles = [];
  function emit(x,y,color,n=12){
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

  // collision
  function rectsCollide(a,b){
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  // controls
  function jump(){
    if (!running) { startGame(practice); return; }
    if (player.grounded){
      player.vy = -14;
      player.grounded = false;
      sfx(880,0.08,'triangle');
      // small pop
      emit(player.x + player.w/2, player.y + player.h, '#ffd166', 8);
    }
  }
  window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); jump(); } });
  canvas.addEventListener('mousedown', (e) => { jump(); });
  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); jump(); }, {passive:false});

  // UI buttons
  btnStart.addEventListener('click', ()=> startGame(false));
  btnPractice.addEventListener('click', ()=> startGame(true));
  btnRetry.addEventListener('click', ()=> startGame(false));
  btnBack.addEventListener('click', ()=> showMenu());
  btnRestart.addEventListener('click', ()=> startGame(false));

  function showMenu(){
    running=false;
    menu.classList.remove('hidden');
    hud.classList.add('hidden');
    gameOver.classList.add('hidden');
  }
  function showHUD(){
    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    gameOver.classList.add('hidden');
  }
  function showGameOver(){
    gameOver.classList.remove('hidden');
    hud.classList.add('hidden');
    menu.classList.add('hidden');
    endScore.textContent = `Score: ${score}`;
  }

  // game reset
  function resetAll(){
    obstacles = [];
    particles.length = 0;
    spawnTimer = 0;
    score = 0;
    speed = Math.max(5, Math.floor(W/140));
    scoreSmall.textContent = score;
    bestUI.textContent = `Best: ${best}`;
    resetPlayer();
  }

  // start
  function startGame(isPractice=false){
    practice = !!isPractice;
    resetAll();
    running = true;
    showHUD();
    sfx(660,0.06,'sine');
  }

  // --- background parallax layers ---
  let tStart = performance.now();
  function drawBackground(now){
    const t = (now - tStart)/1000;
    // gradient sky
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, '#03203a');
    g.addColorStop(1, '#05111c');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // moving blobs (parallax)
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i=0;i<6;i++){
      const px = ((t*30) + i*230) % (W+300) - 150;
      const py = 60 + (i%3)*40;
      ctx.beginPath();
      ctx.ellipse(px, py, 120, 40, 0, 0, Math.PI*2);
      ctx.fillStyle = '#0e3a56';
      ctx.fill();
    }
    ctx.restore();

    // thin horizon stripes
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i=0;i<10;i++){
      ctx.fillRect((i*120 + (t*40 % 120)) % (W+140) - 40, H*0.65 + (i%3)*6, 60, 2);
    }
    ctx.restore();
  }

  // --- render loop ---
  let last = performance.now();
  function loop(now){
    const dt = Math.min(40, now - last);
    last = now;

    // physics + game logic
    if (running){
      // player physics
      player.vy += 0.9 * (dt/16);
      player.y += player.vy * (dt/16);
      if (player.y + player.h >= groundY()){
        player.y = groundY() - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      // spawn obstacles
      spawnTimer -= dt;
      if (spawnTimer <= 0){
        spawnTimer = 700 + Math.random()*900 - Math.min(400, score*6);
        spawnObstacle();
      }

      // move obstacles and scoring
      for (let i = obstacles.length - 1; i >= 0; i--){
        const ob = obstacles[i];
        ob.x -= speed * (dt/16);
        if (!ob.passed && ob.x + ob.w < player.x){
          ob.passed = true;
          score++;
          scoreSmall.textContent = score;
          sfx(520 + Math.min(700, score*6), 0.04, 'sine');
          // small speed bump
          if (!practice && score % 8 === 0) speed = Math.min(20, speed + 1);
        }
        if (ob.x + ob.w < -60) obstacles.splice(i,1);
      }

      // collisions
      for (const ob of obstacles){
        // better collision for spikes (we'll approximate)
        if (rectsCollide(player, ob)){
          // if spike, allow a tiny leniency for top-of-spike
          if (ob.type === 'spike' && player.y + player.h <= ob.y + 6) {
            // pass (jumped on spike top)
          } else {
            // game over
            running = false;
            emit(player.x + player.w/2, player.y + player.h/2, '#ff7a18', 26);
            sfx(140, 0.16, 'sawtooth');
            // update best
            if (score > best) {
              best = score;
              localStorage.setItem('gd_best_v2', best);
            }
            bestUI.textContent = `Best: ${best}`;
            setTimeout(()=> showGameOver(), 200);
          }
        }
      }

      // particles update
      for (let i = particles.length - 1; i >= 0; i--){
        const p = particles[i];
        p.x += p.vx * (dt/16);
        p.y += p.vy * (dt/16);
        p.vy += 0.22 * (dt/16);
        p.life -= dt;
        if (p.life <= 0) particles.splice(i,1);
      }
    }

    // render everything
    render(now);

    requestAnimationFrame(loop);
  }

  function render(now){
    // clear
    ctx.clearRect(0,0,W,H);

    // background
    drawBackground(now);

    // ground
    const gy = groundY();
    ctx.fillStyle = '#071827';
    ctx.fillRect(0, gy, W, H - gy);

    // draw moving midground stripes
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = -2; i < 8; i++){
      ctx.fillRect((i*300 + ((now/12) % 300)) % (W+320) - 160, gy - 44, 200, 12);
    }
    ctx.restore();

    // obstacles
    for (const ob of obstacles){
      if (ob.type === 'pillar'){
        // shadow
        ctx.fillStyle = '#081018';
        ctx.fillRect(ob.x, ob.y + 6, ob.w, ob.h);
        // body
        const grad = ctx.createLinearGradient(0, ob.y, 0, ob.y + ob.h);
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(1, '#c02626');
        ctx.fillStyle = grad;
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(ob.x + 4, ob.y + 6, Math.min(12, ob.w-8), ob.h - 12);
      } else {
        // spike = triangle
        ctx.save();
        ctx.translate(ob.x + ob.w/2, ob.y + ob.h/2);
        ctx.beginPath();
        ctx.moveTo(-ob.w/2, ob.h/2);
        ctx.lineTo(0, -ob.h/2);
        ctx.lineTo(ob.w/2, ob.h/2);
        ctx.closePath();
        ctx.fillStyle = '#ff6b6b';
        ctx.fill();
        ctx.restore();
      }
    }

    // player trail
    for (let i = player.trail.length - 1; i >= 0; i--){
      const t = player.trail[i];
      const alpha = 0.6 * (i / player.trail.length);
      ctx.fillStyle = `rgba(255,209,102,${alpha})`;
      ctx.fillRect(t.x, t.y, player.w * (0.9 - i*0.02), player.h * (0.9 - i*0.02));
    }

    // player (rounded square)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = player.color;
    roundRect(ctx, player.x, player.y, player.w, player.h, 6);
    ctx.fill();
    ctx.restore();

    // small particle pops
    for (const p of particles){
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 70));
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1;
    }

    // top-right score overlay
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(W - 132, 14, 120, 36);
    ctx.fillStyle = '#e6eef6';
    ctx.font = '600 14px Inter, system-ui';
    ctx.fillText(`Score: ${score}`, W - 120, 36);
  }

  // helper to draw rounded rect
  function roundRect(ctx, x, y, w, h, r){
    if (w < 2*r) r = w/2;
    if (h < 2*r) r = h/2;
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  // initial values
  resetPlayer();
  showMenu();

  // small trail update (visual)
  setInterval(() => {
    if (!running) return;
    player.trail.unshift({ x: player.x, y: player.y });
    if (player.trail.length > 10) player.trail.pop();
  }, 45);

  // resize-ish adjust
  function adjustForSize(){
    // reposition UI depending on canvas size (no-op mostly)
  }

  // start the animation loop
  requestAnimationFrame(loop);

  // helper: API to start externally
  window.__GD = {
    start: startGame,
    stop: () => { running=false; },
  };

})();
