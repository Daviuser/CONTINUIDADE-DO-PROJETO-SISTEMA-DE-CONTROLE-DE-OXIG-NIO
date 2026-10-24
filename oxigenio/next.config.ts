import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["@node-rs/argon2", "pdfmake"],
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  outputFileTracingIncludes: { "/relatorios/pdf": ["./public/brand/logo.jpeg", "./node_modules/pdfkit/js/data/**/*", "./node_modules/pdfmake/build/vfs_fonts.js"] },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ]}];
  },
};
export default config;
