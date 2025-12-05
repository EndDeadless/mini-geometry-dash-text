const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// PLAYER
let player = {
    x: 100,
    y: canvas.height - 120,
    size: 50,
    dy: 0,
    gravity: 0.7,
    jump: -14,
    onGround: true
};

// OBSTACLES
let obstacles = [];
let speed = 8;

function spawnObstacle() {
    obstacles.push({
        x: canvas.width + 50,
        y: canvas.height - 100,
        width: 40,
        height: 80
    });
}

setInterval(spawnObstacle, 1200);

document.addEventListener("keydown", () => {
    if (player.onGround) {
        player.dy = player.jump;
        player.onGround = false;
    }
});

// Collision Fix (nhảy qua không bị chết oan)
function isColliding(a, b) {
    const pad = 8;
    return !(
        a.x + a.size - pad < b.x ||
        a.x + pad > b.x + b.width ||
        a.y + a.size - pad < b.y ||
        a.y + pad > b.y + b.height
    );
}

function gameOver() {
    alert("💀 Thua rồi! Nhấn OK để chơi lại.");
    location.reload();
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player physics
    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y + player.size >= canvas.height - 50) {
        player.y = canvas.height - 50 - player.size;
        player.onGround = true;
        player.dy = 0;
    }

    // Draw Player
    ctx.fillStyle = "#00eaff";
    ctx.fillRect(player.x, player.y, player.size, player.size);

    // Obstacles
    obstacles.forEach((ob, i) => {
        ob.x -= speed;

        ctx.fillStyle = "#ff006a";
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);

        if (isColliding(player, ob)) {
            gameOver();
        }

        if (ob.x + ob.width < 0) {
            obstacles.splice(i, 1);
        }
    });

    requestAnimationFrame(update);
}

update();
