# Project Structure

This document provides a detailed overview of the Swift Eats backend codebase organization and file structure.

## 📁 Root Directory Structure

```
swift-eats/
├── .github/                    # GitHub workflows and CI/CD
│   └── workflows/
│       └── ci.yml             # Continuous integration pipeline
├── src/                       # Source code directory
├── test/                      # End-to-end tests
├── tools/                     # Development tools and utilities
├── docker-compose.yml         # Docker services configuration
├── Dockerfile                 # Application container definition
├── init-db.sql               # Database initialization script
├── package.json              # Node.js dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── nest-cli.json             # NestJS CLI configuration
└── API-SPECIFICATION.yml     # OpenAPI/Swagger specification
```

## 🏗️ Source Code Structure (`src/`)

### Core Application Files
```
src/
├── main.ts                   # Application entry point (production)
├── main-dev.ts              # Development entry point with mocks
└── app.module.ts            # Root application module
```

### Module Organization

Each module follows a consistent structure with controllers, services, entities, DTOs, and tests:

#### 🔐 Authentication Module (`src/auth/`)
```
auth/
├── auth.controller.ts        # Authentication endpoints
├── auth.service.ts          # Authentication business logic
├── auth.module.ts           # Module configuration
├── dto/                     # Data Transfer Objects
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── user-response.dto.ts
├── entities/                # Database entities
│   └── user.entity.ts
├── guards/                  # Authentication guards
│   └── jwt-auth.guard.ts
├── strategies/              # Passport strategies
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
└── *.spec.ts               # Unit tests
```

#### 🍽️ Catalog Module (`src/catalog/`)
```
catalog/
├── catalog.controller.ts     # Restaurant and menu endpoints
├── catalog.service.ts       # Catalog business logic
├── catalog.module.ts        # Module configuration
├── entities/                # Database entities
│   ├── restaurant.entity.ts
│   └── menu-item.entity.ts
├── dto/                     # Data Transfer Objects
│   ├── create-restaurant.dto.ts
│   ├── create-menu-item.dto.ts
│   └── search-menu.dto.ts
└── *.spec.ts               # Unit tests
```

#### 📦 Orders Module (`src/orders/`)
```
orders/
├── orders.controller.ts      # Order management endpoints
├── orders.service.ts        # Order business logic
├── orders.module.ts         # Module configuration
├── entities/                # Database entities
│   ├── order.entity.ts
│   ├── order-item.entity.ts
│   └── outbox-event.entity.ts
├── dto/                     # Data Transfer Objects
│   ├── create-order.dto.ts
│   └── update-order-status.dto.ts
├── workers/                 # Background job processors
│   └── outbox-worker.service.ts
└── *.spec.ts               # Unit tests
```

#### 💳 Payments Module (`src/payments/`)
```
payments/
├── payments.controller.ts    # Payment processing endpoints
├── payments.service.ts      # Payment business logic
├── payments.module.ts       # Module configuration
├── entities/                # Database entities
│   └── payment.entity.ts
├── dto/                     # Data Transfer Objects
│   ├── create-payment.dto.ts
│   └── payment-response.dto.ts
└── *.spec.ts               # Unit tests
```

#### 🚚 Logistics Module (`src/logistics/`)
```
logistics/
├── logistics.controller.ts   # Delivery management endpoints
├── logistics.service.ts     # Logistics business logic
├── logistics.module.ts      # Module configuration
├── entities/                # Database entities
│   └── delivery.entity.ts
├── dto/                     # Data Transfer Objects
│   ├── assign-delivery.dto.ts
│   └── update-location.dto.ts
└── *.spec.ts               # Unit tests
```

#### 📊 Telemetry Module (`src/telemetry/`)
```
telemetry/
├── telemetry.controller.ts   # Event logging endpoints
├── telemetry.service.ts     # Telemetry business logic
├── telemetry.module.ts      # Module configuration
├── schemas/                 # MongoDB schemas
│   ├── telemetry.schema.ts
│   └── driver-location.schema.ts
├── dto/                     # Data Transfer Objects
│   └── ingest-telemetry.dto.ts
├── workers/                 # Background processors
│   └── gps-processor.service.ts
└── *.spec.ts               # Unit tests
```

#### 🔄 Realtime Module (`src/realtime/`)
```
realtime/
├── realtime.gateway.ts       # WebSocket gateway
├── realtime.module.ts       # Module configuration
├── guards/                  # WebSocket guards
│   └── ws-jwt-auth.guard.ts
└── *.spec.ts               # Unit tests
```

