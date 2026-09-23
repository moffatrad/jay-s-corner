import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import app from "./app";
import { initChatSocket } from "./sockets/chatSocket";

const PORT = Number(process.env.PORT ?? 4000);

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
  },
});

initChatSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Jay's Corner backend listening on http://localhost:${PORT}`);
  console.log(`Socket.IO chat server ready on the same port.`);
});
