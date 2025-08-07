// Keep-alive configuration for preventing server sleep
export const KEEP_ALIVE_CONFIG = {
  // Only run in production (Render deployment)
  enabled: import.meta.env.PROD,
  
  // Initial delay before first ping (30 seconds)
  initialDelay: 30 * 1000,
  
  // Interval between pings (5 minutes)
  // Render free tier spins down after ~15 minutes of inactivity
  interval: 5 * 60 * 1000,
  
  // Enable logging of ping status
  logging: true,
} as const

export type KeepAliveConfig = typeof KEEP_ALIVE_CONFIG
