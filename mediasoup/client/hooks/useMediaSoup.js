import { useState, useEffect } from "react";
import * as mediasoup from 'mediasoup-client';

export function useMediaSoup(socket, videoRef, displayName) {
    const [consumerTransport, setConsumerTransport] = useState(null);

    useEffect(() => {
        if(!socket || !displayName) return;
        
        let device = null;
        let producerTransport = null;
        let consumerTransport = null;

        console.log("Setting up MediaSoup with displayName:", displayName);

        // Clean up function to close transports when component unmounts or displayName changes
        const cleanup = () => {
            if(producerTransport) {
                producerTransport.close();
            }
            if(consumerTransport) {
                consumerTransport.close();
            }
        };
    
        setupMediasoup()
        .then(()=> {
            console.log("MediaSoup setup completed successfully");
            setConsumerTransport(consumerTransport);
        })
        .catch((error)=>{
            console.log('Error while starting MediaSoup: ', error);
        });
        
        /**
         * Setup the mediasoup device, create the producer and consumer transports, publish media and join the room
         */
        async function setupMediasoup() {
            console.log("Getting router RTP capabilities");
            const data = await socket.request('getRouterRtpCapabilities');
        
            await loadDevice(data);
            await createProducerTransport();
            await createConsumerTransport();
            await publish();
            await join();
        }
        
        async function loadDevice(routerRtpCapabilities) {
            console.log("Loading MediaSoup device");
            device = new mediasoup.Device();
            await device.load({ routerRtpCapabilities });
            console.log("MediaSoup device loaded successfully");
        }
        
        async function createProducerTransport() {
            console.log("Creating producer transport");
            const data = await socket.request('createProducerTransport');
        
            producerTransport = device.createSendTransport(data);
            producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                console.log("Connecting producer transport");
                socket.request('connectProducerTransport', { dtlsParameters })
                    .then(callback)
                    .catch(errback);
            });
            
            producerTransport.on('connectionstatechange', (state) => {
                console.log(`Producer transport connection state changed to: ${state}`);
                if (state == 'failed') {
                    producerTransport.close();
                    console.log('Producer transport connection failed');
                }
            });
        
            producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                try {
                    console.log(`Producing ${kind}`);
                    const { id } = await socket.request('produce', {
                        transportId : producerTransport.id,
                        kind,
                        rtpParameters
                    });
        
                    callback({ id });
                } catch (error) {
                    errback(error);
                }
            });
        
        }
        
        async function createConsumerTransport() {
            console.log("Creating consumer transport");
            const data = await socket.request('createConsumerTransport');
        
            consumerTransport = device.createRecvTransport(data);
        
            consumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                console.log("Connecting consumer transport");
                socket.request('connectConsumerTransport', { dtlsParameters })
                    .then(callback)
                    .catch(errback);
            });
        
            consumerTransport.on('connectionstatechange', async (state) => {
                console.log(`Consumer transport connection state changed to: ${state}`);
                if (state == 'failed') {
                    consumerTransport.close();
                    console.error('Consumer transport connection failed');
                }
                
            });
        }
        
        async function join() {
            console.log(`Joining room with displayName: ${displayName}`);
            const { rtpCapabilities } = device;
            
            // Get URL parameters for roomId
            const params = new URLSearchParams(window.location.search);
            const roomId = params.get("roomId") || "default-room";
            
            console.log(`Joining room: ${roomId} as ${displayName}`);
            const joinResult = await socket.request('join', { 
                rtpCapabilities, 
                displayName,
                roomId 
            });
            
            console.log("Successfully joined room:", joinResult);
        }
        
        async function publish() {
            try {
                console.log("Publishing media streams");
                
                // Store the producers for potential cleanup
                const producers = [];
                
                // Produce video and audio sequentially
                const videoProducer = await produceUserVideo();
                if (videoProducer) {
                    console.log("Video producer successful");
                    producers.push(videoProducer);
                }
                
                const audioProducer = await produceUserAudio();
                if (audioProducer) {
                    console.log("Audio producer successful");
                    producers.push(audioProducer);
                }
                
                console.log(`Media streams published successfully (${producers.length} producers)`);
                return producers;
            } catch (error) {
                console.error("Error publishing media:", error.message);
            }
        }
        
        async function produceUserVideo() {
            if (!device.canProduce('video')) {
                throw Error('Cannot produce video');
            }
        
            console.log("Getting user video");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                } 
            });
            const track = stream.getVideoTracks()[0];

            const video = videoRef.current;
            if (!video) {
                console.error("Video element reference is null");
                return;
            }

            video.srcObject = stream;
            console.log("Video stream attached to video element");

            // Check track details for debugging
            console.log("Video track details:", {
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted,
                constraints: track.getConstraints()
            });

            const producer = await producerTransport.produce({ track });
            console.log("Video producer created successfully with ID:", producer.id);
            
            // Set up producer event handlers
            producer.on('trackended', () => {
                console.log('Video track ended');
            });
            
            producer.on('transportclose', () => {
                console.log('Video transport closed');
            });
            
            // Handle track changes
            track.addEventListener('ended', () => {
                console.log('Local video track ended');
            });
            
            track.addEventListener('mute', () => {
                console.log('Local video track muted');
            });
            
            track.addEventListener('unmute', () => {
                console.log('Local video track unmuted');
            });
            
            return producer;
        }
        
        async function produceUserAudio() {
            if (!device.canProduce('audio')) {
                throw Error('Cannot produce audio');
            }
        
            console.log("Getting user audio");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            const track = stream.getAudioTracks()[0];
            
            // Check track details for debugging
            console.log("Audio track details:", {
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted,
                constraints: track.getConstraints()
            });
            
            const producer = await producerTransport.produce({ track });
            console.log("Audio producer created successfully with ID:", producer.id);
            
            // Set up producer event handlers
            producer.on('trackended', () => {
                console.log('Audio track ended');
            });
            
            producer.on('transportclose', () => {
                console.log('Audio transport closed');
            });
            
            // Handle track changes
            track.addEventListener('ended', () => {
                console.log('Local audio track ended');
            });
            
            track.addEventListener('mute', () => {
                console.log('Local audio track muted');
            });
            
            track.addEventListener('unmute', () => {
                console.log('Local audio track unmuted');
            });
            
            return producer;
        }

        // Return cleanup function
        return cleanup;

    }, [socket, displayName]); // Add displayName as a dependency

    return {
        consumerTransport
    }
}

