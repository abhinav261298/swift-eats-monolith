import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeGateway } from './realtime.gateway';
import { RedisService } from '@database/redis/redis.service';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;

  const mockRedisService = {
    subscribe: jest.fn(),
    on: jest.fn(),
    psubscribe: jest.fn(),
  };

  const mockSocket = {
    id: 'socket-123',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: {
      headers: {},
      query: { token: 'test-token' },
      auth: {},
    },
    data: {},
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should handle client connection and store client', async () => {
      await gateway.handleConnection(mockSocket as any);

      expect(gateway['connectedClients'].has(mockSocket.id)).toBe(true);
      expect(gateway['connectedClients'].get(mockSocket.id)).toBe(mockSocket);
    });

    it('should disconnect client if no token provided', async () => {
      const socketWithoutToken = {
        ...mockSocket,
        handshake: {
          headers: {},
          query: {},
          auth: {},
        },
      };

      await gateway.handleConnection(socketWithoutToken as any);

      expect(socketWithoutToken.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection', () => {
      gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);

      expect(gateway['connectedClients'].has(mockSocket.id)).toBe(false);
    });
  });
});
