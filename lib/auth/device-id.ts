/**
 * DeviceIdService
 * Generates and manages device-based authentication
 */

const DEVICE_ID_KEY = "pushup_tracker_device_id";
const DEVICE_FINGERPRINT_KEY = "pushup_tracker_device_fingerprint";

export class DeviceIdService {
  /**
   * Generate a unique device fingerprint based on browser/device characteristics
   */
  static async generateFingerprint(): Promise<string> {
    const components: string[] = [];

    // Screen resolution
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // User agent
    components.push(navigator.userAgent);

    // Hardware concurrency (CPU cores)
    components.push(String(navigator.hardwareConcurrency || 0));

    // Device memory (if available)
    if ("deviceMemory" in navigator) {
      components.push(String((navigator as { deviceMemory?: number }).deviceMemory));
    }

    // Canvas fingerprint
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 200;
        canvas.height = 50;
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Pushup Tracker 💪", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Pushup Tracker 💪", 4, 17);
        components.push(canvas.toDataURL());
      }
    } catch {
      // Canvas fingerprinting blocked or failed
      components.push("canvas-blocked");
    }

    // WebGL fingerprint
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch {
      // WebGL fingerprinting blocked or failed
      components.push("webgl-blocked");
    }

    // Generate hash from all components
    const fingerprint = await this.hashString(components.join("|||"));
    return fingerprint;
  }

  /**
   * Generate a unique device ID
   */
  static async generateDeviceId(): Promise<string> {
    const fingerprint = await this.generateFingerprint();
    const randomId = crypto.randomUUID();
    const timestamp = Date.now();

    // Combine fingerprint + random UUID + timestamp
    const deviceId = `device_${fingerprint.substring(0, 16)}_${randomId}_${timestamp}`;

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
  static async setDeviceId(id: string): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(DEVICE_ID_KEY, id);

      // Also store fingerprint for validation
      const fingerprint = await this.generateFingerprint();
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
  static async validateFingerprint(): Promise<boolean> {
    const storedFingerprint = this.getStoredFingerprint();

    if (!storedFingerprint) {
      // No stored fingerprint, assume valid (new device)
      return true;
    }

    const currentFingerprint = await this.generateFingerprint();

    // Allow some flexibility (first 16 chars must match)
    // This helps with minor browser updates that might change the fingerprint slightly
    return currentFingerprint.substring(0, 16) === storedFingerprint.substring(0, 16);
  }

  /**
   * Hash a string using SHA-256
   */
  private static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  }

  /**
   * Get or create device ID
   * If device ID exists in localStorage, return it
   * Otherwise, generate a new one and store it
   */
  static async getOrCreateDeviceId(): Promise<string> {
    let deviceId = this.getDeviceId();

    if (!deviceId) {
      deviceId = await this.generateDeviceId();
      await this.setDeviceId(deviceId);
    }

    return deviceId;
  }
}
