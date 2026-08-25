/**
 * Migration 001: Initialize MongoDB schema
 * Replaces mock in-memory storage with persistent DB
 */

import { MongoClient, Db } from 'mongodb';

const MONGO_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/feedia';
const DB_NAME = 'feedia';

interface User {
  _id: string;
  email: string;
  tier: 'free' | 'starter' | 'premium';
  createdAt: Date;
  updatedAt: Date;
  workspace_ids: string[];
}

interface Workspace {
  _id: string;
  name: string;
  ownerId: string;
  tier: string;
  createdAt: Date;
  members: {
    userId: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: Date;
  }[];
  settings: {
    maxMembers: number;
    features: {
      videoGeneration: boolean;
      publishing: boolean;
      analytics: boolean;
    };
  };
}

interface Content {
  _id: string;
  userId: string;
  workspaceId: string;
  type: 'carousel' | 'reel' | 'story' | 'video';
  title: string;
  description?: string;
  templateId?: string;
  data: Record<string, unknown>;
  status: 'draft' | 'published' | 'scheduled';
  createdAt: Date;
  publishedAt?: Date;
  metrics: {
    impressions: number;
    engagements: number;
    conversions: number;
    spend: number;
  };
}

interface Analytics {
  _id: string;
  userId: string;
  contentId: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  metric: string;
  value: number;
  recordedAt: Date;
}

interface Invitation {
  _id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
}

export const migrate = async () => {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('📦 Creating collections...');

    // Users collection
    await db.createCollection('users').catch(() => {});
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ workspace_ids: 1 });
    console.log('  ✓ users');

    // Workspaces collection
    await db.createCollection('workspaces').catch(() => {});
    await db.collection('workspaces').createIndex({ ownerId: 1 });
    await db.collection('workspaces').createIndex({ 'members.userId': 1 });
    console.log('  ✓ workspaces');

    // Content collection
    await db.createCollection('content').catch(() => {});
    await db.collection('content').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('content').createIndex({ workspaceId: 1 });
    await db.collection('content').createIndex({ status: 1 });
    console.log('  ✓ content');

    // Analytics collection
    await db.createCollection('analytics').catch(() => {});
    await db.collection('analytics').createIndex({ userId: 1, recordedAt: -1 });
    await db.collection('analytics').createIndex({ contentId: 1 });
    await db.collection('analytics').createIndex({ platform: 1 });
    console.log('  ✓ analytics');

    // Invitations collection
    await db.createCollection('invitations').catch(() => {});
    await db.collection('invitations').createIndex({ workspaceId: 1 });
    await db.collection('invitations').createIndex({ email: 1 });
    await db.collection('invitations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('  ✓ invitations (TTL: 7 days)');

    // Templates collection
    await db.createCollection('templates').catch(() => {});
    await db.collection('templates').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('templates').createIndex({ workspaceId: 1 });
    console.log('  ✓ templates');

    // Feedback collection
    await db.createCollection('feedback').catch(() => {});
    await db.collection('feedback').createIndex({ userId: 1, contentId: 1 }, { unique: true });
    await db.collection('feedback').createIndex({ rating: 1 });
    console.log('  ✓ feedback');

    console.log('✅ Schema initialized.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  migrate().catch(console.error);
}
