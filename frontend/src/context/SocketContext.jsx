import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const { accessToken, userInfo } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect to server (proxied by Vite or direct)
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken,
      },
    });

    newSocket.on("connect", () => {
      console.log("🟢 Socket connected:", newSocket.id);
    });

    // Handle online users list
    newSocket.on("getOnlineUsers", (users) => {
      if (Array.isArray(users)) {
        setOnlineUsers(new Set(users.map(String)));
      }
    });

    // Handle incoming live notifications
    newSocket.on("notification:new", (notification) => {
      toast(notification.message || "New notification received!", {
        icon: "🔔",
        duration: 4000,
      });
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
