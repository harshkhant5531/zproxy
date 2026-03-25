import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables for current mode
  const env = loadEnv(mode, process.cwd(), "VITE_");
  
  return {
    define: {
      // Explicitly pass VITE_ prefixed variables to the client
      "import.meta.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL || ""),
      "import.meta.env.VITE_PUBLIC_API_URL": JSON.stringify(env.VITE_PUBLIC_API_URL || ""),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
