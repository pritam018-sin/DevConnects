import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { Message } from "../models/message.Model.js";

let io;
const onlineUsers = new Map();

export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // ✅ Middleware for JWT authentication during socket handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.userId);
    onlineUsers.set(userId, socket.id);
    console.log("🟢 User connected:", userId);

    // Broadcast updated online users list
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));

    // 📩 Listen for sendMessage event
    socket.on("sendMessage", async ({ receiverId, content }) => {
      if (!receiverId || !content) return;

      // 1️⃣ Save message in DB
      const newMessage = await Message.create({
        sender: userId,
        receiver: receiverId,
        content,
      });

      // 2️⃣ Emit to receiver if online
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", newMessage);
      }

      // 3️⃣ Emit to sender for confirmation
      io.to(socket.id).emit("messageSent", newMessage);
    });

    // 🟢 Real-time typing indicators
    socket.on("typing", ({ receiverId }) => {
      if (!receiverId) return;
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userTyping", { senderId: userId });
      }
    });

    socket.on("stopTyping", ({ receiverId }) => {
      if (!receiverId) return;
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("userStoppedTyping", { senderId: userId });
      }
    });

    // 🟢 Handle message read
    socket.on("markAsRead", async (messageId) => {
      const message = await Message.findById(messageId);
      if (message && message.receiver.toString() === userId) {
        message.read = true;
        await message.save();
        const senderSocketId = onlineUsers.get(message.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageRead", messageId);
        }
      }
    });

    // 🔴 On disconnect
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      console.log("🔴 User disconnected:", userId);
      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    });
  });
};

export { io, onlineUsers };
