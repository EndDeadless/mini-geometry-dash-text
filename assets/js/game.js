// Simple but robust Geometry Dash-like engine
ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(x, height-120, 80,120);
}


// ground
ctx.fillStyle = '#0f1724'; ctx.fillRect(0, height - level.groundHeight, width, level.groundHeight);


// draw obstacles
for(let ob of obstacles){
ctx.fillStyle = ob.color||'#ff4d6d'; ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
// subtle shadow
ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ob.x, ob.y+ob.h-6, ob.w, 6);
}


// player
ctx.save();
ctx.translate(player.x + player.size/2, player.y + player.size/2);
let rot = Math.min(0.3, player.vy/30);
ctx.rotate(rot);
ctx.fillStyle = '#ffd166'; ctx.fillRect(-player.size/2, -player.size/2, player.size, player.size);
ctx.restore();


// particles
for(let p of particles){ ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(p.x, p.y, 3,3); }


// HUD
ctx.fillStyle='#fff'; ctx.font='18px sans-serif'; ctx.fillText('Score: '+Math.floor(score), 12, 26);
}


function loop(ts){
if(!lastTs) lastTs = ts; let dt = ts-lastTs; lastTs=ts;
if(running){ update(dt); render(); }
requestAnimationFrame(loop);
}


function start(){
running = true; lastTs=0; score=0;
if(musicEl && musicEl.src) musicEl.play().catch(()=>{});
requestAnimationFrame(loop);
}
function stop(){ running=false; if(musicEl) musicEl.pause(); }


function saveProgress(passed){
// Save locally and try to save to cloud via firebase helper (auth.js)
const local = JSON.parse(localStorage.getItem('dash_progress')||'{}');
local[saveKey] = {best: Math.max(local[saveKey]?.best||0, Math.floor(score)), updated: Date.now()};
localStorage.setItem('dash_progress', JSON.stringify(local));
if(window.Auth && Auth.currentUser) {
Auth.saveProgress(saveKey, local[saveKey]);
}
}


return { init, start, stop };
})();
