const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let players = {};
let boomboxes = {};
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

// World
const worldWidth = 2000;
const worldHeight = 2000;

// Camera
let camera = { x:0, y:0 };
let cameraShake = { x:0, y:0 };

// Mobile
let touchActive = false;
let touchStart = { x:0, y:0 };
let touchMove = { x:0, y:0 };

// Emotes
const emotes = { wave:"👋", dance:"💃", sit:"🪑" };

// Weather
let weather = { type:null, timer:0 };
let weatherCooldown = 0;

// Music
const music = document.getElementById("bgMusic");
music.volume = 0.5;

// Join Game
function joinGame() {
  const name = document.getElementById("nameInput").value.trim();
  if(name.length<2) return alert("Name too short");
  socket.emit("setName", name);
  document.getElementById("namePrompt").style.display = "none";
  joined = true;
  socket.emit("requestBoomboxes"); // request existing boomboxes
}

// Keyboard controls
document.addEventListener("keydown", e=>keys[e.key]=true);
document.addEventListener("keyup", e=>keys[e.key]=false);

// Mobile controls
canvas.addEventListener("touchstart", e=>{ touchActive=true; touchStart.x=e.touches[0].clientX; touchStart.y=e.touches[0].clientY; });
canvas.addEventListener("touchmove", e=>{ touchMove.x=e.touches[0].clientX; touchMove.y=e.touches[0].clientY; });
canvas.addEventListener("touchend", ()=>touchActive=false);

// Socket events
socket.on("currentPlayers", p=>{ players=p; myId=socket.id; });
socket.on("newPlayer", d=>{ players[d.id]=d.player; });
socket.on("playerMoved", d=>{ players[d.id]=d.player; });
socket.on("playerDisconnected", id=>{ delete players[id]; });
socket.on("playerCount", c=>document.getElementById("playerCount").textContent="Players Online: "+c);

