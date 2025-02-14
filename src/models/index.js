const sequelize = require('../config/connectDB');
const User = require('./User');
const Investment = require('./Investment');
const Withdraw = require('./Withdraw');
const Income = require('./Income');

// Define relationships
User.hasMany(Investment, { foreignKey: 'user_id_fk' });
Investment.belongsTo(User, { foreignKey: 'user_id_fk' });

User.hasMany(Withdraw, { foreignKey: 'user_id_fk' });
Withdraw.belongsTo(User, { foreignKey: 'user_id_fk' });

User.hasMany(Income, { foreignKey: 'user_id_fk' });
Income.belongsTo(User, { foreignKey: 'user_id_fk' });

// Sync models
sequelize.sync(); // Use { force: true } only if you want to recreate tables

module.exports = { sequelize, User, Investment, Withdraw, Income };