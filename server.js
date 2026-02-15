const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let boomboxes = {};

io.on("connection", socket => {
  console.log(`Player connected: ${socket.id}`);
  players[socket.id] = { x: Math.random()*1800+100, y: Math.random()*1800+100, name:"Player", bubble:"", bubbleTimer:0 };
  
  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", { id: socket.id, player: players[socket.id] });

  socket.on("setName", name => { if(players[socket.id]) players[socket.id].name=name; });

  socket.on("move", data => { 
    if(players[socket.id]) { 
      players[socket.id].x=data.x; 
      players[socket.id].y=data.y; 
      socket.broadcast.emit("playerMoved", { id: socket.id, player: players[socket.id] });
    } 
  });

  // Chat
  socket.on("chat", msg => {
    if(players[socket.id]){
      const name = players[socket.id].name;
      io.emit("chat",{ name, message: msg });
    }
  });

  // Boombox
  socket.on("placeBoombox", data => {
    const id = Date.now()+"_"+Math.floor(Math.random()*1000);
    boomboxes[id] = {
      x:data.x, y:data.y, ownerId:socket.id,
      videoURL:data.videoURL||"", musicURL:data.musicURL||"",
      active:true, emote:data.emote||""
    };
    io.emit("newBoombox",{ id, boombox: boomboxes[id] });
  });

  socket.on("boomboxEmote", data => {
    if(boomboxes[data.id]){
      boomboxes[data.id].emote=data.emote;
      io.emit("updateBoombox",{ id:data.id, boombox:boomboxes[data.id] });
    }
  });

  socket.on("removeBoombox", id => { delete boomboxes[id]; io.emit("removeBoombox",id); });
  socket.on("requestBoomboxes", () => { socket.emit("currentBoomboxes", boomboxes); });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
    io.emit("playerCount", Object.keys(players).length);
  });

  io.emit("playerCount", Object.keys(players).length);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
