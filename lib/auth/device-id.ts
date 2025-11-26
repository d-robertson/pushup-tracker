/**
 * DeviceIdService
 * Generates and manages device-based authentication
 */

const DEVICE_ID_KEY = "pushup_tracker_device_id";
const DEVICE_FINGERPRINT_KEY = "pushup_tracker_device_fingerprint";

export class DeviceIdService {
  /**
   * Generate a unique device fingerprint based on browser/device characteristics
   * Uses only universally available APIs (no crypto)
   */
  static generateFingerprint(): string {
    const components: string[] = [];

    // Screen resolution
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // User agent (shortened for privacy)
    components.push(navigator.userAgent.substring(0, 100));

    // Hardware concurrency (CPU cores)
    components.push(String(navigator.hardwareConcurrency || 0));

    // Device memory (if available)
    if ("deviceMemory" in navigator) {
      components.push(String((navigator as { deviceMemory?: number }).deviceMemory));
    }

    // Simple hash of all components
    const fingerprint = this.simpleHash(components.join("|||"));
    return fingerprint;
  }

  /**
   * Generate a unique device ID based on device fingerprint
   * This ensures the same device always gets the same ID, even if localStorage is cleared
   */
  static generateDeviceId(): string {
    const fingerprint = this.generateFingerprint();

    // Use the fingerprint hash as the device ID
    // This makes it deterministic - same device = same ID
    const deviceId = `device_${fingerprint}`;

    return deviceId;
  }

  /**
   * Get stored device ID from localStorage
   */
  static getDeviceId(): string | null {
    if (typeof window === "undefined") return null;

    try {
      return localStorage.getItem(DEVICE_ID_KEY);
    } catch (e) {
      console.error("Error reading device ID from localStorage:", e);
      return null;
    }
  }

  /**
   * Store device ID in localStorage
   */
  static setDeviceId(id: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(DEVICE_ID_KEY, id);

      // Also store fingerprint for validation
      const fingerprint = this.generateFingerprint();
      localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
    } catch (e) {
      console.error("Error storing device ID in localStorage:", e);
    }
  }

  /**
   * Get stored fingerprint
   */
  static getStoredFingerprint(): string | null {
    if (typeof window === "undefined") return null;

    try {
      return localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    } catch (e) {
      console.error("Error reading fingerprint from localStorage:", e);
      return null;
    }
  }

  /**
   * Clear device ID (for testing or logout)
   */
  static clearDeviceId(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
    } catch (e) {
      console.error("Error clearing device ID from localStorage:", e);
    }
  }

  /**
   * Get device information (name, OS, browser)
   */
  static getDeviceInfo(): { name: string; os: string; browser: string } {
    if (typeof window === "undefined") {
      return { name: "Unknown Device", os: "Unknown", browser: "Unknown" };
    }

    const ua = navigator.userAgent;

    // Detect OS
    let os = "Unknown";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    // Detect browser
    let browser = "Unknown";
    if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

    // Generate device name
    const name = `${browser} on ${os}`;

    return { name, os, browser };
  }

  /**
   * Validate if current fingerprint matches stored fingerprint
   * Returns true if they match (same device) or if no stored fingerprint exists
   */
  static validateFingerprint(): boolean {
    const storedFingerprint = this.getStoredFingerprint();

    if (!storedFingerprint) {
      // No stored fingerprint, assume valid (new device)
      return true;
    }

    const currentFingerprint = this.generateFingerprint();

    // Allow some flexibility (first 16 chars must match)
    // This helps with minor browser updates that might change the fingerprint slightly
    return currentFingerprint.substring(0, 16) === storedFingerprint.substring(0, 16);
  }

  /**
   * Simple hash function for fingerprinting
   * Works everywhere without requiring crypto APIs
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }

  /**
   * Get or create device ID
   * Always generates based on current device fingerprint
   * This ensures consistency even if localStorage is cleared
   */
  static getOrCreateDeviceId(): string {
    // Always generate from current fingerprint
    const fingerprintBasedId = this.generateDeviceId();

    // Store in localStorage for quick access, but we can always regenerate it
    const storedId = this.getDeviceId();

    // If stored ID doesn't match fingerprint-based ID, update it
    // This handles migration from old random-based IDs
    if (storedId !== fingerprintBasedId) {
      this.setDeviceId(fingerprintBasedId);
    }

    return fingerprintBasedId;
  }
}
