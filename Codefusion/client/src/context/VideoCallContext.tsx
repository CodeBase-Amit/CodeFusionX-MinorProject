import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAppContext } from "./AppContext";
import { useSocket } from "./SocketContext";
import { useParams } from "react-router-dom";
import "@/styles/videoCall.css"; // Import the CSS file

interface VideoCallContextType {
  isVideoCallActive: boolean;
  startVideoCall: () => void;
  stopVideoCall: () => void;
  setVideoCallVisible: (visible: boolean) => void;
  isVideoCallVisible: boolean;
}

const VideoCallContext = createContext<VideoCallContextType | null>(null);

export const useVideoCall = (): VideoCallContextType => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
};

export const VideoCallProvider = ({ children }: { children: ReactNode }) => {
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoCallVisible, setIsVideoCallVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 30, height: 50 });
  const { currentUser } = useAppContext();
  const { socket } = useSocket();
  const { roomId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeLoaded = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dragRef = useRef({
    isDragging: false,
    initialX: 0,
    initialY: 0,
  });
  const resizeRef = useRef({
    isResizing: false,
    initialWidth: 0,
    initialHeight: 0,
    initialX: 0,
    initialY: 0,
  });

  // URL for the video call
  const videoCallUrl = `http://localhost:3030?roomId=${roomId}&username=${encodeURIComponent(currentUser.username)}`;

  // Define functions with useCallback to avoid dependency issues
  const stopVideoCall = useCallback(() => {
    console.log("Stopping video call");
    setIsVideoCallActive(false);
    if (iframeRef.current) {
      iframeRef.current.src = "about:blank";
      iframeLoaded.current = false;
    }
    
    // Stop the audio context if it exists
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  const startVideoCall = useCallback(() => {
    console.log("Starting video call");
    setIsVideoCallActive(true);
    
    // Initialize position to right side of screen when starting video call
    const initialWidth = window.innerWidth * 0.3; // 30% of window width
    const initialHeight = window.innerHeight * 0.5; // 50% of window height
    
    // Position it on the right side initially
    setPosition({
      x: 10, // A small margin from the left edge
      y: 60  // Some space from the top for app header
    });
  }, []);

  // Initialize video call when entering a room
  useEffect(() => {
    if (roomId && currentUser.username && !isVideoCallActive) {
      startVideoCall();
    }
  }, [roomId, currentUser.username, isVideoCallActive, startVideoCall]);

  // Handle room leave events
  useEffect(() => {
    const handleUserLeft = () => {
      console.log("User left room, stopping video call");
      stopVideoCall();
    };

    // When the user disconnects or leaves the room
    socket.on("disconnect", handleUserLeft);

    return () => {
      socket.off("disconnect", handleUserLeft);
    };
  }, [socket, stopVideoCall]);

  // Create a silent audio context to prevent browser throttling
  useEffect(() => {
    if (isVideoCallActive && !audioContextRef.current) {
      try {
        // Create AudioContext for keeping the call active in background
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
          // Create a silent oscillator
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 0.001; // Nearly silent
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          oscillator.start();
        }
      } catch (e) {
        console.warn('Could not create AudioContext:', e);
      }
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, [isVideoCallActive]);

  // Keep iframe loaded and active even when not visible
  useEffect(() => {
    // Only run this if video call is active
    if (!isVideoCallActive) return;

    // Create or restore iframe
    if (!iframeLoaded.current && iframeRef.current) {
      // Set the source only once to prevent reloading
      if (!iframeRef.current.src || iframeRef.current.src === 'about:blank') {
        iframeRef.current.src = videoCallUrl;
      }
      iframeLoaded.current = true;
    }

    // Set up ping interval to keep the iframe active
    const pingInterval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'keep-alive',
            from: 'codefusion'
          }, '*');
        } catch (e) {
          console.warn('Could not post message to iframe:', e);
        }
      }
    }, 10000); // Every 10 seconds

    // Ensure iframe remains active when tab switches
    const handleVisibilityChange = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          // Post a message to keep the iframe active
          iframeRef.current.contentWindow.postMessage({
            type: 'keep-alive',
            from: 'codefusion'
          }, '*');
        } catch (e) {
          console.warn('Could not post message to iframe:', e);
        }
      }
    };

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isVideoCallActive, videoCallUrl]);

  // Handle dragging functionality
  useEffect(() => {
    if (!isVideoCallActive || !isVideoCallVisible || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleMouseDown = (e: MouseEvent) => {
      // Check if it's not resizing and if clicked on the header area
      if ((e.target as HTMLElement).classList.contains('video-call-drag-handle')) {
        dragRef.current.isDragging = true;
        dragRef.current.initialX = e.clientX - position.x;
        dragRef.current.initialY = e.clientY - position.y;
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current.isDragging) {
        const newX = e.clientX - dragRef.current.initialX;
        const newY = e.clientY - dragRef.current.initialY;
        
        // Apply constraints to keep it within the window
        const maxX = window.innerWidth - (container.offsetWidth || 300);
        const maxY = window.innerHeight - (container.offsetHeight || 200);
        
        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }

      if (resizeRef.current.isResizing) {
        const newWidth = resizeRef.current.initialWidth + (e.clientX - resizeRef.current.initialX);
        const newHeight = resizeRef.current.initialHeight + (e.clientY - resizeRef.current.initialY);
        
        // Set minimum size
        setSize({
          width: Math.max(20, Math.min(newWidth / window.innerWidth * 100, 80)), // % of window width
          height: Math.max(20, Math.min(newHeight / window.innerHeight * 100, 80)) // % of window height
        });
      }
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
      resizeRef.current.isResizing = false;
    };

    const handleResizeStart = (e: MouseEvent) => {
      resizeRef.current.isResizing = true;
      resizeRef.current.initialWidth = container.offsetWidth;
      resizeRef.current.initialHeight = container.offsetHeight;
      resizeRef.current.initialX = e.clientX;
      resizeRef.current.initialY = e.clientY;
      e.preventDefault();
    };

    // Handle window resize to keep video call container within boundaries
    const handleWindowResize = () => {
      if (container) {
        // Ensure container stays within window bounds after window resize
        const maxX = window.innerWidth - container.offsetWidth;
        const maxY = window.innerHeight - container.offsetHeight;
        
        if (position.x > maxX || position.y > maxY) {
          setPosition({
            x: Math.max(0, Math.min(position.x, maxX)),
            y: Math.max(0, Math.min(position.y, maxY))
          });
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown as EventListener);
    document.addEventListener('mousemove', handleMouseMove as EventListener);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleWindowResize);

    const resizeHandle = container.querySelector('.video-call-resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', handleResizeStart as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown as EventListener);
      document.removeEventListener('mousemove', handleMouseMove as EventListener);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeHandle) {
        resizeHandle.removeEventListener('mousedown', handleResizeStart as EventListener);
      }
    };
  }, [isVideoCallActive, isVideoCallVisible, position]);

  // Clean up when component unmounts or when leaving a room
  useEffect(() => {
    return () => {
      if (isVideoCallActive) {
        stopVideoCall();
      }
    };
  }, [isVideoCallActive, stopVideoCall]);

  return (
    <VideoCallContext.Provider 
      value={{ 
        isVideoCallActive, 
        startVideoCall, 
        stopVideoCall,
        isVideoCallVisible,
        setVideoCallVisible: setIsVideoCallVisible
      }}
    >
      {children}
      {isVideoCallActive && (
        <div 
          ref={containerRef}
          className={`video-call-iframe-container ${isVideoCallVisible ? 'visible' : 'hidden'}`}
          style={{ 
            display: isVideoCallVisible ? 'block' : 'none',
            width: `${size.width}%`,
            height: `${size.height}%`,
            top: `${position.y}px`,
            left: `${position.x}px`,
          }}
        >
          <div className="video-call-drag-handle">
            <span>Video Call</span>
            <button onClick={() => setIsVideoCallVisible(false)}>
              ✕
            </button>
          </div>
          <iframe
            ref={iframeRef}
            title="Video Call"
            className="video-call-iframe"
            allow="camera; microphone; fullscreen; display-capture"
          />
          <div className="video-call-resize-handle" />
        </div>
      )}
    </VideoCallContext.Provider>
  );
};

export default VideoCallContext; 