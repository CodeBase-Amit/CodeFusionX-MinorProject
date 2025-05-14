import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAppContext } from "./AppContext";
import { useSocket } from "./SocketContext";
import { useParams } from "react-router-dom";
import "@/styles/videoCall.css"; // Import the CSS file

interface VideoCallContextType {
  isVideoCallActive: boolean;
  startVideoCall: () => void;
  stopVideoCall: () => void;
  toggleVideoCall: () => void;
  isVideoCallVisible: boolean;
  videoCallUrl: string;
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
  const { currentUser } = useAppContext();
  const { socket } = useSocket();
  const { roomId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoaded = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // URL for the video call
  const videoCallUrl = `http://localhost:3030?roomId=${roomId}&username=${encodeURIComponent(currentUser.username)}`;

  // Define functions with useCallback to avoid dependency issues
  const stopVideoCall = useCallback(() => {
    console.log("Stopping video call");
    setIsVideoCallActive(false);
    setIsVideoCallVisible(false);
    
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
  }, []);
  
  // Toggle video call visibility
  const toggleVideoCall = useCallback(() => {
    if (!isVideoCallActive) {
      // If not active, start it and make visible
      startVideoCall();
      setIsVideoCallVisible(true);
    } else {
      // If already active, just toggle visibility
      setIsVideoCallVisible(!isVideoCallVisible);
    }
  }, [isVideoCallActive, isVideoCallVisible, startVideoCall]);

  // Initialize video call when entering a room (but don't show it)
  useEffect(() => {
    if (roomId && currentUser.username && !isVideoCallActive) {
      startVideoCall();
      // No longer making it visible by default
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
        toggleVideoCall,
        videoCallUrl
      }}
    >
      {children}
      {/* Hidden background iframe that's always active when video call is active */}
      {isVideoCallActive && (
        <div className="hidden-video-call">
          <iframe
            ref={iframeRef}
            title="Background Video Call"
            className="hidden-video-iframe"
            allow="camera; microphone; fullscreen; display-capture"
          />
        </div>
      )}
    </VideoCallContext.Provider>
  );
};

export default VideoCallContext; 