const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let myId = null;
let joined = false;

const idle = new Image();
idle.src = "https://raw.githubusercontent.com/jergan-studio/jerganese/refs/heads/main/A.ico";

const walk1 = new Image();
walk1.src = "https://raw.githubusercontent.com/jergan-studio/jerganese/refs/heads/main/B.ico";

const walk2 = new Image();
walk2.src = "https://raw.githubusercontent.com/jergan-studio/jerganese/refs/heads/main/C.ico";

let keys = {};
let animFrame = 0;
let walking = false;

// 🌍 World settings
const worldWidth = 2000;
const worldHeight = 2000;

let camera = {
  x: 0,
  y: 0
};

function joinGame() {
  const name = document.getElementById("nameInput").value.trim();
  if (name.length < 2) return alert("Name too short");

  socket.emit("setName", name);
  document.getElementById("namePrompt").style.display = "none";
  joined = true;
}

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

socket.on("currentPlayers", (serverPlayers) => {
  players = serverPlayers;
  myId = socket.id;
});

socket.on("newPlayer", (data) => {
  players[data.id] = data.player;
});

socket.on("playerMoved", (data) => {
  players[data.id] = data.player;
});

socket.on("playerDisconnected", (id) => {
  delete players[id];
});

socket.on("playerCount", (count) => {
  document.getElementById("playerCount").textContent =
    "Players Online: " + count;
});

socket.on("chat", (data) => {
  const msg = document.createElement("div");
  msg.textContent = `${data.name}: ${data.message}`;
  document.getElementById("messages").appendChild(msg);
});

document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && joined) {
    socket.emit("chat", e.target.value);
    e.target.value = "";
  }
});

function update() {
  if (!joined || !players[myId]) return;

  let player = players[myId];
  walking = false;

  const speed = 4;

  if (keys["w"]) { player.y -= speed; walking = true; }
  if (keys["s"]) { player.y += speed; walking = true; }
  if (keys["a"]) { player.x -= speed; walking = true; }
  if (keys["d"]) { player.x += speed; walking = true; }

  // Keep inside world bounds
  player.x = Math.max(0, Math.min(worldWidth, player.x));
  player.y = Math.max(0, Math.min(worldHeight, player.y));

  socket.emit("move", player);

  if (walking) animFrame += 0.2;
  else animFrame = 0;

  // 🎥 Camera follows player smoothly
  camera.x += ((player.x - canvas.width / 2) - camera.x) * 0.1;
  camera.y += ((player.y - canvas.height / 2) - camera.y) * 0.1;
}

function drawWorld() {
  // 🌱 Green grass background
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // 🏢 Simple building
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(800, 800, 300, 200);

  ctx.fillStyle = "#444";
  ctx.fillRect(900, 860, 100, 140);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWorld();

  for (let id in players) {
    let p = players[id];

    let sprite = idle;

    if (id === myId && walking) {
      sprite = Math.floor(animFrame) % 2 === 0 ? walk1 : walk2;
    }

    ctx.drawImage(sprite, Math.round(p.x), Math.round(p.y), 48, 48);

    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 5);
  }

  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
