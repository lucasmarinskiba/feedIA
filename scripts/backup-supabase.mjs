#!/usr/bin/env node
// Backs up a Supabase project to a local SQL file and optionally uploads to S3-compatible storage.
// Usage: node scripts/backup-supabase.mjs --env=staging|production

import { spawn } from 'child_process';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const envArg = process.argv.find((a) => a.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'production';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !dbPassword) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('Invalid SUPABASE_URL format');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(ROOT, 'backups');
const backupFile = join(backupDir, `feedia-${env}-${timestamp}.sql`);

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'pipe', ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => {
      stdout += d;
    });
    child.stderr?.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || stdout}`));
    });
  });
}

async function uploadToS3(filePath) {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !endpoint || !keyId || !secret) {
    console.log('S3 credentials not configured; skipping upload.');
    return;
  }

  // Dynamic import to avoid bundling issues
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    endpoint,
    region: process.env.AWS_REGION || 'auto',
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
    forcePathStyle: true,
  });

  const body = await readFile(filePath);
  const key = `backups/feedia-${env}-${timestamp}.sql`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
  console.log(`Uploaded backup to s3://${bucket}/${key}`);
}

async function main() {
  await mkdir(backupDir, { recursive: true });

  const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

  // Try supabase CLI first, then pg_dump
  const hasSupabaseCli = await run('which', ['supabase'])
    .then(() => true)
    .catch(() => false);

  if (hasSupabaseCli) {
    console.log('Using supabase db dump...');
    await run('supabase', ['db', 'dump', '--db-url', dbUrl, '--file', backupFile], { cwd: ROOT });
  } else {
    console.log('Using pg_dump...');
    await run('pg_dump', [dbUrl, '-f', backupFile, '--clean', '--if-exists', '--no-owner', '--no-privileges']);
  }

  console.log(`Backup saved: ${backupFile}`);

  // Write metadata
  const metaFile = `${backupFile}.json`;
  await writeFile(
    metaFile,
    JSON.stringify(
      {
        env,
        projectRef,
        timestamp: new Date().toISOString(),
        source: supabaseUrl,
        file: backupFile,
      },
      null,
      2,
    ),
  );

  await uploadToS3(backupFile).catch((err) => {
    console.warn('S3 upload failed:', err.message);
  });
}

main().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