#### 📈 Analytics Module (`src/analytics/`)
```
analytics/
├── analytics.controller.ts   # Analytics endpoints
├── analytics.service.ts     # Analytics business logic
├── analytics.module.ts      # Module configuration
└── *.spec.ts               # Unit tests
```

### Shared Infrastructure

#### 🔧 Common Module (`src/common/`)
```
common/
├── common.module.ts         # Shared module configuration
├── decorators/              # Custom decorators
│   └── user.decorator.ts
├── filters/                 # Exception filters
│   └── http-exception.filter.ts
├── interceptors/            # Request/response interceptors
│   └── logging.interceptor.ts
└── pipes/                   # Validation pipes
    └── validation.pipe.ts
```

#### ⚙️ Configuration Module (`src/config/`)
```
config/
├── config.module.ts         # Configuration module
└── configuration.ts         # Environment validation schema
```

#### 🗄️ Database Module (`src/database/`)
```
database/
├── database.module.ts       # Database connections setup
└── redis/                   # Redis-specific services
    ├── redis.module.ts
    └── redis.service.ts
```

## 🧪 Testing Structure

### Unit Tests
- Located alongside source files with `.spec.ts` extension
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test business logic in isolation

### End-to-End Tests (`test/`)
```
test/
├── app.e2e-spec.ts         # Application-wide E2E tests
└── jest-e2e.json           # E2E Jest configuration
```

## 🛠️ Development Tools (`tools/`)

```
tools/
└── simulator/
    └── driver-sim.ts        # Driver location simulator for testing
```

## 📋 Configuration Files

### TypeScript Configuration
- `tsconfig.json` - Main TypeScript configuration
- Path aliases configured for clean imports (`@auth/*`, `@catalog/*`, etc.)

### NestJS Configuration
- `nest-cli.json` - NestJS CLI settings
- Webpack configuration for development builds

### Testing Configuration
- Jest configuration in `package.json`
- Coverage thresholds set to 70%
- Module name mapping for path aliases

### Docker Configuration
- `Dockerfile` - Multi-stage build for production
- `docker-compose.yml` - Development environment setup
- `init-db.sql` - PostgreSQL initialization

## 🎯 Design Patterns Used

### Module Pattern
- Each business domain is encapsulated in its own module
- Clear separation of concerns
- Dependency injection throughout

### Repository Pattern
- TypeORM repositories for PostgreSQL entities
- Mongoose models for MongoDB collections
- Abstracted data access layer

### Event-Driven Architecture
- Outbox pattern for reliable event publishing
- Redis pub/sub for real-time communication
- Background job processing with BullMQ

### Decorator Pattern
- Custom decorators for common functionality
- Guards for authentication and authorization
- Interceptors for cross-cutting concerns

## 📦 Dependency Management

### Production Dependencies
- **Framework**: NestJS ecosystem packages
- **Databases**: TypeORM, Mongoose, ioredis
- **Authentication**: Passport, JWT
- **Validation**: class-validator, class-transformer
- **Logging**: Pino with structured logging
- **Real-time**: Socket.IO

### Development Dependencies
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier
- **TypeScript**: Compiler and type definitions
- **Build Tools**: NestJS CLI, ts-node

## 🔄 Import Path Conventions

The project uses TypeScript path mapping for clean imports:

```typescript
// Instead of relative imports
import { AuthService } from '../../../auth/auth.service';

// Use path aliases
import { AuthService } from '@auth/auth.service';
```

Available aliases:
- `@/*` → `src/*`
- `@auth/*` → `src/auth/*`
- `@catalog/*` → `src/catalog/*`
- `@orders/*` → `src/orders/*`
- `@payments/*` → `src/payments/*`
- `@logistics/*` → `src/logistics/*`
- `@telemetry/*` → `src/telemetry/*`
- `@realtime/*` → `src/realtime/*`
- `@analytics/*` → `src/analytics/*`
- `@common/*` → `src/common/*`
- `@config/*` → `src/config/*`
- `@database/*` → `src/database/*`

## 📝 File Naming Conventions

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Modules**: `*.module.ts`
- **Entities**: `*.entity.ts`
- **DTOs**: `*.dto.ts`
- **Guards**: `*.guard.ts`
- **Strategies**: `*.strategy.ts`
- **Interceptors**: `*.interceptor.ts`
- **Filters**: `*.filter.ts`
- **Pipes**: `*.pipe.ts`
- **Tests**: `*.spec.ts`
- **E2E Tests**: `*.e2e-spec.ts`

This structure promotes maintainability, scalability, and clear separation of concerns while following NestJS best practices.
