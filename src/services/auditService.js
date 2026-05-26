import { AuditLog } from '../models/index.js';

export const logAction = async (actorUserId, documentId, action, meta = {}) => {
    try {
        console.log(`[AUDIT] User:${actorUserId} Action:${action} Meta:${JSON.stringify(meta)}`);
        
        // Save to database
        await AuditLog.create({
            actor_user_id: actorUserId || null,
            document_id: documentId || null,
            action,
            meta_json: meta
        });
    } catch (err) {
        console.error('[AUDIT_ERROR] Failed to save audit log to DB:', err.message || err);
    }
};