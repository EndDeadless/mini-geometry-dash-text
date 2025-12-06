// Level 1 configuration (Easy)
const Level1 = {
  id: 1,
  name: "Easy",
  gravity: 0.9,
  speed: 4,
  spawnInterval: 1400, // ms between obstacles
  patterns: [
    // pattern: array of {w,h,gap,delay}
    [{w:40,h:40,gap:220,delay:0}],
    [{w:30,h:50,gap:200,delay:0},{w:30,h:50,gap:120,delay:450}],
  ],
  backgroundColor: "#4b5563"
};
