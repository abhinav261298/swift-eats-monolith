# Swift Eats - System Architecture

This document provides a comprehensive overview of the Swift Eats backend architecture, design patterns, and system components.

## 🏗️ Architecture Overview

Swift Eats follows a **Modular Monolith** architecture pattern, providing the benefits of microservices organization while maintaining the simplicity of a single deployable unit.

### Key Architectural Principles

- **Domain-Driven Design (DDD)**: Each module represents a bounded context
- **Separation of Concerns**: Clear boundaries between business logic, data access, and presentation
- **Event-Driven Architecture**: Asynchronous communication through events
- **CQRS Pattern**: Command Query Responsibility Segregation for complex operations
- **Outbox Pattern**: Reliable event publishing with transactional guarantees

## 🎯 Complete System Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        WEB["🌐 Web App<br/>(React/Vue)"]
        MOBILE["📱 Mobile App<br/>(React Native)"]
        ADMIN["⚙️ Admin Dashboard"]
        DRIVER["🚗 Driver App"]
    end

    subgraph "Load Balancer"
        LB["🔄 Nginx<br/>Load Balancer"]
    end

    subgraph "Swift Eats Backend (NestJS)"
        subgraph "API Layer"
            AUTH_API["🔐 Auth API"]
            CATALOG_API["📋 Catalog API"]
            ORDERS_API["🛒 Orders API"]
            PAYMENTS_API["💳 Payments API"]
            LOGISTICS_API["🚚 Logistics API"]
            TELEMETRY_API["📊 Telemetry API"]
            ANALYTICS_API["📈 Analytics API"]
            SIMULATOR_API["🎮 Simulator API"]
        end

        subgraph "Real-time Layer"
            WS_GATEWAY["🔌 WebSocket Gateway<br/>(Socket.io)"]
        end

        subgraph "Business Logic"
            AUTH_SVC["Auth Service"]
            CATALOG_SVC["Catalog Service"]
            ORDERS_SVC["Orders Service"]
            PAYMENTS_SVC["Payments Service"]
            LOGISTICS_SVC["Logistics Service"]
            TELEMETRY_SVC["Telemetry Service"]
            ANALYTICS_SVC["Analytics Service"]
            SIMULATOR_SVC["Simulator Service"]
        end
    end

    subgraph "Data Storage"
        POSTGRES[("🐘 PostgreSQL<br/>Primary Database")]
        MONGODB[("🍃 MongoDB<br/>Telemetry Data")]
        REDIS[("🔴 Redis<br/>Cache & Sessions")]
    end

    subgraph "External Services"
        PAYMENT_GW["💰 Payment Gateway<br/>(Stripe/Razorpay)"]
        MAPS_API["🗺️ Maps API<br/>(Google Maps)"]
        NOTIFICATION["📧 Notification<br/>(Email/SMS)"]
    end

    %% Client to Load Balancer
    WEB --> LB
    MOBILE --> LB
    ADMIN --> LB
    DRIVER --> LB

    %% Load Balancer to APIs
    LB --> AUTH_API
    LB --> CATALOG_API
    LB --> ORDERS_API
    LB --> PAYMENTS_API
    LB --> LOGISTICS_API
    LB --> TELEMETRY_API
    LB --> ANALYTICS_API
    LB --> SIMULATOR_API
    LB --> WS_GATEWAY

    %% APIs to Services
    AUTH_API --> AUTH_SVC
    CATALOG_API --> CATALOG_SVC
    ORDERS_API --> ORDERS_SVC
    PAYMENTS_API --> PAYMENTS_SVC
    LOGISTICS_API --> LOGISTICS_SVC
    TELEMETRY_API --> TELEMETRY_SVC
    ANALYTICS_API --> ANALYTICS_SVC
    SIMULATOR_API --> SIMULATOR_SVC

    %% Services to Databases
    AUTH_SVC --> POSTGRES
    CATALOG_SVC --> POSTGRES
    ORDERS_SVC --> POSTGRES
    PAYMENTS_SVC --> POSTGRES
    LOGISTICS_SVC --> POSTGRES
    ANALYTICS_SVC --> POSTGRES
    TELEMETRY_SVC --> MONGODB
    SIMULATOR_SVC --> REDIS

    %% Redis Connections
    AUTH_SVC --> REDIS
    ORDERS_SVC --> REDIS
    LOGISTICS_SVC --> REDIS
    WS_GATEWAY --> REDIS

    %% External Services
    PAYMENTS_SVC --> PAYMENT_GW
    LOGISTICS_SVC --> MAPS_API
    ORDERS_SVC --> NOTIFICATION

    %% Real-time connections
    WEB -.->|WebSocket| WS_GATEWAY
    MOBILE -.->|WebSocket| WS_GATEWAY
    DRIVER -.->|WebSocket| WS_GATEWAY

    classDef clientStyle fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef apiStyle fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef serviceStyle fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef dataStyle fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef externalStyle fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class WEB,MOBILE,ADMIN,DRIVER clientStyle
    class AUTH_API,CATALOG_API,ORDERS_API,PAYMENTS_API,LOGISTICS_API,TELEMETRY_API,ANALYTICS_API,SIMULATOR_API,WS_GATEWAY apiStyle
    class AUTH_SVC,CATALOG_SVC,ORDERS_SVC,PAYMENTS_SVC,LOGISTICS_SVC,TELEMETRY_SVC,ANALYTICS_SVC,SIMULATOR_SVC serviceStyle
    class POSTGRES,MONGODB,REDIS dataStyle
    class PAYMENT_GW,MAPS_API,NOTIFICATION externalStyle
