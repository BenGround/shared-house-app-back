import { Sequelize } from 'sequelize-typescript'; // Import from sequelize-typescript
import { SharedSpace } from './sharedspace.model'; // Import the SharedSpace model
import request from 'supertest';
import { app } from '../../index';

jest.mock('./sharedspace.model');

const mockSharedSpaces = [
  { nameCode: 1, name: 'Shared Space 1' },
  { nameCode: 2, name: 'Shared Space 2' },
];

jest.mock('./sharedSpace.helper', () => ({
  frontShareSpaceInfo: jest.fn().mockImplementation((data) => data),
}));

describe('SharedSpace Controller - List', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Create Sequelize instance for testing
    sequelize = new Sequelize({
      dialect: 'postgres',
      storage: ':memory:',
      models: [SharedSpace], // Register models here
    });

    await sequelize.sync(); // Sync the models to create the tables
  });

  afterAll(async () => {
    await sequelize.close(); // Close the connection after tests
  });

  it('should return a list of shared spaces', async () => {
    (SharedSpace.findAll as jest.Mock).mockResolvedValue(mockSharedSpaces);

    const response = await request(app).get('/sharedspace/list');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockSharedSpaces);
    expect(response.body.data.length).toBe(2);
  });

  it('should return 404 when no shared spaces are found', async () => {
    (SharedSpace.findAll as jest.Mock).mockResolvedValue([]);

    const response = await request(app).get('/sharedspace/list');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'SHAREDSPACE_LIST',
      message: 'No shared spaces found!',
    });
  });

  it('should return 500 if there is an error retrieving shared spaces', async () => {
    (SharedSpace.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await request(app).get('/sharedspace/list');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      code: 'SHAREDSPACE_LIST',
      message: 'Error retrieving shared spaces',
    });
  });
});
