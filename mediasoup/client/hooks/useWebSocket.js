import { useState, useEffect } from 'react';
import SockRR from '../libs/sockrr-client';

export function useWebSocket(webSocketUrl) {
  const [peers, setPeers] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const onlinePeers = new Map();

    function updatePeersState() {
      setPeers([...onlinePeers.values()]);
    }

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("roomId") || "default-room";
    const username = params.get("username") || "User-" + Math.floor(Math.random() * 1000);

    console.log("WebSocket connecting to:", webSocketUrl);
    console.log("Room parameters:", {roomId, username});

    SockRR(webSocketUrl)
      .then((srr) => {
        console.log("WebSocket connection established");
        
        setSocket(srr);
        
        srr.onNotification((method, data = {}) => {
          switch (method) {
            case 'peerJoined':
              console.log(`Peer joined: ${data.displayName} (${data.id})`);
              onlinePeers.set(data.id, {
                ...data,
                audioEnabled: true,
                videoEnabled: true
              });
              updatePeersState();
              break;
            case 'peerLeft':
              console.log(`Peer left: ${data.id}`);
              onlinePeers.delete(data.id);
              updatePeersState();
              break;
            case 'setAvailablePeers':
              onlinePeers.clear();
              const { otherPeerDetails } = data;
              console.log(`Received ${otherPeerDetails.length} available peers`);
              for (const otherPeer of otherPeerDetails) {
                console.log(`Available peer: ${otherPeer.displayName} (${otherPeer.id})`);
                onlinePeers.set(otherPeer.id, {
                  ...otherPeer,
                  audioEnabled: true,
                  videoEnabled: true
                });
              }
              updatePeersState();
              break;
            case 'peerMediaStateChanged':
              const { peerId, type, enabled } = data;
              console.log(`Peer ${peerId} ${type} state changed to ${enabled ? 'enabled' : 'disabled'}`);
              
              const peer = onlinePeers.get(peerId);
              if (peer) {
                if (type === 'audio') {
                  peer.audioEnabled = enabled;
                } else if (type === 'video') {
                  peer.videoEnabled = enabled;
                }
                onlinePeers.set(peerId, peer);
                updatePeersState();
              }
              break;
            default:
              console.log(`${method} method has no case handler`);
          }
        });

        srr.onClose(() => {
          console.error('WebSocket connection closed');
        });
      })
      .catch((e) => {
        console.error('Error connecting to server: ', e);
      });

  }, [webSocketUrl]);

  // Add keep-alive handling to keep the WebSocket connection active
  useEffect(() => {
    // Listen for keep-alive events
    const handleKeepAlive = () => {
      if (socket) {
        console.log("WebSocket keep-alive ping");
        // Send a minimal ping to keep the connection active
        try {
          socket.request("ping", {}).catch(err => {
            console.warn("WebSocket ping failed:", err);
          });
        } catch (e) {
          console.warn("Error sending WebSocket ping:", e);
        }
      }
    };

    // Listen for keep-alive events from parent window
    window.addEventListener('keep-alive', handleKeepAlive);
    
    // Set up periodic ping when hidden
    let keepAlivePing;
    
    const handleVisibilityChange = () => {
      if (document.hidden && window.__keepActive) {
        // When hidden, set up a periodic ping
        keepAlivePing = setInterval(handleKeepAlive, 30000); // Every 30 seconds
      } else {
        // When visible, clear the interval
        if (keepAlivePing) {
          clearInterval(keepAlivePing);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keep-alive', handleKeepAlive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (keepAlivePing) {
        clearInterval(keepAlivePing);
      }
    };
  }, [socket]);

  return {
    peers,
    socket
  };
}