```

## 🔄 Order Lifecycle Flow

```mermaid
sequenceDiagram
    participant Customer as 👤 Customer
    participant Web as 🌐 Web App
    participant API as 🚀 Swift Eats API
    participant DB as 🐘 PostgreSQL
    participant Redis as 🔴 Redis
    participant WS as 🔌 WebSocket
    participant Driver as 🚗 Driver
    participant Payment as 💳 Payment Gateway

    Customer->>Web: Browse Restaurants
    Web->>API: GET /catalog/restaurants
    API->>DB: Query restaurants
    DB-->>API: Restaurant data
    API-->>Web: Restaurant list
    Web-->>Customer: Display restaurants

    Customer->>Web: Place Order
    Web->>API: POST /orders
    API->>DB: Create order
    DB-->>API: Order created
    API->>Redis: Cache order
    API-->>Web: Order confirmation
    
    Web->>API: Process Payment
    API->>Payment: Charge customer
    Payment-->>API: Payment success
    API->>DB: Update order status
    
    API->>WS: Broadcast order update
    WS-->>Web: Real-time notification
    
    API->>API: Assign driver
    API->>Redis: Update driver location
    API->>WS: Driver assigned
    WS-->>Web: Driver info
    WS-->>Driver: New order
    
    Driver->>API: GPS updates
    API->>Redis: Store location
    API->>WS: Location update
    WS-->>Web: Live tracking
    
    Driver->>API: Order delivered
    API->>DB: Complete order
    API->>WS: Order completed
    WS-->>Web: Delivery confirmation
