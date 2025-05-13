import React, { useEffect } from "react";

export default function Display({
    displayName, 
    videoRef, 
    videoStatus = "ready", 
    isMuted = false,
    isVideoOff = false,
    style
}) {
    useEffect(() => {
        // When video element is available
        if (videoRef && videoRef.current) {
            const video = videoRef.current;
            video.muted = displayName.includes("(self)"); // Only mute own video
            
            // Handle autoplay issues
            video.onloadedmetadata = () => {
                console.log(`Video metadata loaded for ${displayName}`);
                video.play().catch(error => {
                    console.warn(`Autoplay failed for ${displayName}:`, error);
                    // If autoplay fails, try with muted (browsers allow muted autoplay)
                    if (!video.muted) {
                        video.muted = true;
                        video.play().catch(e => 
                            console.error(`Even muted play failed for ${displayName}:`, e)
                        );
                    }
                });
            };
        }
    }, [videoRef, displayName]);

    // Format display name - remove (self) suffix for UI display
    const formattedName = displayName.replace(" (self)", "");
    const isSelf = displayName.includes("(self)");
    
    // Initial letter for the placeholder
    const initial = formattedName.charAt(0).toUpperCase();

    return (
        <div className="video-frame" style={style}>
            {/* Media status indicators */}
            <div className="media-status">
                <div className={`status-icon ${!isMuted ? 'active' : 'disabled'}`}>
                    <i className={`fas fa-${isMuted ? 'microphone-slash' : 'microphone'}`}></i>
                </div>
                <div className={`status-icon ${!isVideoOff ? 'active' : 'disabled'}`}>
                    <i className={`fas fa-${isVideoOff ? 'video-slash' : 'video'}`}></i>
                </div>
            </div>
            
            {/* Participant name */}
            <div className="participant-name">
                {formattedName} {isSelf && <span>(You)</span>}
            </div>
            
            {/* Video placeholder when video is off */}
            {isVideoOff && (
                <div className="video-placeholder">
                    <span className="initial-avatar">{initial}</span>
                </div>
            )}
            
            {/* Status overlays */}
            {videoStatus === "loading" && !isVideoOff && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                    <span>Connecting...</span>
                </div>
            )}
            
            {videoStatus === "paused" && !isVideoOff && (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>Video paused</span>
                </div>
            )}
            
            {/* Video element */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={isVideoOff ? 'hidden' : ''}
            ></video>
        </div>
    );
}