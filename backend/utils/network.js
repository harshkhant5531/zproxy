const os = require("os");

/**
 * Gets the local IPv4 address of the machine, or the production frontend URL.
 * @returns {string} The local IPv4 address, FRONTEND_URL, or "localhost".
 */
function getLocalIp() {
    // If in production, getting the local container IP is incorrect for QR codes.
    // Use the FRONTEND_URL if provided, otherwise default to null so the frontend uses its own origin.
    if (process.env.NODE_ENV === "production") {
        return process.env.FRONTEND_URL || null;
    }

    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

// Simple test when run directly
if (require.main === module) {
    console.log("Detected Local IP:", getLocalIp());
}

module.exports = { getLocalIp };
