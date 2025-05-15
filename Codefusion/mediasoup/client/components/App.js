import React, { useRef, useState, useEffect } from 'react';
import { generateName } from '../libs/name-generator'
import { useWebSocket } from '../hooks/useWebSocket';
import { useMediaSoup } from '../hooks/useMediaSoup';
import Display from './Display';
import Peer from './Peer';
import '../styles/videoCall.css';

export default function App({webSocketUrl}){
    const videoRef = useRef(null);
    
    // Initialize with a generated name to avoid empty state
    const [displayName, setDisplayName] = useState(generateName());
    
    // Media control states
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [mode, setMode] = useState('ui'); // Default to UI mode
    
    useEffect(() => {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username');
        const urlMode = urlParams.get('mode') || 'ui';
        
        // Use the username from URL if available
        if (username) {
            setDisplayName(username);
        }
        
        // Set the mode
        setMode(urlMode);
    }, []);

    const { peers, socket } = useWebSocket(webSocketUrl);
    const { consumerTransport, toggleMute, toggleVideo, shareScreen, stopScreenShare } = useMediaSoup(socket, videoRef, displayName);

    // Filter out peers that have the same display name as the local user
    const filteredPeers = peers.filter(peer => peer.displayName !== displayName);
    console.log("Filtered out duplicate peers:", displayName, peers.length, "->", filteredPeers.length);

    // Handle control button clicks
    const handleMuteToggle = () => {
        setIsMuted(!isMuted);
        if (toggleMute) toggleMute();
    };
    
    const handleVideoToggle = () => {
        setIsVideoOff(!isVideoOff);
        if (toggleVideo) toggleVideo();
    };
    
    const handleScreenShare = () => {
        if (isScreenSharing) {
            if (stopScreenShare) stopScreenShare();
        } else {
            if (shareScreen) shareScreen();
        }
        setIsScreenSharing(!isScreenSharing);
    };
    
    const handleLeaveCall = () => {
        window.close(); // Simple close window approach
    };
    
    // If in background mode, only render the minimal necessary components
    if (mode === 'background') {
        return (
            <div className="background-mode">
                <div style={{ display: 'none' }}>
                    <video ref={videoRef} autoPlay muted playsInline></video>
                </div>
            </div>
        );
    }

    // Otherwise render the full UI
    return (
        <div className="video-call-container">
            <div className="video-grid">
                <div className="video-item self-video">
                    <Display 
                        displayName={displayName + " (self)"} 
                        videoRef={videoRef} 
                        isMuted={isMuted}
                        isVideoOff={isVideoOff}
                    />
                </div>
                
                {filteredPeers.map(peer => (
                    <div key={peer.id} className="video-item">
                        <Peer 
                            peerId={peer.id} 
                            displayName={peer.displayName} 
                            consumerTransport={consumerTransport} 
                            srr={socket} 
                            audioEnabled={peer.audioEnabled}
                            videoEnabled={peer.videoEnabled}
                        />
                        {/* Hidden audio element for peer's audio */}
                        <audio id={`audio-${peer.id}`} autoPlay playsInline className="hidden"></audio>
                    </div>
                ))}
            </div>
            
            <div className="controls-container">
                <button 
                    className={`control-button ${isMuted ? 'active' : ''}`} 
                    onClick={handleMuteToggle}
                >
                    <i className={`fas fa-${isMuted ? 'microphone-slash' : 'microphone'}`}></i>
                </button>
                
                <button 
                    className={`control-button ${isVideoOff ? 'active' : ''}`} 
                    onClick={handleVideoToggle}
                >
                    <i className={`fas fa-${isVideoOff ? 'video-slash' : 'video'}`}></i>
                </button>
                
                <button 
                    className={`control-button ${isScreenSharing ? 'screen-share-active' : ''}`} 
                    onClick={handleScreenShare}
                >
                    <i className="fas fa-desktop"></i>
                </button>
                
                <button 
                    className="control-button leave-call" 
                    onClick={handleLeaveCall}
                >
                    <i className="fas fa-phone-slash"></i>
                </button>
            </div>
        </div>
    );
}