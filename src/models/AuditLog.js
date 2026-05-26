import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    actor_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    document_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    action: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    meta_json: {
        type: DataTypes.JSONB,
        defaultValue: {},
    }
}, {
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default AuditLog;
