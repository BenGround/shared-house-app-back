'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SharedSpaces', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      nameCode: {
        allowNull: false,
        unique: true,
        type: Sequelize.STRING,
      },
      nameEn: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      nameJp: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      descriptionEn: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      descriptionJp: {
        allowNull: true,
        type: Sequelize.TEXT,
      },
      startDayTime: {
        allowNull: false,
        type: Sequelize.TIME,
      },
      endDayTime: {
        allowNull: false,
        type: Sequelize.TIME,
      },
      maxBookingHours: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      maxBookingByUser: {
        allowNull: false,
        type: Sequelize.INTEGER,
      },
      picture: {
        allowNull: true,
        type: Sequelize.STRING,
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
    await queryInterface.dropTable('SharedSpaces');
  },
};
