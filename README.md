# Swift Eats - Modular Monolith Backend

A comprehensive NestJS-based food delivery platform backend built with TypeScript, Fastify, and a modular monolith architecture.

## 🏗️ Architecture

This application follows a modular monolith pattern with the following modules:

- **Auth**: User authentication and authorization with JWT
- **Catalog**: Restaurant and menu item management
- **Orders**: Order processing and management
- **Payments**: Mock payment processing system
- **Logistics**: Delivery partner assignment and tracking
- **Telemetry**: Event logging and monitoring with MongoDB
- **Realtime**: WebSocket gateway for real-time updates
- **Analytics**: Business intelligence and reporting
- **Common**: Shared utilities, pipes, filters, and interceptors
- **Database**: Multi-database setup (PostgreSQL, MongoDB, Redis)

## 🛠️ Tech Stack

- **Framework**: NestJS with Fastify
- **Language**: TypeScript
- **Databases**: 
  - PostgreSQL (primary data with TypeORM)
  - MongoDB (telemetry data with Mongoose)
  - Redis (caching, pub/sub, sessions with ioredis)
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Logging**: Pino
- **Real-time**: Socket.IO WebSockets
- **Queue**: BullMQ (Redis-based)
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure and API**:
```bash
docker-compose up -d --build
```

4. **Database migration and seeding**:
```bash
npm run db:migrate && npm run db:seed
```

5. **Start driver simulator** (optional):
```bash
npx ts-node tools/simulator/driver-sim.ts --drivers 50 --eps 10 --mode http
```

6. **Development mode** (alternative to Docker):
```bash
npm run start:dev
```

## 📦 Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug        # Start with debugging

# Production
npm run build              # Build the application
npm run start:prod         # Start production build

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier

# Testing
npm run test               # Run unit tests
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run end-to-end tests
```

## 🐳 Docker Services

The docker-compose setup includes:

- **swift-eats-api**: Main NestJS application (port 6988)
- **postgres**: PostgreSQL 16 database (port 5433)
- **mongo**: MongoDB 7 database (port 27017)
- **redis**: Redis 7 cache/pub-sub (port 6379)
- **redis-commander**: Redis web UI (port 8081)

## 🔗 Quick Access URLs

After starting the services, you can access:

- **API Base URL**: `http://localhost:6988`
- **Sample Restaurant Menu**: `GET http://localhost:6988/restaurants/:id/menu`
- **WebSocket Gateway**: `ws://localhost:6988/ws`
- **Redis Commander**: `http://localhost:8081`

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/profile` - Get user profile

### Catalog
- `GET /api/v1/catalog/restaurants` - List all restaurants
- `GET /api/v1/catalog/restaurants/:id` - Get restaurant details
- `GET /api/v1/catalog/restaurants/:id/menu` - Get restaurant menu
- `GET /api/v1/catalog/menu/search?q=query` - Search menu items

### Orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/my-orders` - Get user's orders
- `GET /api/v1/orders/:id` - Get order details
- `PATCH /api/v1/orders/:id/status` - Update order status

### Payments
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/my-payments` - Get user's payments
- `GET /api/v1/payments/order/:orderId` - Get payment by order

### Logistics
- `POST /api/v1/logistics/assign/:orderId` - Assign delivery partner
- `GET /api/v1/logistics/delivery/:orderId` - Get delivery status
- `GET /api/v1/logistics/track/:trackingId` - Track order

### Analytics
- `GET /api/v1/analytics/dashboard` - Get dashboard metrics
- `GET /api/v1/analytics/user-behavior` - Get user behavior analytics

### Telemetry
- `POST /api/v1/telemetry/event` - Log telemetry event
- `GET /api/v1/telemetry/stats` - Get event statistics

## 🔌 WebSocket Events

Connect to `/` for real-time updates:

### Client Events
- `join-room` - Join a room for updates
- `leave-room` - Leave a room
- `order-update` - Send order status update
- `delivery-location-update` - Send delivery location

### Server Events
- `order-status-changed` - Order status updates
- `delivery-location` - Real-time delivery tracking
- `restaurant-notification` - Restaurant notifications
- `user-notification` - User notifications

## 🗄️ Database Schema

### PostgreSQL Tables
- `users` - User accounts and authentication
- `restaurants` - Restaurant information
- `menu_items` - Restaurant menu items
- `orders` - Customer orders
- `order_items` - Order line items
- `payments` - Payment transactions

### MongoDB Collections
- `telemetries` - Application telemetry and events

### Redis Keys
- `delivery:*` - Delivery assignments
- `partner:location:*` - Partner locations
- Session and cache data

## 🔧 Configuration

All configuration is handled through environment variables validated by Joi schema. See `.env.example` for all available options.

## 🧪 Testing

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 📊 Monitoring & Observability

- **Logging**: Structured logging with Pino
- **Telemetry**: Custom event tracking in MongoDB
- **Health Checks**: Built-in health check endpoints
- **Error Handling**: Global exception filters
- **Request Logging**: Request/response logging interceptor

## 🔒 Security Features

- JWT-based authentication
- Input validation with class-validator
- SQL injection protection with TypeORM
- CORS configuration
- Rate limiting ready (implement as needed)

## 🚀 Deployment

### Docker Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
```bash
npm run build
npm run start:prod
```

## 📝 Development Guidelines

- Follow NestJS conventions and patterns
- Use TypeScript strict mode
- Implement proper error handling
- Add comprehensive logging
- Write unit tests for services
- Use DTOs for request/response validation
- Follow the established module structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Swift Eats Backend** - Built with ❤️ using NestJS
