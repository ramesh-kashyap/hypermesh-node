const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');

const Investment = sequelize.define('Investment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id_fk: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Inactive' },
}, {
    tableName: 'investments',
    timestamps: false
});

module.exports = Investment;