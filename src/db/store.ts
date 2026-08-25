/**
 * Database Store — MongoDB abstraction layer
 * Replaces mock in-memory storage
 */

import { MongoClient, Db, Collection } from 'mongodb';

const MONGO_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/feedia';

let mongoClient: MongoClient | null = null;
let db: Db | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) return db;

  try {
    mongoClient = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await mongoClient.connect();
    db = mongoClient.db('feedia');
    console.log('✓ Connected to MongoDB');
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    throw err;
  }
};

export const getDB = async (): Promise<Db> => {
  if (!db) await connectDB();
  return db!;
};

/**
 * Store interface (replaces in-memory mocks)
 */
export const store = {
  // Users
  async createUser(user: any): Promise<void> {
    const db = await getDB();
    await db.collection('users').insertOne({
      _id: user.id,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async getUser(userId: string): Promise<any> {
    const db = await getDB();
    return db.collection('users').findOne({ _id: userId });
  },

  async updateUser(userId: string, updates: any): Promise<void> {
    const db = await getDB();
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  },

  // Workspaces
  async createWorkspace(workspace: any): Promise<void> {
    const db = await getDB();
    await db.collection('workspaces').insertOne({
      _id: workspace.id,
      ...workspace,
      createdAt: new Date(),
    });
  },

  async getWorkspace(workspaceId: string): Promise<any> {
    const db = await getDB();
    return db.collection('workspaces').findOne({ _id: workspaceId });
  },

  async addWorkspaceMember(workspaceId: string, member: any): Promise<void> {
    const db = await getDB();
    await db.collection('workspaces').updateOne(
      { _id: workspaceId },
      { $push: { members: member } }
    );
  },

  async getUserWorkspaces(userId: string): Promise<any[]> {
    const db = await getDB();
    return db.collection('workspaces')
      .find({ 'members.userId': userId })
      .toArray();
  },

  // Content
  async createContent(content: any): Promise<void> {
    const db = await getDB();
    await db.collection('content').insertOne({
      _id: content.id,
      ...content,
      createdAt: new Date(),
      metrics: {
        impressions: 0,
        engagements: 0,
        conversions: 0,
        spend: 0,
      },
    });
  },

  async getContent(contentId: string): Promise<any> {
    const db = await getDB();
    return db.collection('content').findOne({ _id: contentId });
  },

  async getWorkspaceContent(workspaceId: string, limit = 50): Promise<any[]> {
    const db = await getDB();
    return db.collection('content')
      .find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  async updateContentMetrics(contentId: string, metrics: any): Promise<void> {
    const db = await getDB();
    await db.collection('content').updateOne(
      { _id: contentId },
      { $set: { metrics } }
    );
  },

  // Analytics
  async recordMetric(metric: any): Promise<void> {
    const db = await getDB();
    await db.collection('analytics').insertOne({
      ...metric,
      recordedAt: new Date(),
    });
  },

  async getContentAnalytics(contentId: string): Promise<any[]> {
    const db = await getDB();
    return db.collection('analytics')
      .find({ contentId })
      .sort({ recordedAt: -1 })
      .toArray();
  },

  async getUserAnalytics(userId: string, days = 30): Promise<any[]> {
    const db = await getDB();
    const since = new Date(Date.now() - days * 86400000);
    return db.collection('analytics')
      .find({ userId, recordedAt: { $gte: since } })
      .sort({ recordedAt: -1 })
      .toArray();
  },

  // Invitations
  async createInvitation(invitation: any): Promise<void> {
    const db = await getDB();
    await db.collection('invitations').insertOne({
      _id: invitation.id,
      ...invitation,
      invitedAt: new Date(),
    });
  },

  async getInvitation(invitationId: string): Promise<any> {
    const db = await getDB();
    return db.collection('invitations').findOne({ _id: invitationId });
  },

  async acceptInvitation(invitationId: string): Promise<void> {
    const db = await getDB();
    await db.collection('invitations').updateOne(
      { _id: invitationId },
      { $set: { status: 'accepted' } }
    );
  },

  // Templates
  async createTemplate(template: any): Promise<void> {
    const db = await getDB();
    await db.collection('templates').insertOne({
      _id: template.id,
      ...template,
      createdAt: new Date(),
    });
  },

  async getUserTemplates(userId: string): Promise<any[]> {
    const db = await getDB();
    return db.collection('templates')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  },

  // Feedback
  async saveFeedback(feedback: any): Promise<void> {
    const db = await getDB();
    await db.collection('feedback').updateOne(
      { userId: feedback.userId, contentId: feedback.contentId },
      { $set: feedback },
      { upsert: true }
    );
  },

  async getFeedback(contentId: string): Promise<any[]> {
    const db = await getDB();
    return db.collection('feedback')
      .find({ contentId })
      .toArray();
  },

  // Cleanup
  async disconnect(): Promise<void> {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      db = null;
    }
  },
};

export default store;
