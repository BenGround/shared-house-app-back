'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const users = [
      {
        username: 'admin',
        roomNumber: '000',
        password: '$2b$08$mpsMS/4iXC7/5g9lqyh/..DRrf6oqz98rCohdOmA7QYpn8GEXVm/y',
        createdAt: new Date(),
        updatedAt: new Date(),
        isAdmin: true,
      },
    ];

    const getUser = (roomNumber) => {
      return {
        roomNumber,
        password: 'NO_PASSWORD_YET',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    };

    for (let i = 101; i <= 299; i++) {
      users.push(getUser(i));
    }

    return await queryInterface.bulkInsert('Users', users);
  },

  async down(queryInterface, Sequelize) {
    return await queryInterface.bulkDelete('Users', null, {});
  },
};
