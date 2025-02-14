const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');

const Withdraw = sequelize.define('Withdraw', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id_fk: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('Approved', 'Pending', 'Rejected'), defaultValue: 'Pending' },
}, {
    tableName: 'withdraws',
    timestamps: false
});

module.exports = Withdraw;