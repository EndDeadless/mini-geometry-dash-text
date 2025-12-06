// =====================
// GEOMETRY DASH LEVEL 1
// =====================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// Player
const player = {
  x: 120,
  y: 0,
  size: 40,
  vy: 0,
  grounded: false
};

// Game constants
const GRAVITY = 0.9;
const JUMP = -16;
const SPEED = 6;
const GROUND = () => canvas.height - 80;

// Obstacles
let obstacles = [];
let frame = 0;
let running = true;

// Controls
window.addEventListener("keydown", e => {
  if(e.code === "Space" && player.grounded){
    player.vy = JUMP;
    player.grounded = false;
  }
});

// Spawn obstacle
function spawnObstacle(){
  obstacles.push({
    x: canvas.width,
    width: 40,
    height: 50
  });
}

// Collision check
function hit(a, b){
  return (
    a.x < b.x + b.width &&
    a.x + a.size > b.x &&
    a.y < b.y + b.height &&
    a.y + a.size > b.y
  );
}

// Game loop
function update(){
  if(!running) return;

  frame++;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Ground
  ctx.fillStyle = "#111";
  ctx.fillRect(0, GROUND() + 40, canvas.width, 40);

  // Player physics
  player.vy += GRAVITY;
  player.y += player.vy;

  if(player.y >= GROUND()){
    player.y = GROUND();
    player.vy = 0;
    player.grounded = true;
  }

  // Draw player
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(player.x, player.y, player.size, player.size);

  // Spawn obstacles
  if(frame % 120 === 0){
    spawnObstacle();
  }

  // Draw obstacles
  obstacles.forEach((o,i)=>{
    o.x -= SPEED;
    ctx.fillStyle = "#ff0055";
    ctx.fillRect(o.x, GROUND()+40-o.height, o.width, o.height);

    if(hit(player,{
      x:o.x,
      y:GROUND()+40-o.height,
      width:o.width,
      height:o.height
    })){
      running = false;
      setTimeout(()=>alert("❌ GAME OVER – LEVEL 1"),50);
    }

    if(o.x + o.width < 0){
      obstacles.splice(i,1);
    }
  });

  requestAnimationFrame(update);
}

// Start game
player.y = GROUND();
requestAnimationFrame(update);
