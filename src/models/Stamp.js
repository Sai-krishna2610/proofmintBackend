import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Stamp = sequelize.define('Stamp', {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    document_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    page_number: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1 
    },
    x_norm: { 
        type: DataTypes.FLOAT 
    },
    y_norm: { 
        type: DataTypes.FLOAT 
    },
    width_norm: { 
        type: DataTypes.FLOAT 
    },
    height_norm: { 
        type: DataTypes.FLOAT 
    },
    show_qr: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
    show_id_text: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
    show_verify_url: { type: DataTypes.BOOLEAN, defaultValue: true },
    style_json: { type: DataTypes.JSONB, defaultValue: {} }
}, {
    tableName: 'stamps',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default Stamp;