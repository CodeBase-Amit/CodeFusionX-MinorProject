import React from "react";
import { createRoot } from 'react-dom/client';
import App from './components/App';

let webSocketUrl = "";

// note that IS_STAND_ALONE_CLIENT and WEB_SOCKET_URL are both defined in webpack.config.js
if(IS_STAND_ALONE_CLIENT){ 
    webSocketUrl = WEB_SOCKET_URL;
}
else {
    // derive socket webSocketUrl from window.location
    const loc = window.location;
    const port = loc.port == "" ? "" : `:${loc.port}`;
    const wsProtocol = loc.protocol == "https:" ? "wss" : "ws";

    webSocketUrl = `${wsProtocol}://${loc.hostname}${port}`;
}

// Set up keep-alive functionality
window.__keepAliveCallback = () => {
    // This could be used to trigger some activity to keep the connection active
    console.log("Keep-alive activity triggered");
    
    // For example, you could dispatch an event to keep React components active
    window.dispatchEvent(new CustomEvent('keep-alive'));
};

// Request background audio processing to prevent suspension
try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const audioContext = new AudioContext();
        // Create a silent audio node that keeps the audio context running
        const silentNode = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Silent
        silentNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        silentNode.start();
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && window.__keepActive) {
                // Keep audio context running when page is hidden
                audioContext.resume().catch(e => console.error("Failed to resume audio context:", e));
            }
        });
    }
} catch (error) {
    console.warn("Could not set up background audio:", error);
}

const root = createRoot(document.getElementById('root'));
root.render(<App webSocketUrl={webSocketUrl} />);