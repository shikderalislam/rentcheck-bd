// Central review moderation state machine.
//
// Every status change on a Review must go through assertTransition() so that
// illegal jumps are rejected and each legal move is attributable to a role
// (or to "system" for automated escalations). Keep this file as the single
// source of truth — controllers should not hand-roll status checks.

export const REVIEW_STATES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_REVIEW", // auto-escalated (reports, heuristics) — waiting on a human
  "APPROVED",
  "REJECTED",
  "HIDDEN",
  "DISPUTED",
  "REMOVED",
];

// Reviews the public feed is allowed to show.
export const PUBLIC_REVIEW_STATES = ["APPROVED"];

const MOD_ROLES = ["moderator", "admin", "super_admin"];
const ADMIN_ROLES = ["admin", "super_admin"];

// from -> [{ to, actors }]
export const ALLOWED_TRANSITIONS = {
  DRAFT: [{ to: "SUBMITTED", actors: ["author"] }],

  SUBMITTED: [
    { to: "UNDER_REVIEW", actors: ["system", ...MOD_ROLES] },
    { to: "NEEDS_REVIEW", actors: ["system", ...MOD_ROLES] },
    { to: "APPROVED", actors: MOD_ROLES },
    { to: "REJECTED", actors: MOD_ROLES },
  ],

  UNDER_REVIEW: [
    { to: "APPROVED", actors: MOD_ROLES },
    { to: "REJECTED", actors: MOD_ROLES },
    { to: "HIDDEN", actors: MOD_ROLES },
    { to: "NEEDS_REVIEW", actors: ["system", ...MOD_ROLES] },
  ],

  NEEDS_REVIEW: [
    { to: "UNDER_REVIEW", actors: MOD_ROLES },
    { to: "APPROVED", actors: MOD_ROLES },
    { to: "REJECTED", actors: MOD_ROLES },
    { to: "HIDDEN", actors: MOD_ROLES },
  ],

  APPROVED: [
    // Automated re-escalation (e.g. a report threshold is crossed) is allowed,
    // but note it does NOT remove the review from the public feed on its own.
    { to: "NEEDS_REVIEW", actors: ["system", ...MOD_ROLES] },
    { to: "DISPUTED", actors: MOD_ROLES },
    { to: "HIDDEN", actors: MOD_ROLES },
    { to: "REMOVED", actors: ADMIN_ROLES },
  ],

  DISPUTED: [
    { to: "APPROVED", actors: MOD_ROLES },
    { to: "HIDDEN", actors: MOD_ROLES },
    { to: "REMOVED", actors: ADMIN_ROLES },
  ],

  HIDDEN: [
    { to: "APPROVED", actors: MOD_ROLES },
    { to: "REMOVED", actors: ADMIN_ROLES },
  ],

  REJECTED: [{ to: "UNDER_REVIEW", actors: MOD_ROLES }],

  REMOVED: [], // terminal
};

export function canTransition(from, to, actorRole) {
  const rule = (ALLOWED_TRANSITIONS[from] || []).find((r) => r.to === to);
  return !!rule && rule.actors.includes(actorRole);
}

// Throws a 409 Error if the move is not allowed. A no-op move (from === to) is
// treated as allowed so callers can be idempotent.
export function assertTransition(from, to, actorRole) {
  if (from === to) return;
  if (!canTransition(from, to, actorRole)) {
    const err = new Error(`Illegal review transition: ${from} → ${to} (as ${actorRole || "unknown"})`);
    err.statusCode = 409;
    throw err;
  }
}

// Convenience: does a review in this state count toward reputation?
export function countsTowardReputation(state) {
  return state === "APPROVED";
}
