const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Nhân vật
let player = {
    x: 50,
    y: 250,
    size: 30,
    dy: 0,
    gravity: 0.6,
    jumpForce: -12,
    onGround: true
};

// Chướng ngại vật
let obstacles = [];
function spawnObstacle() {
    obstacles.push({
        x: 800,
        y: 260,
        width: 20,
        height: 40
    });
}
setInterval(spawnObstacle, 1500);

// Nhảy
document.addEventListener("keydown", () => {
    if (player.onGround) {
        player.dy = player.jumpForce;
        player.onGround = false;
    }
});

// Game loop
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player
    player.dy += player.gravity;
    player.y += player.dy;
    if (player.y >= 250) {
        player.y = 250;
        player.dy = 0;
        player.onGround = true;
    }

    ctx.fillStyle = "cyan";
    ctx.fillRect(player.x, player.y, player.size, player.size);

    // Obstacles
    ctx.fillStyle = "red";
    for (let obs of obstacles) {
        obs.x -= 5;

        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Va chạm
        if (
            player.x < obs.x + obs.width &&
            player.x + player.size > obs.x &&
            player.y < obs.y + obs.height
        ) {
            alert("Thua rồi bro!");
            document.location.reload();
        }
    }

    requestAnimationFrame(update);
}
update();
