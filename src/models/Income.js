const { DataTypes } = require("sequelize");
const sequelize = require("../config/connectDB");

const Income = sequelize.define(
  "Income",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id_fk: { type: DataTypes.INTEGER, allowNull: false },
    comm: { type: DataTypes.FLOAT, allowNull: false },
    remarks: { type: DataTypes.STRING, allowNull: true },
    today_reward: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    hash_rate: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.0 },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    total_uptime: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.STRING, allowNull: false },
  },
  {
    tableName: "incomes",
    timestamps: false, // Set to true if you have createdAt/updatedAt columns
  }
);

module.exports = Income;
