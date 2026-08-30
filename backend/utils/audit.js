import AuditLog from "../models/AuditLog.js";

// Fire-and-forget audit writer. A failed audit write must never fail the user
// action that triggered it, but it is logged loudly so gaps are visible.
export async function recordAudit({
  req,
  actor,
  action,
  entityType,
  entityId,
  fromState = "",
  toState = "",
  reason = "",
  metadata = {},
}) {
  try {
    await AuditLog.create({
      actor: actor ?? req?.user?._id ?? null,
      actorRole: req?.user?.role || (actor ? "" : "system"),
      action,
      entityType,
      entityId,
      fromState,
      toState,
      reason: String(reason || "").slice(0, 1000),
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    });
  } catch (err) {
    console.error(`[audit] failed to record ${action} on ${entityType}:${entityId} — ${err.message}`);
  }
}
