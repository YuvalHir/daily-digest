import { defineConfig } from 'astro/config';
export default defineConfig({ site: process.env.SITE_URL || 'https://daily-digest.workers.dev', output: 'static', trailingSlash: 'always' });
