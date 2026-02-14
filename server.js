const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let players = {};

io.on("connection", (socket) => {

  socket.on("setName", (name) => {
    players[socket.id] = {
      x: 300,
      y: 300,
      name: name,
      bubble: "",
      bubbleTimer: 0
    };

    socket.emit("currentPlayers", players);
    socket.broadcast.emit("newPlayer", {
      id: socket.id,
      player: players[socket.id]
    });

    io.emit("playerCount", Object.keys(players).length);
  });

  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    io.emit("playerMoved", {
      id: socket.id,
      player: players[socket.id]
    });
  });

  socket.on("chat", (msg) => {
    if (!players[socket.id]) return;

    players[socket.id].bubble = msg;
    players[socket.id].bubbleTimer = 180;

    io.emit("chat", {
      name: players[socket.id].name,
      message: msg
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
    io.emit("playerCount", Object.keys(players).length);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
