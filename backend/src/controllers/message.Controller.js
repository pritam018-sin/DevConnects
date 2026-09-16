import { Message } from "../models/message.Model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { User } from "../models/user.Model.js";
import { io, onlineUsers } from "../socket/socket.js";
import { sendSystemNotification } from "../utils/notificationHelper.js";


// 🟩 Send new message
export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user._id;

  if (!receiverId || !content) {
    throw new ApiError(400, "Post must have either content or receiverId");
  }
  const newMessage = await Message.create({
    sender: senderId,
    receiver: receiverId,
    content,
  });
  if (!newMessage) {
    throw new ApiError(500, "Something went wrong while sending the message");
  }

  // Emit to receiver if online
  const receiverSocketId = onlineUsers.get(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("receiveMessage", newMessage);
  }

  // Dispatch System Notification
  const trimmedSnippet = content.trim().slice(0, 35) + (content.trim().length > 35 ? "..." : "");
  sendSystemNotification({
    receiver: receiverId,
    sender: senderId,
    type: "message",
    message: `@${req.user.username} transmitted a direct message: "${trimmedSnippet}" 📡`,
    link: `/messages?userId=${senderId}`,
  }).catch((err) => console.error("Notification error:", err.message));

  return res
    .status(201)
    .json(new ApiResponse(201, newMessage, "Message sent successfully"));
});


// 🟦 Fetch all messages between logged user and receiver
export const getMessages = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const userId = req.user._id;

    // Automatically mark incoming messages from this receiver as read
    await Message.updateMany(
      { sender: receiverId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    // Notify sender in real-time if online
    const senderSocketId = onlineUsers?.get(receiverId?.toString());
    if (senderSocketId && io) {
      io.to(senderSocketId).emit("messagesRead", { readerId: userId.toString() });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: receiverId },
        { sender: receiverId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟧 Mark all messages as read (optional)
export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.params;
    const receiverId = req.user._id;

    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟨 Edit message (only sender can)
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    message.content = content;
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟥 Delete message (only sender can)
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId.toString())
      return res.status(403).json({ message: "Not authorized" });

    await message.deleteOne();
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟪 Get Conversations (Sidebar users)
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: {
            if: { $eq: ["$sender", userId] },
            then: "$receiver",
            else: "$sender"
          }
        },
        lastMessage: { $first: "$$ROOT" }
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    {
      $unwind: "$userDetails"
    },
    {
      $project: {
        _id: 1,
        "userDetails._id": 1,
        "userDetails.username": 1,
        "userDetails.fullname": 1,
        "userDetails.avatar": 1,
        "userDetails.bio": 1,
        "userDetails.skills": 1,
        lastMessage: 1
      }
    },
    {
      $sort: { "lastMessage.createdAt": -1 }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(200, conversations, "Conversations fetched successfully")
  );
});
