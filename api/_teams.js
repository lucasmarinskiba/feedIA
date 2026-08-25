/**
 * Teams & Workspaces — multi-user orgs, role-based access
 * Roles: owner, admin, member (can be read-only or editor)
 */

import { v4 as uuid } from 'uuid';

/**
 * Create workspace/team
 */
export const createWorkspace = async (userId, workspaceName, tier = 'free') => {
  const workspaceId = `ws_${uuid()}`;
  const workspace = {
    id: workspaceId,
    name: workspaceName,
    ownerId: userId,
    tier,
    createdAt: new Date().toISOString(),
    members: [
      {
        userId,
        role: 'owner',
        joinedAt: new Date().toISOString(),
      },
    ],
    settings: {
      maxMembers: tier === 'free' ? 3 : tier === 'starter' ? 10 : 50,
      features: {
        videoGeneration: tier !== 'free',
        publishing: tier === 'premium',
        analytics: tier === 'premium',
      },
    },
  };

  // In production: save to DB
  // await store.set(`feedia:workspace:${workspaceId}`, workspace);
  // await store.set(`feedia:user:${userId}:workspaces`, [workspaceId]);

  return workspace;
};

/**
 * Add member to workspace
 */
export const addMember = async (workspaceId, inviteEmail, role = 'member', invitedBy) => {
  // Validate role
  const validRoles = ['owner', 'admin', 'member'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const memberId = `wmem_${uuid()}`;
  const invitation = {
    id: memberId,
    workspaceId,
    email: inviteEmail,
    role,
    status: 'pending', // pending, accepted, declined
    invitedBy,
    invitedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), // 7 days
  };

  // In production: save invitation + send email
  // await store.set(`feedia:invitation:${memberId}`, invitation);
  // await sendInvitationEmail(inviteEmail, workspaceId, memberId);

  return invitation;
};

/**
 * Accept workspace invitation
 */
export const acceptInvitation = async (invitationId, userId) => {
  // In production: fetch invitation from DB
  // const invitation = await store.get(`feedia:invitation:${invitationId}`);

  // Check if expired
  // if (new Date() > new Date(invitation.expiresAt)) {
  //   throw new Error('Invitation expired');
  // }

  // Add user to workspace
  const workspace = {
    workspaceId: 'ws_example',
    members: [
      {
        userId,
        role: 'member',
        joinedAt: new Date().toISOString(),
      },
    ],
  };

  // In production:
  // await store.set(`feedia:invitation:${invitationId}`, { ...invitation, status: 'accepted' });
  // await updateWorkspace(invitation.workspaceId, { members: [...members, {userId, role}] });

  return { ok: true, workspaceId: workspace.workspaceId };
};

/**
 * Share content with team
 */
export const shareContent = async (contentId, workspaceId, recipients, permissions = 'view') => {
  const shareId = `share_${uuid()}`;
  const share = {
    id: shareId,
    contentId,
    workspaceId,
    recipients, // array of userIds or roles ('all-members', 'admins-only', etc)
    permissions, // 'view', 'comment', 'edit'
    sharedAt: new Date().toISOString(),
  };

  // In production: save + notify recipients
  // await store.set(`feedia:share:${shareId}`, share);
  // notifyRecipients(recipients, contentId, permissions);

  return share;
};

/**
 * Update member role
 */
export const updateMemberRole = async (workspaceId, userId, newRole, changedBy) => {
  const validRoles = ['owner', 'admin', 'member'];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: ${newRole}`);
  }

  const update = {
    workspaceId,
    userId,
    newRole,
    changedBy,
    changedAt: new Date().toISOString(),
  };

  // In production: update workspace members array
  // const workspace = await store.get(`feedia:workspace:${workspaceId}`);
  // workspace.members = workspace.members.map(m =>
  //   m.userId === userId ? { ...m, role: newRole } : m
  // );
  // await store.set(`feedia:workspace:${workspaceId}`, workspace);

  return { ok: true, update };
};

/**
 * Remove member from workspace
 */
export const removeMember = async (workspaceId, userId, removedBy) => {
  const removal = {
    workspaceId,
    userId,
    removedBy,
    removedAt: new Date().toISOString(),
  };

  // In production: remove from members array
  // const workspace = await store.get(`feedia:workspace:${workspaceId}`);
  // workspace.members = workspace.members.filter(m => m.userId !== userId);
  // await store.set(`feedia:workspace:${workspaceId}`, workspace);

  return { ok: true, removal };
};

/**
 * Teams HTTP handler
 */
export const handleTeams = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
    return true;
  };

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return json(401, { error: 'x-user-id header required' });
  }

  // ─── POST /api/teams/create ──────────────────────────────────
  if (path === '/api/teams/create' && m === 'POST') {
    const { workspaceName, tier = 'free' } = body || {};

    if (!workspaceName) {
      return json(400, { error: 'workspaceName required' });
    }

    try {
      const workspace = await createWorkspace(userId, workspaceName, tier);
      return json(200, workspace);
    } catch (err) {
      return json(500, { error: 'workspace-creation-failed' });
    }
  }

  // ─── POST /api/teams/:workspaceId/members/invite ────────────
  if (path.startsWith('/api/teams/') && path.endsWith('/members/invite') && m === 'POST') {
    const workspaceId = path.split('/')[3];
    const { email, role = 'member' } = body || {};

    if (!email) {
      return json(400, { error: 'email required' });
    }

    try {
      const invitation = await addMember(workspaceId, email, role, userId);
      return json(200, invitation);
    } catch (err) {
      return json(400, { error: String(err) });
    }
  }

  // ─── POST /api/teams/invitations/:invitationId/accept ───────
  if (path.startsWith('/api/teams/invitations/') && path.endsWith('/accept') && m === 'POST') {
    const invitationId = path.split('/')[4];

    try {
      const result = await acceptInvitation(invitationId, userId);
      return json(200, result);
    } catch (err) {
      return json(400, { error: String(err) });
    }
  }

  // ─── POST /api/teams/content/share ────────────────────────
  if (path === '/api/teams/content/share' && m === 'POST') {
    const { contentId, workspaceId, recipients, permissions = 'view' } = body || {};

    if (!contentId || !workspaceId || !recipients) {
      return json(400, { error: 'contentId, workspaceId, recipients required' });
    }

    try {
      const share = await shareContent(contentId, workspaceId, recipients, permissions);
      return json(200, share);
    } catch (err) {
      return json(500, { error: 'content-share-failed' });
    }
  }

  // ─── PUT /api/teams/:workspaceId/members/:userId/role ──────
  if (path.startsWith('/api/teams/') && path.includes('/members/') && m === 'PUT') {
    const parts = path.split('/');
    const workspaceId = parts[3];
    const targetUserId = parts[5];
    const { role } = body || {};

    if (!role) {
      return json(400, { error: 'role required' });
    }

    try {
      const result = await updateMemberRole(workspaceId, targetUserId, role, userId);
      return json(200, result);
    } catch (err) {
      return json(400, { error: String(err) });
    }
  }

  // ─── DELETE /api/teams/:workspaceId/members/:userId ────────
  if (path.startsWith('/api/teams/') && path.includes('/members/') && m === 'DELETE') {
    const parts = path.split('/');
    const workspaceId = parts[3];
    const targetUserId = parts[5];

    try {
      const result = await removeMember(workspaceId, targetUserId, userId);
      return json(200, result);
    } catch (err) {
      return json(500, { error: 'member-removal-failed' });
    }
  }

  return false;
};