// Chat
socket.on("chat", data=>{
  for(let id in players){
    if(players[id].name===data.name){
      players[id].bubble=data.message;
      players[id].bubbleTimer=180;
    }
  }
  const msg=document.createElement("div");
  msg.textContent=`${data.name}: ${data.message}`;
  document.getElementById("messages").appendChild(msg);
  const messagesDiv=document.getElementById("messages");
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

document.getElementById("chatInput").addEventListener("keydown", e=>{
  if(e.key==="Enter" && joined){
    let text=e.target.value;
    if(text.startsWith("/")){
      let cmd=text.substring(1);
      if(emotes[cmd]) socket.emit("chat", emotes[cmd]);
    } else socket.emit("chat", text);
    e.target.value="";
  }
});

// Camera
function updateCamera(player){
  camera.x+=((player.x-canvas.width/2)-camera.x)*0.1;
  camera.y+=((player.y-canvas.height/2)-camera.y)*0.1;
  cameraShake.x=(weather.type==="storm")?Math.random()*6-3:0;
  cameraShake.y=(weather.type==="storm")?Math.random()*6-3:0;
}

// Weather scheduler
function updateWeatherScheduler(){
  if(weather.timer>0) return;
  if(weatherCooldown<=0){
    const types=["rain","storm","snow"];
    const type=types[Math.floor(Math.random()*types.length)];
    const duration=600+Math.floor(Math.random()*600);
    startWeather(type,duration);
    weatherCooldown=1200+Math.floor(Math.random()*600);
  } else weatherCooldown--;
}

function startWeather(type,duration=600){
  weather.type=type;
  weather.timer=duration;
}

// Boombox functions
function placeBoombox(videoURL, emote){
  if(!players[myId]) return;
  const player = players[myId];
  socket.emit("placeBoombox", { x: player.x, y: player.y, videoURL, emote });
}

function boomboxEmote(id, emote){
  socket.emit("boomboxEmote", { id, emote });
}

// Handle boombox socket events
socket.on("currentBoomboxes", data => boomboxes=data);
socket.on("newBoombox", data => boomboxes[data.id]=data.boombox);
socket.on("updateBoombox", data => boomboxes[data.id]=data.boombox);
socket.on("removeBoombox", id=>delete boomboxes[id]);

// Update loop
function update(){
  if(!joined||!players[myId]) return;
  let player = players[myId];
  walking=false;
  const speed=4;

  if(keys["w"]){player.y-=speed;walking=true;}
  if(keys["s"]){player.y+=speed;walking=true;}
  if(keys["a"]){player.x-=speed;walking=true;}
  if(keys["d"]){player.x+=speed;walking=true;}

  if(touchActive){
    let dx=touchMove.x-touchStart.x;
    let dy=touchMove.y-touchStart.y;
    player.x+=dx*0.05;
    player.y+=dy*0.05;
    walking=true;
  }

  player.x=Math.max(0,Math.min(worldWidth,player.x));
  player.y=Math.max(0,Math.min(worldHeight,player.y));
  socket.emit("move",player);
  animFrame=walking?animFrame+0.2:0;

  updateCamera(player);

  // Bubble timers
  for(let id in players){
    if(players[id].bubbleTimer>0){
      players[id].bubbleTimer--;
      if(players[id].bubbleTimer===0) players[id].bubble="";
    }
  }

  if(weather.timer>0){ weather.timer--; if(weather.timer<=0) weather.type=null; }
  updateWeatherScheduler();

  // Weather HUD
  const hud=document.getElementById("weatherHUD");
  if(weather.type==="rain") hud.textContent="Weather: 🌧️ Rain";
  else if(weather.type==="storm") hud.textContent="Weather: ⛈️ Storm";
  else if(weather.type==="snow") hud.textContent="Weather: ❄️ Snow";
  else hud.textContent="Weather: ☀️ Clear";
}

// Draw functions
function drawPlayers(){
  for(let id in players){
    let p = players[id];
    let sprite = idle;
    if(id===myId && walking) sprite = Math.floor(animFrame)%2===0 ? walk1 : walk2;
    ctx.drawImage(sprite, Math.round(p.x), Math.round(p.y), 48, 48);
    ctx.fillStyle="black";
    ctx.textAlign="center";
    ctx.fillText(p.name, p.x+24, p.y-5);
    if(p.bubble && p.bubbleTimer>0) drawBubble(p.bubble, p.x+24, p.y);
  }
}

function drawBubble(text,x,y){
  ctx.font="14px Arial";
  const padding=6;
  const width=ctx.measureText(text).width+padding*2;
  ctx.fillStyle="white";
  ctx.fillRect(x-width/2,y-40,width,24);
  ctx.fillStyle="black";
  ctx.textAlign="center";
  ctx.fillText(text,x,y-22);
}

// Draw boomboxes
function drawBoomboxes(){
  for(let id in boomboxes){
    const b = boomboxes[id];
    ctx.fillStyle="#555";
    ctx.fillRect(b.x, b.y, 40, 40);
    if(b.videoURL){
      ctx.fillStyle="white";
      ctx.beginPath();
      ctx.moveTo(b.x+12,b.y+10);
      ctx.lineTo(b.x+12,b.y+30);
      ctx.lineTo(b.x+28,b.y+20);
      ctx.fill();
    }
    if(b.emote){
      ctx.font="20px Arial";
      ctx.textAlign="center";
      ctx.fillStyle="yellow";
      ctx.fillText(b.emote, b.x+20, b.y-10);
    }
  }
}

// Draw world
function drawWorld(){
  ctx.fillStyle="#2ecc40";
  ctx.fillRect(0,0,worldWidth,worldHeight);

  // Buildings
  ctx.fillStyle="#8b4513";
  ctx.fillRect(500,500,300,200);
  ctx.fillRect(1200,400,250,250);
  ctx.fillRect(700,1300,400,200);

  function drawTree(x,y){
    ctx.fillStyle="#8b4513"; ctx.fillRect(x+12,y+20,6,20);
    ctx.fillStyle="#007700"; ctx.beginPath(); ctx.arc(x+15,y+15,15,0,Math.PI*2); ctx.fill();
  }
  drawTree(300,300);
  drawTree(1600,800);
  drawTree(900,1600);
  drawTree(400,1400);
}

// Weather
function drawWeather(){
  if(!weather.type) return;
  ctx.fillStyle="rgba(0,0,0,0.2)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  if(weather.type==="rain"){
    for(let i=0;i<100;i++){
      ctx.strokeStyle="rgba(0,0,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(Math.random()*canvas.width,Math.random()*canvas.height);
      ctx.lineTo(Math.random()*canvas.width,Math.random()*canvas.height+10);
      ctx.stroke();
    }
  }
  if(weather.type==="snow"){
    for(let i=0;i<50;i++){
      ctx.fillStyle="white";
      ctx.beginPath();
      ctx.arc(Math.random()*canvas.width,Math.random()*canvas.height,2,0,Math.PI*2);
      ctx.fill();
    }
  }
}

// Draw loop
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(-camera.x-cameraShake.x,-camera.y-cameraShake.y);
  drawWorld();
  drawPlayers();
  drawBoomboxes();
  ctx.restore();
  drawWeather();
}

// Game loop
function gameLoop(){
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

// Place boombox with "b" key
document.addEventListener("keydown", e=>{
  if(e.key==="b" && joined){
    const videoURL = prompt("Enter video URL (optional):");
    const emote = prompt("Enter emote (optional):");
    placeBoombox(videoURL, emote);
  }
});
