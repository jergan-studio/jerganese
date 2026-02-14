const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};

io.on("connection", (socket) => {
  console.log("Player joined:", socket.id);

  players[socket.id] = {
    x: 300,
    y: 300
  };

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", {
    id: socket.id,
    player: players[socket.id]
  });

  socket.on("move", (data) => {
    players[socket.id] = data;
    io.emit("playerMoved", {
      id: socket.id,
      player: data
    });
  });

  socket.on("chat", (msg) => {
    io.emit("chat", {
      id: socket.id,
      message: msg
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Jerganese running on http://localhost:3000");
});
