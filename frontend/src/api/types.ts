export type Difficulty = 'Easy' | 'Medium' | 'Hard'
export type SessionStatus = 'active' | 'deal' | 'walkaway' | 'ended'
export type TurnStatus = 'continue' | 'deal' | 'walkaway'

export interface Health {
  status: string
  provider: string
  model: string
}

export interface Domain {
  id: string
  order: number
  label: string
  emoji: string
  counterpart_role: string
  user_role: string
  default_goal: string
  default_context: string
}

export interface SessionCreate {
  domain: string
  difficulty: Difficulty
  goal: string
  context: string
}

export interface SessionStarted {
  session_id: string
  opening_message: string
  status: string
}

export interface CoachFeedback {
  rating: number
  issue: string
  better_phrasing: string
  unused_leverage: string
  tactic_detected: string
}

export interface Dimensions {
  preparation: number
  assertiveness: number
  concessions: number
  leverage_use: number
  outcome: number
}

export interface Rewrite {
  said: string
  better: string
}

export interface Scorecard {
  score: number
  verdict: string
  dimensions: Dimensions
  leverage_used: string[]
  opportunities_missed: string[]
  rewrites: Rewrite[]
  next_steps: string[]
}

export interface MessageOut {
  id: number
  role: 'user' | 'counterpart'
  content: string
}

export interface CoachNoteOut extends CoachFeedback {
  id: number
  message_id: number
}

export interface SessionDetail {
  id: string
  domain: string
  difficulty: Difficulty
  goal: string
  context: string
  status: SessionStatus
  created_at: string
  messages: MessageOut[]
  coach_notes: CoachNoteOut[]
  scorecard: Scorecard | null
}

export interface EndOut {
  status: SessionStatus
  scorecard: Scorecard
}

export interface HistoryItem {
  id: string
  domain: string
  difficulty: Difficulty
  goal: string
  status: SessionStatus
  created_at: string
  score: number | null
}

export interface DomainStat {
  count: number
  average: number
}

export interface RecentScore {
  session_id: string
  score: number
  domain: string
  difficulty: Difficulty
  created_at: string
}

export interface StatsOut {
  sessions_total: number
  scored_sessions: number
  average_score: number | null
  best_score: number | null
  trend: 'improving' | 'declining' | 'steady' | 'not_enough_data'
  by_domain: Record<string, DomainStat>
  dimension_averages: Partial<Record<keyof Dimensions, number>>
  suggested_difficulty: Difficulty
  suggestion_reason: string
  recent: RecentScore[]
}

/** Events streamed by POST /sessions/{id}/messages */
export type StreamEvent =
  | { type: 'counterpart_token'; data: { text: string } }
  | { type: 'counterpart_done'; data: { text: string; status: TurnStatus } }
  | { type: 'coach'; data: CoachFeedback }
  | { type: 'error'; data: { agent: string; message: string } }