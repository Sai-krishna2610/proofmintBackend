import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  recipient_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  recipient_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  recipient_phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  issuer_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'revoked'),
    defaultValue: 'draft',
  },
  issue_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  revoke_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Document;