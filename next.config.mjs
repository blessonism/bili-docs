import { createMDX } from 'fumadocs-mdx/next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  webpack: (config) => {
    // Force webpack to use our installed React (19.2.4 with useEffectEvent)
    // instead of Next.js bundled React (which lacks useEffectEvent)
    const reactPath = path.resolve(__dirname, 'node_modules/react');
    const reactDomPath = path.resolve(__dirname, 'node_modules/react-dom');
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactPath,
      'react-dom': reactDomPath,
    };
    return config;
  },
};

export default withMDX(config);
