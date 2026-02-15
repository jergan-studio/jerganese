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

// Camera
let camera = { x: 0, y: 0 };
let cameraShake = { x: 0, y: 0 };

// Mobile
let touchActive = false;
let touchStart = { x: 0, y: 0 };
let touchMove = { x: 0, y: 0 };

// Emotes
const emotes = { wave: "👋", dance: "💃", sit: "🪑" };

// Weather
let weather = { type: null, timer: 0 };
let weatherCooldown = 0; // scheduler countdown

// Music
const music = document.getElementById("bgMusic");
music.volume = 0.5; // 50%
music.loop = true;
music.play().catch(()=>{}); // autoplay fallback

// Optional: Weather sounds (add your mp3 files)
const rainSound = new Audio("rain.mp3"); rainSound.loop = true;
const stormSound = new Audio("storm.mp3"); stormSound.loop = true;
const snowSound = new Audio("snow.mp3"); snowSound.loop = true;

// Join Game
function joinGame() {
  const name = document.getElementById("nameInput").value.trim();
  if (name.length < 2) return alert("Name too short");
  socket.emit("setName", name);
  document.getElementById("namePrompt").style.display = "none";
  joined = true;
}

// Keyboard controls
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Mobile controls
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

// Socket events
socket.on("currentPlayers", p => { players = p; myId = socket.id; });
socket.on("newPlayer", d => players[d.id] = d.player);
socket.on("playerMoved", d => players[d.id] = d.player);

// Disconnect error overlay
socket.on("playerDisconnected", id => {
  if (id === myId) showError("You have disconnected!");
  delete players[id];
});

socket.on("playerCount", c => document.getElementById("playerCount").textContent = "Players Online: " + c);

// Chat
socket.on("chat", data => {
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

// Chat input with emotes
document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && joined) {
    let text = e.target.value;
    if (text.startsWith("/")) {
      let cmd = text.substring(1);
      if (emotes[cmd]) socket.emit("chat", emotes[cmd]);
    } else socket.emit("chat", text);
    e.target.value = "";
  }
});

// Show error overlay
function showError(text) {
  const errorDiv = document.createElement("div");
  Object.assign(errorDiv.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,0,0,0.7)",
    color: "white",
    fontSize: "36px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "9999"
  });
  errorDiv.innerText = text;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Camera update
function updateCamera(player) {
  camera.x += ((player.x - canvas.width / 2) - camera.x) * 0.1;
  camera.y += ((player.y - canvas.height / 2) - camera.y) * 0.1;

  if (weather.type === "storm") {
    cameraShake.x = Math.random() * 6 - 3;
    cameraShake.y = Math.random() * 6 - 3;
  } else {
    cameraShake.x = 0;
    cameraShake.y = 0;
  }
}

// Weather scheduler
function updateWeatherScheduler() {
  if (weather.timer > 0) return;

  if (weatherCooldown <= 0) {
    const types = ["rain", "storm", "snow"];
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = 600 + Math.floor(Math.random() * 600); // 10-20s

    startWeather(type, duration);
    weatherCooldown = 1200 + Math.floor(Math.random() * 600); // 20-30s until next weather
  } else {
    weatherCooldown--;
  }
}

// Start weather
function startWeather(type, duration = 600) {
  weather.type = type;
  weather.timer = duration;

  // Stop all sounds
  rainSound.pause(); rainSound.currentTime = 0;
  stormSound.pause(); stormSound.currentTime = 0;
  snowSound.pause(); snowSound.currentTime = 0;

  // Play corresponding sound
  if (type === "rain") rainSound.play().catch(()=>{});
  if (type === "storm") stormSound.play().catch(()=>{});
  if (type === "snow") snowSound.play().catch(()=>{});
}

// Update loop
function update() {
  if (!joined || !players[myId]) return;
  let player = players[myId];
  walking = false;
  const speed = 4;

  // Keyboard
  if (keys["w"]) { player.y -= speed; walking = true; }
  if (keys["s"]) { player.y += speed; walking = true; }
  if (keys["a"]) { player.x -= speed; walking = true; }
  if (keys["d"]) { player.x += speed; walking = true; }

  // Mobile
  if (touchActive) {
    let dx = touchMove.x - touchStart.x;
    let dy = touchMove.y - touchStart.y;
    player.x += dx * 0.05;
    player.y += dy * 0.05;
    walking = true;
  }

  // Bounds
  player.x = Math.max(0, Math.min(worldWidth, player.x));
  player.y = Math.max(0, Math.min(worldHeight, player.y));

  socket.emit("move", player);

  if (walking) animFrame += 0.2; else animFrame = 0;

  updateCamera(player);

  // Bubble timers
  for (let id in players) if (players[id].bubbleTimer > 0) players[id].bubbleTimer--;

  // Weather timer
  if (weather.timer > 0) {
    weather.timer--;
    if (weather.timer <= 0) weather.type = null;
  }

  // Dynamic scheduler
  updateWeatherScheduler();
}

// Draw players
function drawPlayers() {
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
}

// Draw bubble
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

// Draw world
function drawWorld() {
  ctx.fillStyle = "#2ecc40"; // Grass
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  // Buildings
  ctx.fillStyle = "#8b4513";
  ctx.fillRect(500, 500, 300, 200);
  ctx.fillRect(1200, 400, 250, 250);
  ctx.fillRect(700, 1300, 400, 200);

  // Trees
  function drawTree(x, y) {
    ctx.fillStyle = "#8b4513"; // trunk
    ctx.fillRect(x + 12, y + 20, 6, 20);
    ctx.fillStyle = "#007700"; // leaves
    ctx.beginPath();
    ctx.arc(x + 15, y + 15, 15, 0, Math.PI*2);
    ctx.fill();
  }

  drawTree(300, 300);
  drawTree(1600, 800);
  drawTree(900, 1600);
  drawTree(400, 1400);
}

// Draw weather overlay
function drawWeather() {
  if (!weather.type) return;

  // Overlay
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Rain
  if (weather.type === "rain") {
    for (let i = 0; i < 100; i++) {
      ctx.strokeStyle = "rgba(0,0,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height + 10);
      ctx.stroke();
    }
  }

  // Snow
  if (weather.type === "snow") {
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 2, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

// Draw loop
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera.x - cameraShake.x, -camera.y - cameraShake.y);

  drawWorld();
  drawPlayers();

  ctx.restore();
  drawWeather();
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