```

## 🏗️ Microservices Architecture

```mermaid
graph LR
    subgraph "Authentication Domain"
        AUTH_M["🔐 Auth Module"]
        USER_E["👤 User Entity"]
        JWT_G["🛡️ JWT Guard"]
        AUTH_M --> USER_E
        AUTH_M --> JWT_G
    end

    subgraph "Catalog Domain"
        CAT_M["📋 Catalog Module"]
        REST_E["🏪 Restaurant Entity"]
        MENU_E["🍕 Menu Item Entity"]
        CAT_M --> REST_E
        CAT_M --> MENU_E
    end

    subgraph "Orders Domain"
        ORD_M["🛒 Orders Module"]
        ORDER_E["📝 Order Entity"]
        ITEM_E["🍔 Order Item Entity"]
        OUTBOX_E["📤 Outbox Event Entity"]
        ORD_M --> ORDER_E
        ORD_M --> ITEM_E
        ORD_M --> OUTBOX_E
    end

    subgraph "Payments Domain"
        PAY_M["💳 Payments Module"]
        PAYMENT_E["💰 Payment Entity"]
        PAY_M --> PAYMENT_E
    end

    subgraph "Logistics Domain"
        LOG_M["🚚 Logistics Module"]
        DELIVERY_E["📦 Delivery Entity"]
        LOG_M --> DELIVERY_E
    end

    subgraph "Telemetry Domain"
        TEL_M["📊 Telemetry Module"]
        GPS_E["📍 GPS Event"]
        METRIC_E["📈 Metrics"]
        TEL_M --> GPS_E
        TEL_M --> METRIC_E
    end

    subgraph "Real-time Domain"
        RT_M["🔌 Realtime Module"]
        WS_GW["🌐 WebSocket Gateway"]
        RT_M --> WS_GW
    end

    %% Inter-module dependencies
    ORD_M -.-> CAT_M
    ORD_M -.-> PAY_M
    ORD_M -.-> LOG_M
    PAY_M -.-> ORD_M
    LOG_M -.-> ORD_M
    RT_M -.-> ORD_M
    TEL_M -.-> LOG_M
```

## 🎯 System Components Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        ADMIN[Admin Dashboard]
    end

    subgraph "API Gateway Layer"
        NGINX[Nginx/Load Balancer]
        CORS[CORS Handler]
        RATE[Rate Limiter]
    end

    subgraph "Swift Eats Backend (NestJS)"
        subgraph "Presentation Layer"
            AUTH_CTRL[Auth Controller]
            CATALOG_CTRL[Catalog Controller]
            ORDERS_CTRL[Orders Controller]
            PAYMENTS_CTRL[Payments Controller]
            LOGISTICS_CTRL[Logistics Controller]
            ANALYTICS_CTRL[Analytics Controller]
            TELEMETRY_CTRL[Telemetry Controller]
            WS_GATEWAY[WebSocket Gateway]
        end

        subgraph "Business Logic Layer"
            AUTH_SVC[Auth Service]
            CATALOG_SVC[Catalog Service]
            ORDERS_SVC[Orders Service]
            PAYMENTS_SVC[Payments Service]
            LOGISTICS_SVC[Logistics Service]
            ANALYTICS_SVC[Analytics Service]
            TELEMETRY_SVC[Telemetry Service]
        end

        subgraph "Infrastructure Layer"
            COMMON[Common Module]
            CONFIG[Configuration]
            GUARDS[Guards & Interceptors]
            PIPES[Validation Pipes]
            FILTERS[Exception Filters]
        end
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        MONGODB[(MongoDB)]
        REDIS[(Redis)]
    end

    subgraph "External Services"
        PAYMENT_GATEWAY[Payment Gateway]
        MAPS_API[Maps API]
        NOTIFICATION[Notification Service]
    end

    %% Client connections
    WEB --> NGINX
    MOBILE --> NGINX
    ADMIN --> NGINX

    %% API Gateway to Controllers
    NGINX --> AUTH_CTRL
    NGINX --> CATALOG_CTRL
    NGINX --> ORDERS_CTRL
    NGINX --> PAYMENTS_CTRL
    NGINX --> LOGISTICS_CTRL
    NGINX --> ANALYTICS_CTRL
    NGINX --> TELEMETRY_CTRL
    NGINX --> WS_GATEWAY

    %% Controllers to Services
    AUTH_CTRL --> AUTH_SVC
    CATALOG_CTRL --> CATALOG_SVC
    ORDERS_CTRL --> ORDERS_SVC
    PAYMENTS_CTRL --> PAYMENTS_SVC
    LOGISTICS_CTRL --> LOGISTICS_SVC
    ANALYTICS_CTRL --> ANALYTICS_SVC
    TELEMETRY_CTRL --> TELEMETRY_SVC

    %% Services to Data
    AUTH_SVC --> POSTGRES
    CATALOG_SVC --> POSTGRES
    ORDERS_SVC --> POSTGRES
    PAYMENTS_SVC --> POSTGRES
    LOGISTICS_SVC --> POSTGRES
    ANALYTICS_SVC --> POSTGRES
    TELEMETRY_SVC --> MONGODB

    %% Redis connections
    AUTH_SVC --> REDIS
    ORDERS_SVC --> REDIS
    LOGISTICS_SVC --> REDIS
    WS_GATEWAY --> REDIS

    %% External service connections
    PAYMENTS_SVC --> PAYMENT_GATEWAY
    LOGISTICS_SVC --> MAPS_API
    ORDERS_SVC --> NOTIFICATION

    %% Infrastructure
    COMMON --> GUARDS
    COMMON --> PIPES
    COMMON --> FILTERS
```

