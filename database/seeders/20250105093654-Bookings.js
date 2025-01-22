'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const date = new Date();
    date.setHours(8);
    const date8h = date;
    date.setHours(11);
    const date11h = date;

    return await queryInterface.bulkInsert('Bookings', [
      {
        userId: 1,
        sharedSpaceId: 1,
        startDate: date8h,
        endDate: date11h,
        createdAt: date8h,
        updatedAt: date8h,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  },
};
