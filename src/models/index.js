import sequelize from '../config/database.js';
import User from './User.js';
import Document from './Document.js';
import Stamp from './Stamp.js';
import DocumentFile from './DocumentFile.js';

// Setup Relationships
User.hasMany(Document, { foreignKey: 'issuer_user_id', as: 'issuedDocuments' });
Document.belongsTo(User, { foreignKey: 'issuer_user_id', as: 'issuer' });

Document.hasMany(Stamp, { foreignKey: 'document_id', as: 'stamps' });
Stamp.belongsTo(Document, { foreignKey: 'document_id' });

Document.hasMany(DocumentFile, { foreignKey: 'document_id', as: 'document_files' });
DocumentFile.belongsTo(Document, { foreignKey: 'document_id' });

export { sequelize, User, Document, Stamp, DocumentFile };