## 🔄 Real-time Data Flow

```mermaid
flowchart TD
    subgraph "Driver Apps"
        D1["🚗 Driver 1"]
        D2["🚗 Driver 2"]
        DN["🚗 Driver N"]
    end

    subgraph "Customer Apps"
        C1["👤 Customer 1"]
        C2["👤 Customer 2"]
        CN["👤 Customer N"]
    end

    subgraph "Swift Eats Backend"
        TEL_API["📊 Telemetry API"]
        WS_GW["🔌 WebSocket Gateway"]
        SIM["🎮 Simulator Service"]
    end

    subgraph "Data Stores"
        REDIS["🔴 Redis Streams"]
        MONGO["🍃 MongoDB"]
    end

    %% GPS Data Flow
    D1 -->|GPS Events| TEL_API
    D2 -->|GPS Events| TEL_API
    DN -->|GPS Events| TEL_API
    
    %% Simulator Data Flow
    SIM -->|Simulated GPS| TEL_API
    
    %% Data Processing
    TEL_API -->|XADD Stream| REDIS
    REDIS -->|Consumer Group| TEL_API
    TEL_API -->|Store Events| MONGO
    
    %% Real-time Broadcasting
    TEL_API -->|Pub/Sub| REDIS
    REDIS -->|Location Updates| WS_GW
    
    %% Client Connections
    WS_GW -.->|WebSocket| C1
    WS_GW -.->|WebSocket| C2
    WS_GW -.->|WebSocket| CN
    
    %% Load Testing
    SIM -.->|50 Drivers<br/>10 Events/sec| TEL_API

    classDef driverStyle fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef customerStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef apiStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef dataStyle fill:#fff8e1,stroke:#f57c00,stroke-width:2px

    class D1,D2,DN driverStyle
    class C1,C2,CN customerStyle
    class TEL_API,WS_GW,SIM apiStyle
    class REDIS,MONGO dataStyle
```

## 📊 Load Testing Architecture

