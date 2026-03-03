const os = require("os");

/**
 * Gets the local IPv4 address of the machine.
 * @returns {string} The local IPv4 address or "localhost" if not found.
 */
function getLocalIp() {
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
