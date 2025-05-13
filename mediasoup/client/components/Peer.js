import React, {useRef, useState, useEffect} from "react";
import Display from "./Display";
import { useConsumer } from "../hooks/useConsumer";

export default function Peer({peerId, displayName, srr, consumerTransport}){
    const [videoStatus, setVideoStatus] = useState("loading");
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Log when this component renders
    console.log(`Rendering Peer component for ${displayName} (${peerId})`);

    useEffect(() => {
        console.log(`Setting up video element reference for ${displayName}`);
        
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
        
        return () => {
            clearInterval(interval);
        };
    }, [displayName]);

    useConsumer(peerId, displayName, srr, consumerTransport, videoRef, audioRef);

    return (
        <>
            <Display 
                displayName={displayName} 
                videoRef={videoRef} 
                videoStatus={videoStatus}
                style={{width: "200px", display: "inlineBlock", float: "left"}} 
            />
            <audio ref={audioRef} />
        </>
    )
}