```mermaid
graph TB
    subgraph "Load Test Setup"
        LT["🎮 Load Test Demo"]
        CONFIG["⚙️ Configuration<br/>50 Drivers<br/>10 Events/sec"]
    end

    subgraph "Simulator Service"
        SIM_CTRL["🎮 Simulator Controller"]
        SIM_SVC["🔧 Simulator Service"]
        DRIVERS["🚗 Virtual Drivers Array<br/>[driver-001...driver-050]"]
    end

    subgraph "Event Generation"
        GPS_GEN["📍 GPS Generator<br/>100ms intervals"]
        STATUS_GEN["📊 Status Generator<br/>Available/Busy"]
        METRICS["📈 Metrics Collector"]
    end

    subgraph "Data Processing"
        TEL_API["📊 Telemetry API"]
        REDIS_STREAM["🔴 Redis Streams"]
        MONGO_STORE["🍃 MongoDB Storage"]
    end

    subgraph "Monitoring"
        DASHBOARD["📊 Real-time Dashboard"]
        LOGS["📝 System Logs"]
        PERF["⚡ Performance Metrics"]
    end

    LT --> CONFIG
    CONFIG --> SIM_CTRL
    SIM_CTRL --> SIM_SVC
    SIM_SVC --> DRIVERS
    
    DRIVERS --> GPS_GEN
    DRIVERS --> STATUS_GEN
    GPS_GEN --> METRICS
    STATUS_GEN --> METRICS
    
    METRICS --> TEL_API
    TEL_API --> REDIS_STREAM
    TEL_API --> MONGO_STORE
    
    TEL_API --> DASHBOARD
    SIM_SVC --> LOGS
    METRICS --> PERF

    classDef testStyle fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef simStyle fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef genStyle fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef dataStyle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef monStyle fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class LT,CONFIG testStyle
    class SIM_CTRL,SIM_SVC,DRIVERS simStyle
    class GPS_GEN,STATUS_GEN,METRICS genStyle
    class TEL_API,REDIS_STREAM,MONGO_STORE dataStyle
    class DASHBOARD,LOGS,PERF monStyle
```

## 🏛️ Module Architecture

### Core Business Modules

```mermaid
graph TB
    subgraph "Swift Eats Modular Architecture"
        subgraph "Core Modules"
            AUTH["🔐 Authentication<br/>• User Management<br/>• JWT Tokens<br/>• Role-based Access"]
            CATALOG["📋 Catalog<br/>• Restaurant Management<br/>• Menu Items<br/>• Search & Filtering"]
            ORDERS["🛒 Orders<br/>• Order Processing<br/>• Status Management<br/>• Event Publishing"]
        end

        subgraph "Supporting Modules"
            PAYMENTS["💳 Payments<br/>• Payment Processing<br/>• Transaction History<br/>• Refund Management"]
            LOGISTICS["🚚 Logistics<br/>• Driver Assignment<br/>• Route Optimization<br/>• Delivery Tracking"]
            TELEMETRY["📊 Telemetry<br/>• GPS Data Ingestion<br/>• Real-time Streaming<br/>• Analytics"]
        end

        subgraph "Infrastructure Modules"
            REALTIME["🔌 Real-time<br/>• WebSocket Gateway<br/>• Event Broadcasting<br/>• Live Updates"]
            ANALYTICS["📈 Analytics<br/>• Business Intelligence<br/>• Performance Metrics<br/>• Reporting"]
            SIMULATOR["🎮 Simulator<br/>• Load Testing<br/>• Driver Simulation<br/>• Performance Testing"]
        end

        subgraph "Common Infrastructure"
            CONFIG["⚙️ Configuration<br/>• Environment Variables<br/>• Feature Flags<br/>• Settings Management"]
            DATABASE["🗄️ Database<br/>• Connection Management<br/>• Migrations<br/>• Health Checks"]
            COMMON["🔧 Common<br/>• Guards & Interceptors<br/>• Validation Pipes<br/>• Exception Filters"]
        end
    end

    %% Dependencies
    ORDERS -.-> CATALOG
    ORDERS -.-> PAYMENTS
    ORDERS -.-> LOGISTICS
    LOGISTICS -.-> TELEMETRY
    REALTIME -.-> ORDERS
    REALTIME -.-> LOGISTICS
    ANALYTICS -.-> ORDERS
    ANALYTICS -.-> TELEMETRY
    
    %% All modules depend on common infrastructure
    AUTH -.-> CONFIG
    AUTH -.-> DATABASE
    AUTH -.-> COMMON
    CATALOG -.-> CONFIG
    CATALOG -.-> DATABASE
    ORDERS -.-> CONFIG
    ORDERS -.-> DATABASE
```

## 🗄️ Database Architecture

