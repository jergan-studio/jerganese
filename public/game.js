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

// 😀 Emotes list
const emotes = {
  wave: "👋",
  dance: "💃",
  sit: "🪑"
};

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

// 📱 Touch Controls
canvas.addEventListener("touchstart", e => {
  touchActive = true;
  touchStart.x = e.touches[0].clientX;
