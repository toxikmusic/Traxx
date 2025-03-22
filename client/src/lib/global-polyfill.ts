/**
 * Global Polyfill
 * 
 * This file provides compatibility for libraries designed for Node.js
 * that expect a global object in the browser environment.
 */

// Make window.global available for libraries that expect it
if (typeof window !== 'undefined') {
  // @ts-ignore - we're deliberately adding a property to window
  window.global = window;
}

// For libraries that try to access global directly (without window reference)
if (typeof global === 'undefined') {
  // @ts-ignore - global does not exist in browser scope
  window.global = window;
}

export {};