### Multi-Database Strategy

```mermaid
erDiagram
    %% PostgreSQL - Transactional Data
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        enum role
        timestamp created_at
        timestamp updated_at
    }

    RESTAURANTS {
        uuid id PK
        string name
        string description
        string address
        decimal latitude
        decimal longitude
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    MENU_ITEMS {
        uuid id PK
        uuid restaurant_id FK
        string name
        string description
        decimal price
        boolean is_available
        string category
        timestamp created_at
        timestamp updated_at
    }

    ORDERS {
        uuid id PK
        uuid customer_id FK
        uuid restaurant_id FK
        enum status
        decimal total
        string delivery_address
        string special_instructions
        timestamp created_at
        timestamp updated_at
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        uuid menu_item_id FK
        string name
        decimal price
        integer quantity
        string special_instructions
    }

    PAYMENTS {
        uuid id PK
        uuid order_id FK
        decimal amount
        enum status
        string payment_method
        string transaction_id
        timestamp created_at
        timestamp updated_at
    }

    OUTBOX_EVENTS {
        uuid id PK
        string event_type
        uuid aggregate_id
        json payload
        enum status
        timestamp created_at
        timestamp processed_at
    }

    %% Relationships
    RESTAURANTS ||--o{ MENU_ITEMS : has
    USERS ||--o{ ORDERS : places
    RESTAURANTS ||--o{ ORDERS : receives
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--|| PAYMENTS : has
    MENU_ITEMS ||--o{ ORDER_ITEMS : references
```

### MongoDB Collections (Telemetry)

```mermaid
graph TB
    subgraph "MongoDB - Event Store"
        TELEMETRY[Telemetry Collection]
        DRIVER_LOCATION[Driver Location Collection]
        
        TELEMETRY --> |"event_type: string<br/>user_id: string<br/>session_id: string<br/>timestamp: Date<br/>metadata: object"| TELEMETRY_SCHEMA[Telemetry Schema]
        
        DRIVER_LOCATION --> |"driver_id: string<br/>location: GeoJSON<br/>timestamp: Date<br/>speed: number<br/>heading: number"| LOCATION_SCHEMA[Location Schema]
    end
```

### Redis Data Structures

```mermaid
graph LR
    subgraph "Redis - Caching & Pub/Sub"
        SESSIONS[Sessions<br/>Hash]
        DELIVERY_CACHE[Delivery Assignments<br/>Hash]
        LOCATION_CACHE[Driver Locations<br/>Geo]
        PUBSUB[Event Channels<br/>Pub/Sub]
        QUEUES[Job Queues<br/>Lists]
    end
```

## 🔄 Event-Driven Architecture

### Event Flow Pattern

```mermaid
sequenceDiagram
    participant OrderService
    participant Database
    participant OutboxWorker
    participant EventBus
    participant PaymentService
    participant LogisticsService
    participant RealtimeGateway

    OrderService->>Database: Create Order + Outbox Event (Transaction)
    Database-->>OrderService: Success
    OutboxWorker->>Database: Poll Outbox Events
    Database-->>OutboxWorker: Pending Events
    OutboxWorker->>EventBus: Publish Events
    EventBus->>PaymentService: order.placed
    EventBus->>LogisticsService: order.placed
    EventBus->>RealtimeGateway: order.placed
    PaymentService->>Database: Process Payment
    LogisticsService->>Database: Assign Driver
    RealtimeGateway->>Client: Real-time Update
```

### Event Types

```mermaid
graph TB
    subgraph "Order Events"
        ORDER_PLACED[order.placed]
        ORDER_CONFIRMED[order.confirmed]
        ORDER_CANCELLED[order.cancelled]
        ORDER_DELIVERED[order.delivered]
    end

    subgraph "Payment Events"
        PAYMENT_INITIATED[payment.initiated]
        PAYMENT_CONFIRMED[payment.confirmed]
        PAYMENT_FAILED[payment.failed]
    end

    subgraph "Logistics Events"
        DRIVER_ASSIGNED[driver.assigned]
        PICKUP_STARTED[pickup.started]
        DELIVERY_STARTED[delivery.started]
        LOCATION_UPDATED[location.updated]
    end

    subgraph "User Events"
        USER_REGISTERED[user.registered]
        USER_LOGIN[user.login]
        USER_LOGOUT[user.logout]
    end
```

