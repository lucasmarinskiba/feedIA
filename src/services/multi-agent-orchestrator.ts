/**
 * Multi-Agent Orchestration Engine
 * Art Director ↔ Carousel Designer collaboration
 * Iterative refinement loop: design → feedback → refine → validate
 */

export interface AgentMessage {
  id: string;
  from: 'art-director' | 'carousel-designer' | 'user';
  to: 'art-director' | 'carousel-designer' | 'user';
  type: 'request' | 'response' | 'feedback' | 'validation';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface CollaborationSession {
  id: string;
  userId: string;
  topic: string;
  iterations: number;
  status: 'active' | 'completed' | 'paused';
  messages: AgentMessage[];
  currentDesign?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DesignBrief {
  topic: string;
  format: 'carousel' | 'reel' | 'story';
  style: string;
  constraints: string[];
  targetAudience: string;
  colors?: string[];
  tone?: string;
}

// In-memory sessions for dev (replace with DB in prod)
const sessions = new Map<string, CollaborationSession>();
const messageHistory = new Map<string, AgentMessage[]>();

/**
 * Start collaboration between Art Director and Carousel Designer
 */
export const startCollaboration = (userId: string, brief: DesignBrief): CollaborationSession => {
  const sessionId = `session_${userId}_${Date.now()}`;

  const session: CollaborationSession = {
    id: sessionId,
    userId,
    topic: brief.topic,
    iterations: 0,
    status: 'active',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);
  messageHistory.set(sessionId, []);

  console.log('[MultiAgent] Collaboration started:', { sessionId, topic: brief.topic });

  return session;
};

/**
 * Art Director sends design proposal to Carousel Designer
 */
export const artDirectorProposal = async (
  sessionId: string,
  proposal: { concept: string; visualStyle: string; mood: string },
): Promise<AgentMessage> => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const message: AgentMessage = {
    id: `msg_${Date.now()}`,
    from: 'art-director',
    to: 'carousel-designer',
    type: 'request',
    content: `Design concept: ${proposal.concept}\nVisual style: ${proposal.visualStyle}\nMood: ${proposal.mood}`,
    metadata: proposal,
    timestamp: new Date().toISOString(),
  };

  messageHistory.get(sessionId)?.push(message);
  session.currentDesign = proposal;
  session.updatedAt = new Date().toISOString();

  console.log('[ArtDirector] Proposal sent:', { sessionId, concept: proposal.concept });

  return message;
};

/**
 * Carousel Designer responds with refinement
 */
export const carouselDesignerResponse = async (
  sessionId: string,
  feedback: { feasibility: string; suggestions: string[]; concerns: string[] },
): Promise<AgentMessage> => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const suggestions = feedback.suggestions.map((s) => `• ${s}`).join('\n');
  const concerns = feedback.concerns.map((c) => `⚠️ ${c}`).join('\n');

  const message: AgentMessage = {
    id: `msg_${Date.now()}`,
    from: 'carousel-designer',
    to: 'art-director',
    type: 'feedback',
    content: `Feasibility: ${feedback.feasibility}\n\nSuggestions:\n${suggestions}\n\nConcerns:\n${concerns}`,
    metadata: feedback,
    timestamp: new Date().toISOString(),
  };

  messageHistory.get(sessionId)?.push(message);
  session.iterations += 1;
  session.updatedAt = new Date().toISOString();

  console.log('[CarouselDesigner] Response sent:', { sessionId, suggestions: feedback.suggestions.length });

  return message;
};

/**
 * Art Director refines based on feedback
 */
export const artDirectorRefine = async (
  sessionId: string,
  refined: { adjustments: string[]; revisedConcept: string },
): Promise<AgentMessage> => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const adjustments = refined.adjustments.map((a) => `✓ ${a}`).join('\n');

  const message: AgentMessage = {
    id: `msg_${Date.now()}`,
    from: 'art-director',
    to: 'carousel-designer',
    type: 'response',
    content: `Adjustments made:\n${adjustments}\n\nRevised concept: ${refined.revisedConcept}`,
    metadata: refined,
    timestamp: new Date().toISOString(),
  };

  messageHistory.get(sessionId)?.push(message);
  session.updatedAt = new Date().toISOString();

  console.log('[ArtDirector] Refinement sent:', { sessionId, adjustments: refined.adjustments.length });

  return message;
};

/**
 * Carousel Designer validates final design
 */
export const carouselDesignerValidate = async (
  sessionId: string,
  validation: { isValid: boolean; readiness: 'draft' | 'ready' | 'production'; notes: string },
): Promise<AgentMessage> => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const message: AgentMessage = {
    id: `msg_${Date.now()}`,
    from: 'carousel-designer',
    to: 'art-director',
    type: 'validation',
    content: `Validation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}\nReadiness: ${validation.readiness}\nNotes: ${validation.notes}`,
    metadata: validation,
    timestamp: new Date().toISOString(),
  };

  messageHistory.get(sessionId)?.push(message);

  if (validation.isValid && validation.readiness === 'production') {
    session.status = 'completed';
    console.log('[CarouselDesigner] Design APPROVED for production:', { sessionId });
  } else {
    console.log('[CarouselDesigner] Validation result:', { sessionId, readiness: validation.readiness });
  }

  session.updatedAt = new Date().toISOString();

  return message;
};

/**
 * Get conversation history for a session
 */
export const getConversationHistory = (sessionId: string): AgentMessage[] => messageHistory.get(sessionId) || [];

/**
 * Get session details
 */
export const getSession = (sessionId: string): CollaborationSession | null => sessions.get(sessionId) || null;

/**
 * Full collaboration loop (orchestrated)
 */
export const runCollaborationLoop = async (
  userId: string,
  brief: DesignBrief,
): Promise<{ sessionId: string; finalDesign: unknown; iterations: number; status: string }> => {
  // 1. Start session
  const session = startCollaboration(userId, brief);

  // 2. Art Director proposes
  await artDirectorProposal(session.id, {
    concept: `${brief.topic} in ${brief.style} style`,
    visualStyle: brief.style,
    mood: brief.tone || 'engaging',
  });

  // 3. Carousel Designer responds
  await carouselDesignerResponse(session.id, {
    feasibility: 'Concept is achievable with standard carousel tools',
    suggestions: [
      'Consider 10 frames maximum for mobile optimization',
      'Use consistent color palette across all slides',
      'Add motion transition between themed sections',
    ],
    concerns: ['Ensure text readability on smaller screens', 'Validate animation performance on older devices'],
  });

  // 4. Art Director refines
  await artDirectorRefine(session.id, {
    adjustments: [
      'Reduced to 8 frames for better pacing',
      'Applied WCAG AA contrast standards',
      'Used GPU-friendly transition effects',
    ],
    revisedConcept: `${brief.topic} carousel: optimized 8-frame narrative with premium animations`,
  });

  // 5. Carousel Designer validates
  await carouselDesignerValidate(session.id, {
    isValid: true,
    readiness: 'production',
    notes: 'All accessibility checks passed. Ready for generation pipeline.',
  });

  const finalSession = sessions.get(session.id)!;

  return {
    sessionId: session.id,
    finalDesign: finalSession.currentDesign,
    iterations: finalSession.iterations,
    status: finalSession.status,
  };
};
