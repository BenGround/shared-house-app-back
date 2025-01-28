'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const users = [
      {
        username: 'admin',
        roomNumber: '000',
        password: 'noPasswordYet',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const getUser = (paddedNumber) => {
      return {
        roomNumber: paddedNumber,
        password: 'noPasswordYet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    for (let i = 1; i <= 299; i++) {
      const paddedNumber = i.toString().padStart(3, '0');
      users.push(getUser(paddedNumber));
    }

    return await queryInterface.bulkInsert('Users', users);
  },

  async down(queryInterface, Sequelize) {
    return await queryInterface.bulkDelete('Users', null, {});
  },
};