## 🔐 Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthController
    participant AuthService
    participant JWTStrategy
    participant Database
    participant JWTGuard

    Client->>AuthController: POST /auth/login
    AuthController->>AuthService: validateUser(credentials)
    AuthService->>Database: findUser(email)
    Database-->>AuthService: User Entity
    AuthService->>AuthService: validatePassword(password)
    AuthService-->>AuthController: User Data
    AuthController->>AuthService: generateJWT(user)
    AuthService-->>AuthController: JWT Token
    AuthController-->>Client: { access_token, user }

    Note over Client: Store JWT in localStorage/cookies

    Client->>AuthController: GET /auth/profile (with JWT)
    AuthController->>JWTGuard: canActivate()
    JWTGuard->>JWTStrategy: validate(payload)
    JWTStrategy->>Database: findById(payload.sub)
    Database-->>JWTStrategy: User Entity
    JWTStrategy-->>JWTGuard: User Object
    JWTGuard-->>AuthController: Access Granted
    AuthController-->>Client: User Profile
```

### Security Layers

```mermaid
graph TB
    subgraph "Security Stack"
        CORS[CORS Policy]
        HELMET[Security Headers]
        RATE_LIMIT[Rate Limiting]
        JWT_AUTH[JWT Authentication]
        RBAC[Role-Based Access Control]
        INPUT_VALIDATION[Input Validation]
        SQL_INJECTION[SQL Injection Protection]
        XSS[XSS Protection]
    end

    REQUEST[HTTP Request] --> CORS
    CORS --> HELMET
    HELMET --> RATE_LIMIT
    RATE_LIMIT --> JWT_AUTH
    JWT_AUTH --> RBAC
    RBAC --> INPUT_VALIDATION
    INPUT_VALIDATION --> SQL_INJECTION
    SQL_INJECTION --> XSS
    XSS --> BUSINESS_LOGIC[Business Logic]
```

## 🚀 Deployment Architecture

### Container Architecture

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        subgraph "Application Tier"
            APP[Swift Eats API<br/>Node.js Container]
        end

        subgraph "Database Tier"
            POSTGRES_CONTAINER[PostgreSQL 16<br/>Container]
            MONGO_CONTAINER[MongoDB 7<br/>Container]
            REDIS_CONTAINER[Redis 7<br/>Container]
        end

        subgraph "Management Tools"
            REDIS_COMMANDER[Redis Commander<br/>Web UI]
        end
    end

    subgraph "External Network"
        LOAD_BALANCER[Load Balancer]
        CDN[Content Delivery Network]
    end

    LOAD_BALANCER --> APP
    APP --> POSTGRES_CONTAINER
    APP --> MONGO_CONTAINER
    APP --> REDIS_CONTAINER
    REDIS_COMMANDER --> REDIS_CONTAINER
```

