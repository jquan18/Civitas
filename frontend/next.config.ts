import type { NextConfig } from "next";
import dotenv from 'dotenv';
import path from 'path';

// Load .env from repository root (parent of frontend directory)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
