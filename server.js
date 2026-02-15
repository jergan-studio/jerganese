const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};

io.on("connection", socket => {
  console.log(`Player connected: ${socket.id}`);

  // Add player
  players[socket.id] = {
    x: Math.random() * 1800 + 100,
    y: Math.random() * 1800 + 100,
    name: "Player",
    bubble: "",
    bubbleTimer: 0
  };

  // Send current players to new player
  socket.emit("currentPlayers", players);

  // Notify others
  socket.broadcast.emit("newPlayer", { id: socket.id, player: players[socket.id] });

  // Handle name change
  socket.on("setName", name => {
    if (players[socket.id]) players[socket.id].name = name;
  });

  // Handle movement
  socket.on("move", playerData => {
    if (players[socket.id]) {
      players[socket.id].x = playerData.x;
      players[socket.id].y = playerData.y;
      // Broadcast movement to others
      socket.broadcast.emit("playerMoved", { id: socket.id, player: players[socket.id] });
    }
  });

  // Handle chat
  socket.on("chat", msg => {
    if (players[socket.id]) {
      const name = players[socket.id].name;
      io.emit("chat", { name, message: msg });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
    io.emit("playerCount", Object.keys(players).length);
  });

  // Update player count
  io.emit("playerCount", Object.keys(players).length);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
