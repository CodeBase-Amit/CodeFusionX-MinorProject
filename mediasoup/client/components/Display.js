import React, { useEffect } from "react";

export default function Display({displayName, videoRef, videoStatus = "ready", style}) {
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

    // Render different UI based on video status
    const renderVideoStatus = () => {
        if (videoStatus === "loading") {
            return (
                <div style={{
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '14px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '5px 10px',
                    borderRadius: '4px'
                }}>
                    Loading video...
                </div>
            );
        }
        
        if (videoStatus === "paused") {
            return (
                <div style={{
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '14px',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '5px 10px',
                    borderRadius: '4px'
                }}>
                    Video paused
                </div>
            );
        }
        
        return null;
    };

    return (
        <>
            <div style={style}>
                <div style={{textAlign: "center", fontWeight: "bold", padding: "5px"}}>
                    {displayName}
                </div>
                <div style={{
                    height: "200px", 
                    width: "96%", 
                    margin: "0px auto", 
                    backgroundColor: "#f0f0f0", 
                    borderRadius: "8px", 
                    overflow: "hidden",
                    position: "relative"
                }}>
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        style={{width: "100%", height: "100%", objectFit: "cover"}}
                    ></video>
                    {renderVideoStatus()}
                </div>
            </div>
        </>
    )
}