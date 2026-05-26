import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Verification = sequelize.define('Verification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    document_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    query_value: {
        type: DataTypes.STRING(1000),
        allowNull: false,
    },
    result: {
        type: DataTypes.ENUM('valid', 'invalid', 'expired', 'revoked'),
        allowNull: false,
    },
    client_ip: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    user_agent: {
        type: DataTypes.STRING(1000),
        allowNull: true,
    }
}, {
    tableName: 'verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export default Verification;
