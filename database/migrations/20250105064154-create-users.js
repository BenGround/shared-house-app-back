'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      roomNumber: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      email: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      isSet: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      passwordToken: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      isAdmin: {
        allowNull: false,
        defaultValue: false,
        type: Sequelize.BOOLEAN,
      },
      profilePicture: {
        allowNull: true,
        type: Sequelize.BLOB,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Users');
  },
};
