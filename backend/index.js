import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let connectedPeers = [];

io.on("connection", (socket) => {
  console.log(`${socket.id} connected`);

  connectedPeers.push(socket.id);

  console.log(connectedPeers.length);

  io.emit("connectedPeers", connectedPeers);

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected`);

    connectedPeers = connectedPeers.filter((id) => id !== socket.id);

    console.log(connectedPeers.length);

    io.emit("connectedPeers", connectedPeers);
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
