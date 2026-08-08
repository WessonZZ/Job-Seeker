import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 服务端简历 PDF 渲染依赖这些原生/较大模块，保持外部引入避免打包失败
  // （pdfjs-dist 同时被客户端 PDFViewer 使用，需参与前端打包，故不在此列出）
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
};

export default nextConfig;
