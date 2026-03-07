// Stub for audit service
export const logAction = async (actorUserId, documentId, action, meta = {}) => {
    console.log(`[AUDIT] User:${actorUserId} Action:${action} Meta:${JSON.stringify(meta)}`);
};