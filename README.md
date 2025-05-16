
A collaborative, real-time code editor where users can seamlessly code together. It provides a platform for multiple users to enter a room, share a unique room ID, and collaborate on code simultaneously.

## 🔮 Features

- :

📦 CodeFusionX: Real-Time Collaborative Coding Platform Features:


📑 Core Features
💻 Real-time collaboration on code editing across multiple files
📁 Create, open, edit, save, delete, and organize files and folders
💾 Option to download the entire codebase as a ZIP file
🚀 Unique room generation with room ID for seamless collaboration
🌍 Comprehensive language support for versatile programming
🌈 Syntax highlighting for various file types with auto-language detection
🚀 Code Execution: Run code directly within the collaboration environment
⏱️ Instant updates and synchronization of code changes across all files and folders

📡 Communication & Collaboration
📣 Notifications for user join and leave events
👥 User presence list with online/offline status indicators
💬 Real-time group chat functionality
🎩 Real-time tooltip showing who’s editing what
🎨 Collaborative Drawing Whiteboard: Draw and sketch ideas together in real-time
📹 Real-time Video Calling using Mediasoup
        -Secure, low-latency video and audio calls within collaboration rooms
        -Room-based video calls synchronized with coding sessions via shared room ID
        -Dynamic video call panel toggle within the editor UI
        -Mute/unmute and video on/off controls for each participant
        -Scalable for multiple participants in a single room

⚙️ Productivity & Personalization
💡 Auto-suggestion/intellisense based on programming language
🔠 Option to customize font size and font family
🎨 Multiple themes for a personalized coding experience

🤖 AI Assistance
🤖 Copilot: AI-powered code assistant capable of generating, inserting, replacing, or suggesting code snippets in real-time within your files




## 💻 Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ExpressJS](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Socket io](https://img.shields.io/badge/Socket.io-ffffff?style=for-the-badge)
![Git](https://img.shields.io/badge/GIT-E44C30?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## ⚙️ Installation



   Frontend:

   ```bash
   VITE_BACKEND_URL=<your_server_url>
   ```

   Backend:

   ```bash
   PORT=3000
   ```

**Install dependencies:**
   ```bash
   npm install     # Run in all client, server and mediasoup directories
   ```
**Start the servers:**
   Frontend:
   ```bash
   cd client
   npm run dev
   ```
   Backend:
   ```bash
   cd server
   npm run dev
   ```
   
   In config.js, update server.wrtc.ip to the right IP address for your network.

   and then run:
   ```bash
   cd mediasoup
   npm start
   ```
   Visit localhost:3030 on your browser and if the above steps went well, you should see a video feed from your camera. Congrats 🥳, you are the first client to
   join the very simple video chat. To simulate other clients, open this same URL in other tabs of your browser and you should have a whole lot of yourselves 😂.

**Access the application:**
   ```bash
   http://localhost:5173/
   ```
