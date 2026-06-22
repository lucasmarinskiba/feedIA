#!/usr/bin/env node
// Generates Upptime configuration for a status page.
// Usage: node scripts/setup-status-page.mjs <owner/repo>

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const [ownerRepo] = process.argv.slice(2);

if (!ownerRepo || !ownerRepo.includes('/')) {
  console.error('Usage: node scripts/setup-status-page.mjs <owner/repo>');
  process.exit(1);
}

const baseUrlProd = process.env.PUBLIC_BASE_URL_PROD || 'https://feedia.vercel.app';
const baseUrlStaging = process.env.PUBLIC_BASE_URL_STAGING || 'https://staging-feedia.vercel.app';

const config = {
  owner: ownerRepo.split('/')[0],
  repo: `${ownerRepo.split('/')[1]}-status`,
  sites: [
    {
      name: 'FeedIA Production',
      url: `${baseUrlProd}/api/health`,
      expectedStatusCodes: [200],
    },
    {
      name: 'FeedIA Staging',
      url: `${baseUrlStaging}/api/health`,
      expectedStatusCodes: [200],
    },
    {
      name: 'FeedIA Website',
      url: baseUrlProd,
      expectedStatusCodes: [200],
    },
  ],
  statusWebsite: {
    cname: 'status.feedia.vercel.app',
    themeUrl: 'https://upptime.github.io/upptime/',
    name: 'FeedIA Status',
    introTitle: '**FeedIA** Status Page',
    introMessage: 'Estado de los servicios de FeedIA.',
  },
  notifications: {
    webhook: process.env.ADMIN_WEBHOOK_URL ? { url: process.env.ADMIN_WEBHOOK_URL } : undefined,
  },
};

const outDir = '.github/status-page';
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/upptime.yml`, JSON.stringify(config, null, 2));

console.log(`Upptime config written to ${outDir}/upptime.yml`);
console.log('Next steps:');
console.log(`1. Create a new repo named ${config.repo} from https://github.com/upptime/upptime`);
console.log(`2. Copy ${outDir}/upptime.yml to .upptimerc.yml in the new repo`);
console.log('3. Enable GitHub Actions in the new repo');
