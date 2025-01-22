'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return await queryInterface.bulkInsert('SharedSpaces', [
      {
        nameCode: 'music-theater',
        startDayTime: '8:00',
        description:
          'A theater for music lovers to enjoy their favorite music and artists. The theater is equipped with the latest sound system and lighting technology.',
        endDayTime: '23:00',
        maxBookingHours: 3,
        maxBookingByUser: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameCode: 'gym',
        startDayTime: '8:00',
        description:
          'A gym for fitness enthusiasts to work out and stay healthy. The gym is equipped with the latest fitness equipment and machines.',
        endDayTime: '23:00',
        maxBookingHours: 1,
        maxBookingByUser: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameCode: 'bath',
        startDayTime: '8:00',
        description:
          'A bath for people to relax and unwind after a long day. The bath is equipped with hot water and jacuzzi.',
        endDayTime: '23:00',
        maxBookingHours: 1,
        maxBookingByUser: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return await queryInterface.bulkDelete('Users', null, {});
  },
};
