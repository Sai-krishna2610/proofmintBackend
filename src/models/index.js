import sequelize from '../config/database.js';
import User from './User.js';
import Document from './Document.js';
import Stamp from './Stamp.js';
import DocumentFile from './DocumentFile.js';
import AuditLog from './AuditLog.js';
import Verification from './Verification.js';

// Setup Relationships
User.hasMany(Document, { foreignKey: 'issuer_user_id', as: 'issuedDocuments' });
Document.belongsTo(User, { foreignKey: 'issuer_user_id', as: 'issuer' });

Document.hasMany(Stamp, { foreignKey: 'document_id', as: 'stamps' });
Stamp.belongsTo(Document, { foreignKey: 'document_id' });

Document.hasMany(DocumentFile, { foreignKey: 'document_id', as: 'document_files' });
DocumentFile.belongsTo(Document, { foreignKey: 'document_id' });

// Audit logs & Verifications relations
User.hasMany(AuditLog, { foreignKey: 'actor_user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });

Document.hasMany(AuditLog, { foreignKey: 'document_id', as: 'auditLogs' });
AuditLog.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

Document.hasMany(Verification, { foreignKey: 'document_id', as: 'verifications' });
Verification.belongsTo(Document, { foreignKey: 'document_id', as: 'document' });

export { sequelize, User, Document, Stamp, DocumentFile, AuditLog, Verification };