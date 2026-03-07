import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DocumentFile = sequelize.define('DocumentFile', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    document_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    kind: {
        type: DataTypes.STRING,
        allowNull: false
    }, // 'source', 'stamped', 'preview'
    storage_path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mime_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    page_count: { type: DataTypes.INTEGER, defaultValue: 1 },
}, {
    tableName: 'document_files',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

export default DocumentFile;