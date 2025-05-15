import { useState, useEffect } from "react";
import * as mediasoup from 'mediasoup-client';

export function useMediaSoup(socket, videoRef, displayName) {
    const [consumerTransport, setConsumerTransport] = useState(null);
    const [videoProducer, setVideoProducer] = useState(null);
    const [audioProducer, setAudioProducer] = useState(null);
    const [screenProducer, setScreenProducer] = useState(null);
    const [producerTransport, setProducerTransport] = useState(null);
    const [device, setDevice] = useState(null);
    const [videoTrack, setVideoTrack] = useState(null);
    const [audioTrack, setAudioTrack] = useState(null);

    useEffect(() => {
        if(!socket || !displayName) return;
        
        let localDevice = null;
        let localProducerTransport = null;
        let localConsumerTransport = null;

        console.log("Setting up MediaSoup with displayName:", displayName);

        // Clean up function to close transports when component unmounts or displayName changes
        const cleanup = () => {
            if(localProducerTransport) {
                localProducerTransport.close();
            }
            if(localConsumerTransport) {
                localConsumerTransport.close();
            }
        };
    
        setupMediasoup()
        .then(()=> {
            console.log("MediaSoup setup completed successfully");
            setConsumerTransport(localConsumerTransport);
            setProducerTransport(localProducerTransport);
            setDevice(localDevice);
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
            localDevice = new mediasoup.Device();
            await localDevice.load({ routerRtpCapabilities });
            console.log("MediaSoup device loaded successfully");
        }
        
        async function createProducerTransport() {
            console.log("Creating producer transport");
            const data = await socket.request('createProducerTransport');
        
            localProducerTransport = localDevice.createSendTransport(data);
            localProducerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                console.log("Connecting producer transport");
                socket.request('connectProducerTransport', { dtlsParameters })
                    .then(callback)
                    .catch(errback);
            });
            
            localProducerTransport.on('connectionstatechange', (state) => {
                console.log(`Producer transport connection state changed to: ${state}`);
                if (state == 'failed') {
                    localProducerTransport.close();
                    console.log('Producer transport connection failed');
                }
            });
        
            localProducerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                try {
                    console.log(`Producing ${kind}`);
                    const { id } = await socket.request('produce', {
                        transportId : localProducerTransport.id,
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
        
            localConsumerTransport = localDevice.createRecvTransport(data);
        
            localConsumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
                console.log("Connecting consumer transport");
                socket.request('connectConsumerTransport', { dtlsParameters })
                    .then(callback)
                    .catch(errback);
            });
        
            localConsumerTransport.on('connectionstatechange', async (state) => {
                console.log(`Consumer transport connection state changed to: ${state}`);
                if (state == 'failed') {
                    localConsumerTransport.close();
                    console.error('Consumer transport connection failed');
                }
                
            });
        }
        
        async function join() {
            console.log(`Joining room with displayName: ${displayName}`);
            const { rtpCapabilities } = localDevice;
            
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
                const vProducer = await produceUserVideo();
                if (vProducer) {
                    console.log("Video producer successful");
                    producers.push(vProducer);
                    setVideoProducer(vProducer);
                }
                
                const aProducer = await produceUserAudio();
                if (aProducer) {
                    console.log("Audio producer successful");
                    producers.push(aProducer);
                    setAudioProducer(aProducer);
                }
                
                console.log(`Media streams published successfully (${producers.length} producers)`);
                return producers;
            } catch (error) {
                console.error("Error publishing media:", error.message);
            }
        }
        
        async function produceUserVideo() {
            if (!localDevice.canProduce('video')) {
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
            setVideoTrack(track);

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
        
            const producer = await localProducerTransport.produce({ track });
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
            if (!localDevice.canProduce('audio')) {
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
            setAudioTrack(track);
            
            // Check track details for debugging
            console.log("Audio track details:", {
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted,
                constraints: track.getConstraints()
            });
            
            const producer = await localProducerTransport.produce({ track });
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

    // Toggle mute on local audio track
    const toggleMute = () => {
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            console.log(`Audio ${audioTrack.enabled ? 'unmuted' : 'muted'}`);
            
            // Broadcast media state change to other peers
            if (socket) {
                try {
                    socket.notify('mediaStateChanged', {
                        type: 'audio',
                        enabled: audioTrack.enabled
                    });
                    console.log(`Broadcasted audio state: ${audioTrack.enabled}`);
                } catch (error) {
                    console.error('Error broadcasting audio state:', error);
                }
            }
            
            return audioTrack.enabled;
        }
        return false;
    };
    
    // Toggle video on/off
    const toggleVideo = () => {
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            console.log(`Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
            
            // Broadcast media state change to other peers
            if (socket) {
                try {
                    socket.notify('mediaStateChanged', {
                        type: 'video',
                        enabled: videoTrack.enabled
                    });
                    console.log(`Broadcasted video state: ${videoTrack.enabled}`);
                } catch (error) {
                    console.error('Error broadcasting video state:', error);
                }
            }
            
            return videoTrack.enabled;
        }
        return false;
    };
    
    // Screen sharing functionality
    const shareScreen = async () => {
        if (!producerTransport || !device) return false;
        
        try {
            // Get screen sharing stream
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true,
                audio: false
            });
            
            const track = stream.getVideoTracks()[0];
            
            // Replace video track in the video element
            if (videoRef.current) {
                const oldStream = videoRef.current.srcObject;
                const newStream = new MediaStream([track]);
                
                // If there's an audio track, add it to the new stream
                if (oldStream) {
                    const audioTracks = oldStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        newStream.addTrack(audioTracks[0]);
                    }
                }
                
                videoRef.current.srcObject = newStream;
            }
            
            // Create a new producer for screen sharing
            const producer = await producerTransport.produce({ track });
            
            // Set up event handlers
            track.addEventListener('ended', () => {
                console.log('Screen sharing ended by user');
                stopScreenShare();
            });
            
            setScreenProducer(producer);
            console.log("Screen sharing started");
            return true;
        } catch (error) {
            console.error("Error sharing screen:", error);
            return false;
        }
    };
    
    // Stop screen sharing
    const stopScreenShare = async () => {
        if (screenProducer) {
            screenProducer.close();
            setScreenProducer(null);
            
            // Restore video track
            if (videoRef.current && videoTrack) {
                const newStream = new MediaStream([videoTrack]);
                
                // If there's an audio track, add it to the new stream
                if (audioTrack) {
                    newStream.addTrack(audioTrack);
                }
                
                videoRef.current.srcObject = newStream;
            }
            
            console.log("Screen sharing stopped");
            return true;
        }
        return false;
    };

    return {
        consumerTransport,
        toggleMute,
        toggleVideo,
        shareScreen,
        stopScreenShare,
        isScreenSharing: !!screenProducer
    };
}

