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
              onlinePeers.set(data.id, data);
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
                onlinePeers.set(otherPeer.id, otherPeer);
              }
              updatePeersState();
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

  return {
    peers,
    socket
  };
}
