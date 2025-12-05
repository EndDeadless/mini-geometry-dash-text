const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 300;

let player = {
    x: 80,
    y: 230,
    width: 40,
    height: 40,
    color: "#00eaff",
    dy: 0,
    jumpPower: -12,
    gravity: 0.6,
    onGround: true
};

let obstacles = [];
let speed = 5;

function spawnObstacle() {
    obstacles.push({
        x: canvas.width + 50,
        y: 240,
        width: 30,
        height: 60,
        color: "#ff006a"
    });
}

setInterval(spawnObstacle, 1200);

document.addEventListener("keydown", () => {
    if (player.onGround) {
        player.dy = player.jumpPower;
        player.onGround = false;
    }
});

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player physics
    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y >= 230) {
        player.y = 230;
        player.dy = 0;
        player.onGround = true;
    }

    // Obstacles
    obstacles.forEach((obs, i) => {
        obs.x -= speed;

        // remove if off screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }

        // collision
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height
        ) {
            alert("💀 Game Over! Reload để chơi lại!");
            document.location.reload();
        }

        // Draw obstacle (glowing)
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Draw player (glowing)
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 25;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    requestAnimationFrame(update);
}

update();
