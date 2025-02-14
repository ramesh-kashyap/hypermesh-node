const { DataTypes } = require('sequelize');
const sequelize = require('../config/connectDB');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Ensure unique usernames
    },
    sponsor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
    },
    active_status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Pending'), // Fixed ENUM options
        defaultValue: 'Pending', // Set default properly
        allowNull: false
    },
    jdate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW, // Automatically set date
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true, // Ensure unique emails
        validate: {
            isEmail: true, // Ensure valid email format
        }
    },
    google_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true // Ensure Google ID is unique
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    package: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    tableName: 'users',
    timestamps: false, // Enable createdAt and updatedAt fields
});






module.exports = User;