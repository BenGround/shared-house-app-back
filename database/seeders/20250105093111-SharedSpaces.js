'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return await queryInterface.bulkInsert('SharedSpaces', [
      {
        nameCode: 'music-theater',
        nameEn: 'Music theater',
        nameJp: '音楽劇場',
        startDayTime: '8:00',
        descriptionEn:
          'A theater for music lovers to enjoy their favorite music and artists. The theater is equipped with the latest sound system and lighting technology.',
        descriptionJp:
          '音楽愛好家が好きな音楽やアーティストを楽しむための劇場です。この劇場は、最新のサウンドシステムと照明技術を備えています。',
        endDayTime: '23:00',
        maxBookingHours: 3,
        maxBookingByUser: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameCode: 'gym',
        nameEn: 'Gym',
        nameJp: 'ジム',
        startDayTime: '8:00',
        descriptionEn:
          'A gym for fitness enthusiasts to work out and stay healthy. The gym is equipped with the latest fitness equipment and machines.',
        descriptionJp:
          'フィットネス愛好家がトレーニングを行い、健康を維持するためのジムです。このジムは、最新のフィットネス機器や設備を備えています。',
        endDayTime: '23:00',
        maxBookingHours: 1,
        maxBookingByUser: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        nameCode: 'bath',
        nameEn: 'Bath',
        nameJp: 'お風呂',
        startDayTime: '8:00',
        descriptionEn:
          'A bath for people to relax and unwind after a long day. The bath is equipped with hot water and jacuzzi.',
        descriptionJp:
          '人々が一日の疲れを癒し、リラックスするためのお風呂です。このお風呂は、温水とジャグジーを備えています。',
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
