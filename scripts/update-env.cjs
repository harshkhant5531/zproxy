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

function normalizeUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "");
}

function parseEnvValue(rawValue) {
  return String(rawValue || "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function getConfiguredEnvValue(envPath, key) {
  if (!fs.existsSync(envPath)) return "";
  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "m"));
  if (!match) return "";
  return parseEnvValue(match[1]);
}

function getConfiguredPublicFrontendUrl(rootEnvPath) {
  const parsed = normalizeUrl(
    getConfiguredEnvValue(rootEnvPath, "PUBLIC_FRONTEND_URL"),
  );
  return /^https?:\/\//i.test(parsed) ? parsed : "";
}

function ensureBackendEnvFile(
  backendEnvPath,
  backendEnvExamplePath,
  databaseUrl,
) {
  if (!fs.existsSync(backendEnvPath)) {
    if (fs.existsSync(backendEnvExamplePath)) {
      fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    } else {
      fs.writeFileSync(
        backendEnvPath,
        "# Auto-created by scripts/update-env.cjs\n",
        "utf8",
      );
    }
    console.log(`Created: ${path.basename(backendEnvPath)}`);
  }

  if (databaseUrl) {
    const content = fs.readFileSync(backendEnvPath, "utf8");
    const updated = upsertEnvValue(content, "DATABASE_URL", databaseUrl);
    fs.writeFileSync(backendEnvPath, updated, "utf8");
    console.log("Synced: DATABASE_URL -> backend/.env");
  }
}

function upsertEnvValue(content, key, value) {
  const keyRegex = new RegExp(`^${key}\\s*=.*$`, "m");
  const line = `${key}="${value}"`;

  if (keyRegex.test(content)) {
    return content.replace(keyRegex, line);
  }

  const separator = content.endsWith("\n") ? "" : "\n";
  return `${content}${separator}${line}\n`;
}

function buildCorsOriginValue(existingValue, newIp, frontendPort, frontendUrl) {
  const originFromIp = `http://${newIp}:${frontendPort}`;
  const originFromLocalhost = `http://localhost:${frontendPort}`;
  const normalizedFrontendUrl = normalizeUrl(frontendUrl);

  const originList = (existingValue || "")
    .replace(/^["']|["']$/g, "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => {
      return !/^http:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+$/i.test(
        origin,
      );
    });

  const originCandidates = [originFromLocalhost, originFromIp, ...originList];
  if (normalizedFrontendUrl) {
    originCandidates.splice(2, 0, normalizedFrontendUrl);
  }

  return originCandidates
    .filter((origin, index, array) => array.indexOf(origin) === index)
    .join(",");
}

function updateEnvFile(filePath, newIp, options = {}) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");

  const isBackendEnv = filePath.includes(path.join("backend", ".env"));
  const frontendUrl =
    normalizeUrl(options.frontendUrl) || `http://${newIp}:8080`;

  content = upsertEnvValue(content, "VITE_NETWORK_IP", newIp);

  if (!isBackendEnv) {
    content = upsertEnvValue(
      content,
      "VITE_API_URL",
      `http://${newIp}:3001/api`,
    );
    if (options.frontendUrl) {
      content = upsertEnvValue(content, "PUBLIC_FRONTEND_URL", frontendUrl);
    }
  }

  if (isBackendEnv) {
    content = upsertEnvValue(content, "FRONTEND_URL", frontendUrl);

    const corsRegex = /^CORS_ORIGIN\s*=\s*(.*)$/m;
    const match = content.match(corsRegex);
    const nextCorsValue = buildCorsOriginValue(
      match ? match[1].trim() : "",
      newIp,
      8080,
      frontendUrl,
    );
    content = upsertEnvValue(content, "CORS_ORIGIN", nextCorsValue);
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Updated: ${path.basename(filePath)} with IP ${newIp}`);
}

const localIp = getLocalIp();
const rootDir = path.join(__dirname, "..");
const backendDir = path.join(rootDir, "backend");
const rootEnvPath = path.join(rootDir, ".env");
const backendEnvPath = path.join(backendDir, ".env");
const backendEnvExamplePath = path.join(backendDir, ".env.example");
const publicFrontendUrl =
  normalizeUrl(process.env.PUBLIC_FRONTEND_URL) ||
  getConfiguredPublicFrontendUrl(rootEnvPath);
const configuredDatabaseUrl =
  process.env.DATABASE_URL ||
  getConfiguredEnvValue(rootEnvPath, "DATABASE_URL");

console.log(`🚀 Auto-configuring network IP: ${localIp}`);
if (publicFrontendUrl) {
  console.log(`🌐 Using public frontend URL: ${publicFrontendUrl}`);
}

updateEnvFile(rootEnvPath, localIp, { frontendUrl: publicFrontendUrl });
ensureBackendEnvFile(
  backendEnvPath,
  backendEnvExamplePath,
  configuredDatabaseUrl,
);
updateEnvFile(backendEnvPath, localIp, { frontendUrl: publicFrontendUrl });

console.log("✅ Network configuration complete.");
