#!/usr/bin/env node
// Cleans up old GHCR worker images, keeping the latest N and all semver tags.
// Usage: node scripts/cleanup-ghcr.mjs [--dry-run] [--keep=20]

const owner = process.env.GITHUB_REPOSITORY_OWNER;
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const token = process.env.GITHUB_TOKEN;
const dryRun = process.argv.includes('--dry-run');
const keep = Number(process.argv.find((a) => a.startsWith('--keep='))?.split('=')[1] || 20);

if (!owner || !repo || !token) {
  console.error('Missing GITHUB_REPOSITORY_OWNER, GITHUB_REPOSITORY or GITHUB_TOKEN');
  process.exit(1);
}

const packageName = `${repo}/workers`;

async function ghcr(path, opts = {}) {
  const res = await fetch(`https://api.github.com/users/${owner}/packages/container/${packageName}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHCR API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

const isSemver = (tag) => /^v?\d+\.\d+\.\d+/.test(tag);

async function main() {
  const versions = await ghcr('/versions');
  const deletable = versions
    .filter((v) => {
      const tags = v.metadata?.container?.tags || [];
      return tags.length === 0 || !tags.some(isSemver);
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(keep);

  console.log(`Found ${versions.length} versions, will delete ${deletable.length} (keep ${keep} + semver).`);

  for (const v of deletable) {
    console.log(`${dryRun ? '[DRY-RUN]' : 'Deleting'} version ${v.id} (${v.name})`);
    if (!dryRun) {
      await ghcr(`/versions/${v.id}`, { method: 'DELETE' });
    }
  }
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
