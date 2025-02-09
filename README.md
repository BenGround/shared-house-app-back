# Shared House App - Backend

## Description

The backend of the **Shared House App** is a RESTful API built with **Node.js** and **Express.js**. It handles the logic for managing bookings, user authentication, and shared space scheduling. The backend communicates with a PostgreSQL database to store user data, bookings, and admin settings. Real-time updates are facilitated using **WebSockets** to keep users informed of any changes to shared space availability.

## Tech Stack

- **Framework:** Node.js, Express.js
- **Database:** PostgreSQL
- **Authentication:** Express Session
- **Real-Time Updates:** WebSockets
- **Deployment:** Docker stack on AWS EC2
- **API Communication:** RESTful API
- **ORM/Database Access:** Sequelize

## Features

- User authentication & authorization
- Booking system for managing shared spaces
- Admin panel for managing users, bookings, and schedules
- Real-time booking updates using WebSockets
- Data storage and retrieval with PostgreSQL
- Dockerized deployment on AWS EC2 for scalability

## License

This project is licensed under the MIT License.
