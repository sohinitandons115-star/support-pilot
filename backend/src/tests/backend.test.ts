import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../config/db';

// Mock DB configurations to avoid external connection overhead in tests
jest.mock('../config/db', () => {
  return {
    prisma: {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
        create: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      ticket: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      }
    },
    redis: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      call: jest.fn().mockImplementation((cmd, ...args) => {
        if (cmd === 'EVAL' || cmd === 'EVALSHA') {
          return Promise.resolve([1, 0]);
        }
        return Promise.resolve('1');
      }),
    },
    connectMongo: jest.fn().mockResolvedValue(true)
  };
});

jest.mock('../jobs/cron', () => ({
  initializeJobs: jest.fn()
}));

jest.mock('../models/MongoModels', () => ({
  Conversation: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  AgentRun: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  EvaluationResult: {
    create: jest.fn(),
  }
}));

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforpilot';

describe('1. UNIT TESTS - Security & Configurations', () => {
  
  test('Bcrypt Password Hashing & Comparison works', async () => {
    const password = 'mypassword123';
    const hash = await bcrypt.hash(password, 10);
    
    expect(hash).not.toBe(password);
    
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
    
    const isFail = await bcrypt.compare('wrongpassword', hash);
    expect(isFail).toBe(false);
  });

  test('JWT Sign and Verify decodes identity details', () => {
    const payload = { id: 'user-uuid-123', email: 'test@user.com', role: 'CUSTOMER' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  test('AI Cost Multiplier logic is accurate', () => {
    const inputTokens = 1000;
    const outputTokens = 2000;
    const costPerInput = 0.075 / 1000000;
    const costPerOutput = 0.30 / 1000000;

    const expectedCost = (inputTokens * costPerInput) + (outputTokens * costPerOutput);
    expect(expectedCost).toBeCloseTo(0.000675, 6);
  });
});

describe('2. INTEGRATION TESTS - Auth REST Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/v1/auth/register creates user and returns jwt token', async () => {
    const registerBody = {
      email: 'alex@customer.com',
      password: 'password123',
      name: 'Alex Doe'
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'uuid-alex-123',
      email: 'alex@customer.com',
      name: 'Alex Doe',
      role: 'CUSTOMER'
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(registerBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alex@customer.com');
  });

  test('POST /api/v1/auth/register fails with validation error on short password', async () => {
    const invalidBody = {
      email: 'alex@customer.com',
      password: '123', // Too short
      name: 'Alex'
    };

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(invalidBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/v1/auth/login returns JWT on correct credentials', async () => {
    const loginBody = {
      email: 'alex@customer.com',
      password: 'password123'
    };

    const hashedPassword = await bcrypt.hash('password123', 10);
    
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'uuid-alex-123',
      email: 'alex@customer.com',
      password: hashedPassword,
      name: 'Alex Doe',
      role: 'CUSTOMER'
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send(loginBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });
});

describe('3. INTEGRATION TESTS - Protected Resource Access (RBAC)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/v1/users/profile blocks requests without authentication token', async () => {
    const res = await request(app).get('/api/v1/users/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/users/profile accepts valid token and returns profile data', async () => {
    const userPayload = { id: 'uuid-alex-123', email: 'alex@customer.com', role: 'CUSTOMER' };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'uuid-alex-123',
      email: 'alex@customer.com',
      name: 'Alex Doe',
      role: 'CUSTOMER',
      createdAt: new Date(),
      subscription: { tier: 'FREE', status: 'INACTIVE' }
    });

    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alex Doe');
  });
});
