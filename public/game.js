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

// 🌍 World
const worldWidth = 2000;
const worldHeight = 2000;
let camera = { x: 0, y: 0 };

// 📱 Mobile joystick
let touchActive = false;
let touchStart = { x: 0, y: 0 };
let touchMove = { x: 0, y: 0 };

// 😀 Emotes
const emotes = { wave: "👋", dance: "💃", sit: "🪑" };

function joinGame() {
  const name = document.getElementById("nameInput").value.trim();
  if (name.length < 2) return alert("Name too short");

  socket.emit("setName", name);
  document.getElementById("namePrompt").style.display = "none";
  joined = true;
}

// Keyboard
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Mobile
canvas.addEventListener("touchstart", e => {
  touchActive = true;
  touchStart.x = e.touches[0].clientX;
  touchStart.y = e.touches[0].clientY;
});
canvas.addEventListener("touchmove", e => {
  touchMove.x = e.touches[0].clientX;
  touchMove.y = e.touches[0].clientY;
});
canvas.addEventListener("touchend", () => touchActive = false);

socket.on("currentPlayers", (serverPlayers) => { players = serverPlayers; myId = socket.id; });
socket.on("newPlayer", (data) => { players[data.id] = data.player; });
socket.on("playerMoved", (data) => { players[data.id] = data.player; });
socket.on("playerDisconnected", (id) => { delete players[id]; });
socket.on("playerCount", (count) => { document.getElementById("playerCount").textContent = "Players Online: " + count; });

socket.on("chat", (data) => {
  for (let id in players) {
    if (players[id].name === data.name) {
      players[id].bubble = data.message;
      players[id].bubbleTimer = 180;
    }
  }
  const msg = document.createElement("div");
  msg.textContent = `${data.name}: ${data.message}`;
  document.getElementById("messages").appendChild(msg);
});

document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && joined) {
    let text = e.target.value;
    if (text.startsWith("/")) {
      let cmd = text.substring(1);
      if (emotes[cmd]) socket.emit("chat", emotes[cmd]);
    } else {
      socket.emit("chat", text);
    }
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

  if (touchActive) {
    let dx = touchMove.x - touchStart.x;
    let dy = touchMove.y - touchStart.y;
    player.x += dx * 0.05;
    player.y += dy * 0.05;
    walking = true;
  }

  player.x = Math.max(0, Math.min(worldWidth, player.x));
  player.y = Math.max(0, Math.min(worldHeight, player.y));

  socket.emit("move", player);

  if (walking) animFrame += 0.2; else animFrame = 0;

  camera.x += ((player.x - canvas.width / 2) - camera.x) * 0.1;
  camera.y += ((player.y - canvas.height / 2) - camera.y) * 0.1;

  for (let id in players) if (players[id].bubbleTimer > 0) players[id].bubbleTimer--;
}

function drawWorld() {
  ctx.fillStyle = "#2ecc40";
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // Building
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(800, 800, 300, 200);
}

function drawBubble(text, x, y) {
  ctx.font = "14px Arial";
  const padding = 6;
  const width = ctx.measureText(text).width + padding * 2;

  ctx.fillStyle = "white";
  ctx.fillRect(x - width / 2, y - 40, width, 24);

  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y - 22);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWorld();

  for (let id in players) {
    let p = players[id];
    let sprite = idle;
    if (id === myId && walking) sprite = Math.floor(animFrame) % 2 === 0 ? walk1 : walk2;

    ctx.drawImage(sprite, Math.round(p.x), Math.round(p.y), 48, 48);

    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 5);

    if (p.bubble && p.bubbleTimer > 0) drawBubble(p.bubble, p.x + 24, p.y);
  }

  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
