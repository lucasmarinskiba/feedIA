/**
 * Agent Consensus — Mecanismo de consenso entre múltiples agentes.
 * Votación ponderada, debate estructurado, y resolución de conflictos.
 */

import { log } from '../../agent/logger.js';

export interface ConsensusProposal {
  id: string;
  topic: string;
  options: string[];
  agentVotes: Array<{ agentId: string; option: string; confidence: number; reasoning: string }>;
}

export interface ConsensusResult {
  topic: string;
  winner: string;
  totalVotes: number;
  confidence: number;
  breakdown: Record<string, number>;
  reasoning: string;
}

const CONSENSUS_KEY = 'agent_consensus';

const loadConsensus = (): ConsensusResult[] => {
  try {
    const raw = process.env[CONSENSUS_KEY];
    return raw ? (JSON.parse(raw) as ConsensusResult[]) : [];
  } catch {
    return [];
  }
};

const saveConsensus = (results: ConsensusResult[]): void => {
  process.env[CONSENSUS_KEY] = JSON.stringify(results.slice(-100));
};

export const proposeConsensus = (topic: string, options: string[]): ConsensusProposal => ({
  id: `consensus-${Date.now()}`,
  topic,
  options,
  agentVotes: [],
});

export const castVote = (
  proposal: ConsensusProposal,
  agentId: string,
  option: string,
  confidence: number,
  reasoning: string,
): ConsensusProposal => {
  if (!proposal.options.includes(option)) {
    throw new Error(`Option "${option}" not in proposal`);
  }
  proposal.agentVotes.push({ agentId, option, confidence: Math.max(0, Math.min(1, confidence)), reasoning });
  return proposal;
};

export const resolveConsensus = (proposal: ConsensusProposal): ConsensusResult => {
  if (proposal.agentVotes.length === 0) {
    return {
      topic: proposal.topic,
      winner: 'no_quorum',
      totalVotes: 0,
      confidence: 0,
      breakdown: {},
      reasoning: 'No votes cast',
    };
  }

  const breakdown: Record<string, number> = {};
  let totalConfidence = 0;

  for (const vote of proposal.agentVotes) {
    breakdown[vote.option] = (breakdown[vote.option] ?? 0) + vote.confidence;
    totalConfidence += vote.confidence;
  }

  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = entries[0]!;
  const confidence = totalConfidence > 0 ? Math.round((winnerScore / totalConfidence) * 100) / 100 : 0;

  const result: ConsensusResult = {
    topic: proposal.topic,
    winner,
    totalVotes: proposal.agentVotes.length,
    confidence,
    breakdown,
    reasoning: `Winner "${winner}" with ${Math.round(confidence * 100)}% confidence across ${proposal.agentVotes.length} agents`,
  };

  const all = loadConsensus();
  all.push(result);
  saveConsensus(all);

  log.info(`[Consensus] ${proposal.topic} → ${winner} (${confidence})`);
  return result;
};

export const getConsensusHistory = (limit = 10): ConsensusResult[] => loadConsensus().slice(-limit);
