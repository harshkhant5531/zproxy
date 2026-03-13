const os = require("os");

/**
 * Gets the local IPv4 address of the machine, or the production frontend URL.
 * @returns {string|null} The local IPv4 address, FRONTEND_URL, "localhost", or null in production without FRONTEND_URL.
 */
function getLocalIp() {
    // If in production, local container IP is usually not routable from clients.
    // Use FRONTEND_URL when available, otherwise default to null so frontend uses its own origin.
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
