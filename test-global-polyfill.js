/**
 * Simple test script to verify if the global polyfill works
 */

// Since we're running in Node.js, no need to polyfill global
const SimplePeer = require('simple-peer');

// Just check if SimplePeer is properly loaded and accessible
console.log('SimplePeer imported successfully');
console.log('Simple Peer WebRTC Support:', SimplePeer.WEBRTC_SUPPORT);

// Try to create a peer instance
try {
  const peer = new SimplePeer({
    initiator: true,
    trickle: false
  });
  console.log('Successfully created Simple Peer instance');
  
  // Set up basic event listeners
  peer.on('signal', data => {
    console.log('Generated signaling data:', data);
  });
  
  peer.on('error', err => {
    console.error('Simple Peer error:', err);
  });
  
  // Clean up
  setTimeout(() => {
    peer.destroy();
    console.log('Peer destroyed');
  }, 1000);
  
} catch (error) {
  console.error('Failed to create Simple Peer instance:', error);
}