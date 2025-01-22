'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return await queryInterface.bulkInsert('Users', [
      {
        username: 'Josh',
        roomNumber: '001',
        email: 'josh@mail.com',
        password: '$2b$08$L72YV9/UhKEr0S/f9VNjhODdC6hVEvuhF3ygyogNUeZW9PRkvDzRS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'Jeanne',
        roomNumber: '002',
        email: 'jeanne@mail.com',
        password: '$2b$08$L72YV9/UhKEr0S/f9VNjhODdC6hVEvuhF3ygyogNUeZW9PRkvDzRS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    return await queryInterface.bulkDelete('Users', null, {});
  },
};
