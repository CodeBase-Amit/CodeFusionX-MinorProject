import React, {useRef, useState, useEffect} from "react";
import Display from "./Display";
import { useConsumer } from "../hooks/useConsumer";

export default function Peer({peerId, displayName, srr, consumerTransport, audioEnabled = true, videoEnabled = true}){
    const [videoStatus, setVideoStatus] = useState("loading");
    const [remoteMediaState, setRemoteMediaState] = useState({
        audio: audioEnabled,
        video: videoEnabled
    });
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Log when this component renders
    console.log(`Rendering Peer component for ${peerId} (audio: ${audioEnabled}, video: ${videoEnabled})`);
    
    // Update remote media state when props change
    useEffect(() => {
        setRemoteMediaState({
            audio: audioEnabled,
            video: videoEnabled
        });
    }, [audioEnabled, videoEnabled]);

    useEffect(() => {
        // Find audio element in DOM if not directly referenced
        if (!audioRef.current) {
            const audioElement = document.getElementById(`audio-${peerId}`);
            if (audioElement) {
                audioRef.current = audioElement;
            }
        }
        
        console.log(`Setting up media elements for ${displayName}`);
        
        // Monitor video element status
        const checkVideoStatus = () => {
            if (!videoRef.current) return;
            
            const video = videoRef.current;
            
            if (video.readyState >= 2 && !video.paused) {
                console.log(`Video for ${displayName} is playing`);
                setVideoStatus("playing");
            } else if (video.readyState === 0) {
                console.log(`Video for ${displayName} is still loading`);
                setVideoStatus("loading");
            } else if (video.paused) {
                console.log(`Video for ${displayName} is paused`);
                setVideoStatus("paused");
            }
        };
        
        const interval = setInterval(checkVideoStatus, 1000);
        
        // Listen for track muted/ended events to detect when remote peer disables video/audio
        const handleTrackChanges = () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                
                // Check video tracks
                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length > 0) {
                    // Add event listeners to track
                    videoTracks[0].addEventListener('mute', () => {
                        console.log(`Remote video track muted for ${displayName}`);
                    });
                    
                    videoTracks[0].addEventListener('unmute', () => {
                        console.log(`Remote video track unmuted for ${displayName}`);
                    });
                    
                    videoTracks[0].addEventListener('ended', () => {
                        console.log(`Remote video track ended for ${displayName}`);
                    });
                }
            }
            
            if (audioRef.current && audioRef.current.srcObject) {
                const stream = audioRef.current.srcObject;
                
                // Check audio tracks
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    // Add event listeners
                    audioTracks[0].addEventListener('mute', () => {
                        console.log(`Remote audio track muted for ${displayName}`);
                    });
                    
                    audioTracks[0].addEventListener('unmute', () => {
                        console.log(`Remote audio track unmuted for ${displayName}`);
                    });
                    
                    audioTracks[0].addEventListener('ended', () => {
                        console.log(`Remote audio track ended for ${displayName}`);
                    });
                }
            }
        };
        
        // Set up track change listeners after a short delay
        const trackListenerTimeout = setTimeout(handleTrackChanges, 2000);
        
        return () => {
            clearInterval(interval);
            clearTimeout(trackListenerTimeout);
        };
    }, [displayName, videoStatus, peerId]);

    // Use the consumer hook to establish connection
    useConsumer(peerId, displayName, srr, consumerTransport, videoRef, audioRef);

    return (
        <>
            <Display 
                displayName={displayName} 
                videoRef={videoRef} 
                videoStatus={videoStatus}
                isMuted={!remoteMediaState.audio}
                isVideoOff={!remoteMediaState.video}
                style={{width: "100%"}} 
            />
            {/* Audio element is rendered in the parent component to avoid nested rendering issues */}
        </>
    );
}