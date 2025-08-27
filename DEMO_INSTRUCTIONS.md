# Swift Eats Real Backend Demo Instructions

## 🚀 Quick Start

### 1. Start All Services
```bash
cd /home/abhinavkumar/Documents/BackendApp/swift-eats
docker compose up -d
npm run start:dev:mock
```

### 2. Open Demo Page
Open `demo-real-backend.html` in your browser

### 3. Follow Demo Steps

## 📋 Demo Flow

### Step 1: Test Backend Connection
1. Click **"Test API Connection"**
   - **Console Log**: `✅ API connection successful!`
   - **Backend**: Hits `/api/v1/catalog/restaurants`
   - **Database**: PostgreSQL query for restaurants

### Step 2: Load Real Data
1. Click **"Load Real Restaurants"**
   - **Console Log**: `✅ Loaded X restaurants from database`
   - **Backend**: Fetches from PostgreSQL restaurants table
   - **Fallback**: Shows mock data if database empty

### Step 3: Authentication
1. Click **"Test Authentication"**
   - **Console Log**: `✅ Authentication successful!`
   - **Backend**: POST to `/api/v1/auth/register` and `/api/v1/auth/login`
   - **Database**: Creates user in PostgreSQL, stores JWT in Redis
   - **Result**: Gets JWT token for authenticated requests

### Step 4: Place Real Order
1. Select a restaurant
2. Add items to cart
3. Click **"Place Real Order"**
   - **Console Log**: `✅ Order placed successfully! Order ID: xxx`
   - **Backend**: POST to `/api/v1/orders`
   - **PostgreSQL**: Inserts order, order_items, outbox_events
   - **Redis**: Publishes order event to streams

### Step 5: Process Payment
1. Click **"Process Payment"**
   - **Console Log**: `✅ Payment processed successfully!`
   - **Backend**: POST to `/api/v1/payments`
   - **PostgreSQL**: Creates payment record
   - **Redis**: Updates order status stream

### Step 6: Real-time Updates
1. Click **"Connect WebSocket"**
   - **Console Log**: `✅ WebSocket connected!`
   - **Backend**: Establishes WebSocket connection
   - **Redis**: Subscribes to order-specific channels

### Step 7: Driver Assignment
1. Click **"Assign Driver"**
   - **Console Log**: `✅ Driver assigned: xxx`
   - **Backend**: POST to `/api/v1/logistics/assign/{orderId}`
   - **PostgreSQL**: Creates delivery record
   - **Redis**: Publishes driver assignment event

### Step 8: Live Tracking
1. Click **"Start Driver Simulator"**
   - **Console Log**: `📍 Driver location: lat, lng`
   - **Backend**: Runs driver simulator
   - **MongoDB**: Stores GPS coordinates in telemetry collection
   - **Redis**: Streams location updates
   - **WebSocket**: Broadcasts to connected clients

## 🔍 What You'll See in Console Logs

### Frontend Console (Browser)
```
[11:27:50] ✅ API connection successful!
[11:27:51] ✅ Loaded 3 restaurants from database
[11:27:52] ✅ Authentication successful!
[11:27:52] Logged in as: demo@swifteats.com
[11:27:53] Selected restaurant: Pizza Palace
[11:27:54] Added Margherita Pizza to order
[11:27:55] ✅ Order placed successfully! Order ID: order_1234567890
[11:27:56] ✅ Payment processed successfully! Payment ID: pay_1234567890
[11:27:57] ✅ Driver assigned: driver_789
[11:27:58] ✅ WebSocket connected!
[11:27:59] 📡 Real-time update: Order status changed to OUT_FOR_DELIVERY
[11:28:00] 📍 Driver location: 40.7128, -74.0060
```

### Backend Console (Terminal)
```
[Nest] 171590 - LOG [CatalogController] GET /api/v1/catalog/restaurants
[Nest] 171590 - LOG [AuthController] POST /api/v1/auth/register
[Nest] 171590 - LOG [AuthController] POST /api/v1/auth/login
[Nest] 171590 - LOG [OrdersController] POST /api/v1/orders
[Nest] 171590 - LOG [PaymentsController] POST /api/v1/payments
[Nest] 171590 - LOG [LogisticsController] POST /api/v1/logistics/assign/order_1234567890
[Nest] 171590 - LOG [RealtimeGateway] Client connected: socket_abc123
[Nest] 171590 - LOG [RealtimeGateway] Client joined room: order-order_1234567890
```

## 🗄️ Database Operations You'll See

### PostgreSQL Operations
- **Users Table**: Registration, login
- **Restaurants Table**: Fetching restaurant data
- **Orders Table**: Order creation, status updates
- **Payments Table**: Payment processing
- **Deliveries Table**: Driver assignments

### MongoDB Operations
- **Telemetry Collection**: Driver GPS coordinates
- **Events Collection**: Order lifecycle events
- **Driver Locations**: Real-time location updates

### Redis Operations
- **Sessions**: JWT token storage
- **Pub/Sub**: Order status broadcasts
- **Streams**: Real-time event streaming
- **Cache**: Restaurant and menu data

## 🔄 Real-time Features

### WebSocket Events
- `order-status-changed`: Order lifecycle updates
- `delivery-location`: Driver GPS coordinates
- `user-notification`: Customer notifications
- `restaurant-notification`: Restaurant alerts

### Redis Streams
- `order-events`: Order lifecycle stream
- `delivery-updates`: Driver location stream
- `payment-events`: Payment processing stream

## 🎯 Expected Results

1. **Connection Status**: Green "Backend Connected" indicator
2. **Real Data**: Actual restaurants from database (or mock fallback)
3. **Authentication**: JWT token and user session
4. **Order Flow**: Complete order lifecycle with database persistence
5. **Real-time**: Live WebSocket updates and driver tracking
6. **Console Logs**: Detailed logging of all operations

## 🚨 Troubleshooting

If you see "Backend Disconnected":
1. Check if services are running: `docker compose ps`
2. Check API server: `curl http://localhost:3002/api/v1/catalog/restaurants`
3. Check logs: `docker compose logs swift-eats-api`

If WebSocket fails:
1. Backend might not be running on port 3002
2. Check WebSocket endpoint in browser dev tools
3. Ensure Redis is running for pub/sub

## 🎉 Success Indicators

- ✅ Green connection status
- ✅ Real restaurant data loaded
- ✅ JWT authentication working
- ✅ Orders created in database
- ✅ WebSocket real-time updates
- ✅ Driver location simulation
- ✅ Complete order lifecycle tracking
