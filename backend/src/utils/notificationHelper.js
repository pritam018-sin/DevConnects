import { Notification } from "../models/notification.Model.js";
import { io, onlineUsers } from "../socket/socket.js";

/**
 * Dispatches a system notification and emits a real-time event if receiver is connected.
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.receiver
 * @param {string|mongoose.Types.ObjectId} params.sender
 * @param {"like"|"comment"|"follow"|"reply"|"project_like"|"repulse"|"message"} params.type
 * @param {string} params.message
 * @param {string} [params.link]
 */
export const sendSystemNotification = async ({ receiver, sender, type, message, link }) => {
  try {
    if (!receiver || !sender) return null;
    if (receiver.toString() === sender.toString()) return null;

    const notif = await Notification.create({
      receiver,
      sender,
      type,
      message,
      link: link || "",
    });

    const populatedNotif = await Notification.findById(notif._id).populate(
      "sender",
      "username fullname avatar"
    );

    const receiverSocketId = onlineUsers?.get(receiver.toString());
    if (receiverSocketId && io) {
      io.to(receiverSocketId).emit("notification:new", populatedNotif);
    }

    return populatedNotif;
  } catch (err) {
    console.error("Failed to send system notification:", err.message);
    return null;
  }
};
