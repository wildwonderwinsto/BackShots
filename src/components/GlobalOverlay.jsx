import React from 'react';

// 1. Create a FAKE socket. 
// This prevents the app from actually connecting to the server, 
// but keeps the "socket" object existing so other files don't crash.
export const socket = {
  on: () => {},
  emit: () => {},
  off: () => {},
  connect: () => {},
  disconnect: () => {}
};

// 2. Create an EMPTY component.
// This replaces your complex logic with a function that does nothing.
const GlobalOverlay = () => {
  return null; // Returns nothing, renders nothing, runs no code.
};

export default GlobalOverlay;

