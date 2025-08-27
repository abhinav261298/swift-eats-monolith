import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@database/redis/redis.service';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';

@Injectable()
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(private redisService: RedisService) {
    // Setup Redis subscriptions after a delay to allow Redis connection
    setTimeout(() => {
      this.setupRedisSubscriptions();
    }, 2000);
  }

  async handleConnection(client: Socket) {
    try {
      // Validate JWT token
      const guard = new WsJwtAuthGuard(null); // We'll handle auth manually here
      const token = this.extractTokenFromHandshake(client);
      
      if (!token) {
        client.disconnect();
        return;
      }

      // For now, skip JWT validation in development
      // In production, you'd validate the token here
      
      this.logger.log(`Client connected: ${client.id}`);
      this.connectedClients.set(client.id, client);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const token = client.handshake.query.token;
    if (token && typeof token === 'string') {
      return token;
    }

    const auth = client.handshake.auth;
    if (auth && auth.token) {
      return auth.token;
    }

    return null;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { room: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Validate room format: order:{id} or driver:{id}
    if (!this.isValidRoom(data.room)) {
      client.emit('error', { message: 'Invalid room format. Use order:{id} or driver:{id}' });
      return;
    }

    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    
    if (data.userId) {
      client.data.userId = data.userId;
    }

    client.emit('joined-room', { room: data.room });
  }

  private isValidRoom(room: string): boolean {
    return /^(order|driver):[a-zA-Z0-9-_]+$/.test(room);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);
  }

  @SubscribeMessage('order-update')
  handleOrderUpdate(
    @MessageBody() data: { orderId: string; status: string; message?: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast order update to all clients in the order room
    this.server.to(`order-${data.orderId}`).emit('order-status-changed', {
      orderId: data.orderId,
      status: data.status,
      message: data.message,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('delivery-location-update')
  handleDeliveryLocationUpdate(
    @MessageBody() data: { orderId: string; location: { lat: number; lng: number } },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast delivery partner location to customers tracking the order
    this.server.to(`order-${data.orderId}`).emit('delivery-location', {
      orderId: data.orderId,
      location: data.location,
      timestamp: new Date(),
    });
  }

  // Public methods for broadcasting events from services
  async broadcastOrderUpdate(orderId: string, status: string, message?: string) {
    this.server.to(`order-${orderId}`).emit('order-status-changed', {
      orderId,
      status,
      message,
      timestamp: new Date(),
    });
  }

  async broadcastDeliveryUpdate(orderId: string, location: { lat: number; lng: number }) {
    this.server.to(`order-${orderId}`).emit('delivery-location', {
      orderId,
      location,
      timestamp: new Date(),
    });
  }

  async broadcastRestaurantNotification(restaurantId: string, notification: any) {
    this.server.to(`restaurant-${restaurantId}`).emit('restaurant-notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  async broadcastUserNotification(userId: string, notification: any) {
    // Find all sockets for this user
    const userSockets = Array.from(this.connectedClients.values()).filter(
      socket => socket.data.userId === userId,
    );

    userSockets.forEach(socket => {
      socket.emit('user-notification', {
        ...notification,
        timestamp: new Date(),
      });
    });
  }

  private async setupRedisSubscriptions() {
    try {
      // Subscribe to order-specific channels for driver location updates
      // We'll use a pattern subscription to listen to all order:{id} channels
      const redis = this.redisService.getSubscriber();
      
      // Subscribe to pattern order:*
      await redis.psubscribe('order:*');
      
      redis.on('pmessage', (pattern, channel, message) => {
        try {
          const data = JSON.parse(message);
          
          if (channel.startsWith('order:')) {
            const orderId = channel.split(':')[1];
            
            // Emit driverLocation event to the order room
            this.server.to(`order:${orderId}`).emit('driverLocation', {
              orderId,
              driverId: data.driverId,
              location: data.location,
              timestamp: data.location.timestamp,
              type: 'driver_location_update'
            });
            
            this.logger.debug(`Broadcasted driver location to order:${orderId}`);
          }
        } catch (error) {
          this.logger.error('Failed to process Redis message:', error.message);
        }
      });

      // Subscribe to general order updates
      await this.redisService.subscribe('order-updates', (message) => {
        const data = JSON.parse(message);
        this.broadcastOrderUpdate(data.orderId, data.status, data.message);
      });

      this.logger.log('Redis subscriptions setup successfully');
    } catch (error) {
      this.logger.warn('Failed to setup Redis subscriptions:', error.message);
    }
  }
}
