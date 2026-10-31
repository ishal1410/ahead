import path from "node:path";
import { defineConfig } from "vitest/config";

// The route handlers import "@/lib/..."; tests import them directly.
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname) } } });
