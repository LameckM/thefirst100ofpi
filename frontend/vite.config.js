import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Link previews need absolute URLs. Render sets RENDER_EXTERNAL_URL; set SITE_URL for a custom domain.
const siteUrl=(process.env.SITE_URL||process.env.RENDER_EXTERNAL_URL||"").replace(/\/$/,"");
const social={name:"site-url",transformIndexHtml:html=>html.replaceAll("__SITE_URL__",siteUrl)};
export default defineConfig({plugins:[react(),social],server:{host:"0.0.0.0",port:5173,proxy:{"/api":"http://127.0.0.1:8000"}}});