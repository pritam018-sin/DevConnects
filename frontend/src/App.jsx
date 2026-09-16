import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import { SocketProvider } from './context/SocketContext.jsx';
import Navbar from './components/Navbar.jsx';
import RightSidebar from './components/RightSidebar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Projects from './pages/Projects.jsx';
import Network from './pages/Network.jsx';
import Messages from './pages/Messages.jsx';
import Settings from './pages/Settings.jsx';
import './index.css';

import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const location = useLocation();
  const isProfilePage = location.pathname.startsWith('/profile');
  const isMessagesPage = location.pathname.startsWith('/messages');
  const hideRightSidebar = isProfilePage || isMessagesPage;

  return (
    <div className="flex max-w-[1440px] mx-auto min-h-screen relative font-display text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1E143E',
            textShadow: 'none',
            color: '#fff',
            border: '1px solid #673AB7',
            borderRadius: '16px',
            fontSize: '13px',
          },
        }}
      />
      <Navbar />
      <main
        className={`flex-1 ml-20 p-6 flex flex-col gap-8 transition-all duration-300 ${
          hideRightSidebar ? 'mr-0' : 'mr-80'
        }`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/network" element={<Network />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <SocketProvider>
        <Router>
          <Layout />
        </Router>
      </SocketProvider>
    </Provider>
  );
}

export default App;
