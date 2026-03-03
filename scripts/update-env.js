const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Gets the local IPv4 address of the machine.
 */
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

function updateEnvFile(filePath, newIp) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, "utf8");

    // Update VITE_NETWORK_IP
    const ipRegex = /VITE_NETWORK_IP\s*=\s*["']?[\d.]+["']?/g;
    if (ipRegex.test(content)) {
        content = content.replace(ipRegex, `VITE_NETWORK_IP="${newIp}"`);
    } else {
        content += `\nVITE_NETWORK_IP="${newIp}"\n`;
    }

    // Update VITE_API_URL if it exists (usually in root .env)
    const apiUrlRegex = /VITE_API_URL\s*=\s*["']?http:\/\/[\d.]+:(\d+)\/api["']?/g;
    if (apiUrlRegex.test(content)) {
        content = content.replace(apiUrlRegex, (match, port) => `VITE_API_URL="http://${newIp}:${port}/api"`);
    }

    // Update CORS_ORIGIN in backend .env
    const corsRegex = /CORS_ORIGIN\s*=\s*(.*)/g;
    if (corsRegex.test(content)) {
        content = content.replace(corsRegex, (match, origins) => {
            // Simple logic to ensure the new network IP is included in origins
            const originList = origins.replace(/["']/g, '').split(',');
            const baseOrigins = originList.filter(o => !o.includes('localhost') && !/^http:\/\/[\d.]+/.test(o));
            const updatedOrigins = [`http://localhost:8080`, `http://${newIp}:8080`, ...baseOrigins];
            const uniqueOrigins = [...new Set(updatedOrigins)];
            return `CORS_ORIGIN="${uniqueOrigins.join(',')}"`;
        });
    }

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated: ${path.basename(filePath)} with IP ${newIp}`);
}

const localIp = getLocalIp();
const rootDir = path.join(__dirname, "..");
const backendDir = path.join(rootDir, "backend");

console.log(`🚀 Auto-configuring network IP: ${localIp}`);

updateEnvFile(path.join(rootDir, ".env"), localIp);
updateEnvFile(path.join(backendDir, ".env"), localIp);

console.log("✅ Network configuration complete.");