### Production Deployment

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Load Balancer Tier"
            ALB[Application Load Balancer]
            SSL[SSL Termination]
        end

        subgraph "Application Tier"
            APP1[Swift Eats Instance 1]
            APP2[Swift Eats Instance 2]
            APP3[Swift Eats Instance N]
        end

        subgraph "Database Tier"
            POSTGRES_PRIMARY[(PostgreSQL Primary)]
            POSTGRES_REPLICA[(PostgreSQL Replica)]
            MONGO_CLUSTER[(MongoDB Cluster)]
            REDIS_CLUSTER[(Redis Cluster)]
        end

        subgraph "Monitoring & Logging"
            PROMETHEUS[Prometheus]
            GRAFANA[Grafana]
            ELK[ELK Stack]
        end
    end

    ALB --> APP1
    ALB --> APP2
    ALB --> APP3

    APP1 --> POSTGRES_PRIMARY
    APP2 --> POSTGRES_PRIMARY
    APP3 --> POSTGRES_PRIMARY

    POSTGRES_PRIMARY --> POSTGRES_REPLICA

    APP1 --> MONGO_CLUSTER
    APP2 --> MONGO_CLUSTER
    APP3 --> MONGO_CLUSTER

    APP1 --> REDIS_CLUSTER
    APP2 --> REDIS_CLUSTER
    APP3 --> REDIS_CLUSTER
```

## 📊 Performance & Scalability

### Caching Strategy

```mermaid
graph LR
    subgraph "Caching Layers"
        L1[Application Cache<br/>In-Memory]
        L2[Redis Cache<br/>Distributed]
        L3[Database<br/>Persistent]
    end

    REQUEST[Client Request] --> L1
    L1 -->|Cache Miss| L2
    L2 -->|Cache Miss| L3
    L3 -->|Data| L2
    L2 -->|Cached Data| L1
    L1 -->|Response| CLIENT[Client Response]
```

### Horizontal Scaling Points

- **Application Instances**: Stateless design allows horizontal scaling
- **Database Read Replicas**: Read operations can be distributed
- **Redis Cluster**: Cache and session data distributed
- **MongoDB Sharding**: Telemetry data can be sharded by time/user
- **WebSocket Connections**: Can be load balanced with sticky sessions

## 🔍 Monitoring & Observability

### Observability Stack

```mermaid
graph TB
    subgraph "Application"
        LOGS[Structured Logging<br/>Pino]
        METRICS[Custom Metrics<br/>Business KPIs]
        TRACES[Request Tracing<br/>Correlation IDs]
        HEALTH[Health Checks<br/>Endpoints]
    end

    subgraph "Collection"
        LOG_COLLECTOR[Log Collector]
        METRICS_COLLECTOR[Metrics Collector]
        TRACE_COLLECTOR[Trace Collector]
    end

    subgraph "Storage & Analysis"
        ELASTICSEARCH[Elasticsearch<br/>Log Storage]
        PROMETHEUS[Prometheus<br/>Metrics Storage]
        GRAFANA[Grafana<br/>Visualization]
        KIBANA[Kibana<br/>Log Analysis]
    end

    LOGS --> LOG_COLLECTOR
    METRICS --> METRICS_COLLECTOR
    TRACES --> TRACE_COLLECTOR

    LOG_COLLECTOR --> ELASTICSEARCH
    METRICS_COLLECTOR --> PROMETHEUS
    TRACE_COLLECTOR --> PROMETHEUS

    ELASTICSEARCH --> KIBANA
    PROMETHEUS --> GRAFANA
```

## 🎯 Design Patterns Summary

### Implemented Patterns

1. **Module Pattern**: Domain-driven module organization
2. **Repository Pattern**: Data access abstraction
3. **Factory Pattern**: Entity and DTO creation
4. **Observer Pattern**: Event-driven communication
5. **Strategy Pattern**: Multiple authentication strategies
6. **Decorator Pattern**: Guards, interceptors, and pipes
7. **Command Pattern**: CQRS implementation
8. **Outbox Pattern**: Reliable event publishing
9. **Saga Pattern**: Distributed transaction management
10. **Circuit Breaker**: External service resilience

### Architectural Benefits

- **Maintainability**: Clear separation of concerns
- **Testability**: Dependency injection and mocking
- **Scalability**: Horizontal scaling capabilities
- **Reliability**: Event-driven resilience
- **Performance**: Multi-layer caching strategy
- **Security**: Defense in depth approach
- **Observability**: Comprehensive monitoring

This architecture provides a solid foundation for a production-ready food delivery platform with room for future growth and feature expansion.
