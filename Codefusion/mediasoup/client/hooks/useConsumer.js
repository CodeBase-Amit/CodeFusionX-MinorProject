import React, { useEffect } from "react";

export function useConsumer(peerId, displayName, srr, consumerTransport, videoRef, audioRef) {

    // Add retry consumption capability to improve video playback reliability
    async function attemptResumeConsumer(consumerId) {
        if (!srr) return;
        
        console.log(`Attempting to explicitly resume consumer ${consumerId}`);
        try {
            await srr.notify('resumeConsumer', { consumerId });
            console.log(`Successfully sent resume request for consumer ${consumerId}`);
        } catch (error) {
            console.error(`Failed to resume consumer ${consumerId}:`, error);
        }
    }

    useEffect(() => {
        // Don't attempt to consume if any of these are missing
        if (!srr || !consumerTransport || !peerId) {
            console.log("Missing required dependencies for consumer:", { 
                hasSrr: !!srr, 
                hasConsumerTransport: !!consumerTransport, 
                peerId 
            });
            return;
        }

        console.log(`Attempting to consume from peer ${peerId} with name ${displayName}`);

        // Track active consumers for cleanup
        const activeConsumers = [];
        
        // Set up periodic retry for video that isn't playing
        let retryInterval;
        
        function setupRetryMechanism() {
            // Clear any existing interval
            if (retryInterval) clearInterval(retryInterval);
            
            // Check every 5 seconds if video is playing and if not, try to resume consumer
            retryInterval = setInterval(() => {
                if (!videoRef.current) return;
                
                const video = videoRef.current;
                
                if (video.paused || video.readyState < 2) {
                    console.log(`Video for ${displayName} is not playing properly, attempting recovery...`);
                    
                    // Try to resume all active consumers
                    activeConsumers.forEach(consumer => {
                        if (consumer.kind === 'video') {
                            attemptResumeConsumer(consumer.id);
                        }
                    });
                    
                    // Also try to replay the video
                    if (video.srcObject) {
                        video.muted = true; // Temporarily mute to help with autoplay
                        video.play().catch(e => {
                            console.warn("Retry play attempt failed:", e);
                        });
                    }
                }
            }, 5000);
        }

        // Helper function to store consumer in active list
        function addActiveConsumer(consumer) {
            activeConsumers.push(consumer);
            consumer._internalId = consumer.id; // Store ID for recovery
        }

        // Create a single MediaStream for each kind (audio/video)
        const mediaStreams = {
            audio: null,
            video: null
        };

        async function consumeFromPeer() {
            try {
                console.log(`Requesting to consume peer: ${peerId}`);
                const { consumerDetailsArray } = await srr.request('consume', { peerId });
                
                console.log(`Received ${consumerDetailsArray.length} consumer details for peer ${peerId}:`, consumerDetailsArray);
            
                for (const consumerDetails of consumerDetailsArray) {
                    const { producerId, id, kind, rtpParameters } = consumerDetails;
            
                    console.log(`Processing consumer for ${kind} from peer ${peerId}`);
                    console.log(`Consumer details:`, { id, kind, producerId });
            
                    try {
                        const consumer = await consumerTransport.consume({ 
                            id, 
                            producerId, 
                            kind, 
                            rtpParameters 
                        });
                        
                        console.log(`Created consumer for ${kind} from peer ${peerId}`, consumer);
                        addActiveConsumer(consumer);
                        
                        // Create a stream if we don't have one for this kind yet
                        if (!mediaStreams[kind]) {
                            mediaStreams[kind] = new MediaStream();
                        }
                        mediaStreams[kind].addTrack(consumer.track);
                        
                        console.log(`Added track to ${kind} MediaStream:`, consumer.track);
            
                        if (kind === 'video') {
                            const video = videoRef.current;
    
                            // if video element is null, log an error and return
                            if (!video) {
                                console.error(`useConsumer | error: invalid video element for "${displayName}"`);
                                continue;
                            }
    
                            console.log(`Setting video srcObject for ${displayName}`);
                            video.srcObject = mediaStreams.video;
                            video.autoplay = true;
                            video.muted = false;
                            
                            // Force a reload of the video element
                            try {
                                video.load();
                            } catch (e) {
                                console.warn("Video load failed, continuing with play");
                            }
                            
                            try {
                                console.log(`Attempting to play video for peer ${peerId}`);
                                await video.play();
                                console.log(`Successfully playing video for peer ${peerId}`);
                            } catch (error) {
                                console.error(`Video play failed for ${displayName}:`, error.message);
                                // Auto-play might be blocked, add a play button or try again
                                video.muted = true;
                                try {
                                    await video.play();
                                    console.log("Playing muted video as fallback");
                                } catch (e) {
                                    console.error("Even muted video playback failed:", e);
                                }
                            }
                            
                            // resume the paused consumers
                            console.log(`Resuming consumer ${id} for peer ${peerId}`);
                            srr.notify('resumeConsumer', { consumerId: id });
                            console.log(`Resumed consumer ${id} for peer ${peerId}`);

                            // Check if video is actually playing
                            setTimeout(() => {
                                if (video.paused) {
                                    console.warn(`Video for ${displayName} is still paused after resuming consumer`);
                                    video.muted = true;
                                    video.play().catch(e => console.error("Delayed play attempt failed:", e));
                                } else {
                                    console.log(`Video for ${displayName} is playing successfully`);
                                }
                            }, 2000);
    
                        } else if (kind === 'audio') {
                            const audio = audioRef.current;
    
                            // if audio element is null, log an error and return
                            if (!audio) {
                                console.error(`useConsumer | error: invalid audio element for "${displayName}"`);
                                continue;
                            }
    
                            console.log(`Setting audio srcObject for ${displayName}`);
                            audio.srcObject = mediaStreams.audio;
                            audio.autoplay = true;
                            
                            try {
                                await audio.play();
                                console.log(`Successfully playing audio for peer ${peerId}`);
                            } catch (error) {
                                console.error(`Audio play failed for ${displayName}:`, error.message);
                            }
                        }
                    } catch (error) {
                        console.error(`Error consuming ${kind} from peer ${peerId}:`, error);
                    }
                }
                
            } catch (error) {
                console.error(`Error consuming from peer ${peerId}:`, error);
            }
        }

        let initialSetupCompleted = false;

        consumeFromPeer()
        .then(() => {
            console.log(`Setting up retry mechanism for peer ${peerId}`);
            setupRetryMechanism();
            initialSetupCompleted = true;
        })
        .catch((error) => {
            console.log(`Error while consuming from peer ${peerId}:`, error);
        });
        
        // Cleanup function
        return () => {
            console.log(`Cleaning up consumer for peer ${peerId}`);
            
            if (retryInterval) {
                clearInterval(retryInterval);
            }
            
            activeConsumers.forEach(consumer => {
                try {
                    consumer.close();
                } catch (e) {
                    console.warn(`Error closing consumer:`, e);
                }
            });

            // Clear video and audio elements
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            
            if (audioRef.current) {
                audioRef.current.srcObject = null;
            }
        };
        
    }, [peerId, displayName, srr, consumerTransport, videoRef, audioRef]); // Add all dependencies
}
