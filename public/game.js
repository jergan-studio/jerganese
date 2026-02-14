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

  if (keys["w"]) { player.y -= 3; walking = true; }
  if (keys["s"]) { player.y += 3; walking = true; }
  if (keys["a"]) { player.x -= 3; walking = true; }
  if (keys["d"]) { player.x += 3; walking = true; }

  socket.emit("move", player);

  if (walking) animFrame += 0.2;
  else animFrame = 0;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let id in players) {
    let p = players[id];

    let sprite = idle;
    if (walking && id === myId) {
      sprite = Math.floor(animFrame) % 2 === 0 ? walk1 : walk2;
    }

    ctx.drawImage(sprite, p.x, p.y, 48, 48);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 5);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
