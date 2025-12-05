function saveName() {
    const name = document.getElementById("playerName").value;
    localStorage.setItem("playerName", name);
    alert("Đã lưu tên!");
}

function playLevel(level) {
    localStorage.setItem("currentLevel", level);
    window.location.href = `level${level}.html`;
}

window.onload = () => {
    const savedLevel = localStorage.getItem("currentLevel") || 1;
    document.getElementById("progressText").innerText =
        "Bạn đã mở tới màn: " + savedLevel;
};
