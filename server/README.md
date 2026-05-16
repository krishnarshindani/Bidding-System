# Bid Brilliance Backend Server

Express.js + Socket.IO + MySQL backend for real-time auction bidding platform.

## Features

- **Real-time Communication**: Socket.IO for instant updates
- **Live Bidding**: Real-time bid updates and notifications
- **User Management**: Authentication and user profiles
- **Auction Management**: Create, update, and manage auctions
- **Messaging System**: User-to-user messaging
- **Notifications**: Real-time notifications for bidding activity
- **Watchlist**: Track favorite auctions
- **Database**: Fully normalized MySQL schema

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Start Server
```bash
npm run dev
```

Server will start on `http://localhost:3000`

## Project Structure

```
server/
├── config/
│   └── database.js       # MySQL connection pool
├── services/
│   └── queries.js        # Database query functions
├── middleware/           # Express middleware (optional)
├── routes/              # API routes (optional)
├── server.js            # Main server file
├── package.json         # Dependencies
├── .env                 # Environment variables
└── .gitignore           # Git ignore rules
```

## Database Setup

### Import Schema
```bash
mysql -u root -p bid_brilliance < ../database/bid_brilliance.sql
```

### Verify
```bash
mysql -u root -p
> USE bid_brilliance;
> SHOW TABLES;
```

## Available Socket.IO Events

### Auction Events
```typescript
// Client -> Server
socket.emit('auction:create', auctionData)
socket.emit('auction:get', auctionId)
socket.emit('auctions:getActive', { limit, offset })
socket.emit('auctions:getByCategory', { categoryId, limit, offset })

// Server -> Client
socket.on('auction:created', (data) => {})
socket.on('auction:data', (auction, bids) => {})
socket.on('auctions:active', (auctions) => {})
socket.on('auctions:byCategory', (auctions) => {})
```

### Bid Events
```typescript
socket.emit('bid:place', { auctionId, bidderId, bidAmount })
socket.on('bid:placed', (bidData) => {})
socket.on('bid:error', (error) => {})
```

### Watchlist Events
```typescript
socket.emit('watchlist:add', { userId, auctionId })
socket.emit('watchlist:remove', { userId, auctionId })
socket.emit('watchlist:get', { userId })
socket.on('watchlist:data', (items) => {})
```

### Message Events
```typescript
socket.emit('message:send', { senderId, receiverId, messageText })
socket.emit('conversation:get', { userId, otherId })
socket.on('message:receive', (message) => {})
socket.on('conversation:data', (messages) => {})
```

### Notification Events
```typescript
socket.emit('notifications:get', { userId, unreadOnly })
socket.emit('notification:read', { notificationId })
socket.on('notifications:data', (notifications) => {})
socket.on('notification:new', (notification) => {})
```

## API Routes

### Health Check
```
GET /api/health
```

### Auctions
```
GET /api/auctions?limit=20&offset=0
GET /api/auctions/:id
```

### Categories
```
GET /api/categories
```

## Key Functions

### User Management
- `getUserById(userId)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `createUser(userData)` - Create new user
- `updateUser(userId, updates)` - Update user profile

### Auction Management
- `getAuctionById(auctionId)` - Get auction details
- `getActiveAuctions(limit, offset)` - Get active auctions
- `getAuctionsByCategory(categoryId, limit, offset)` - Get by category
- `createAuction(auctionData)` - Create new auction
- `updateAuctionStatus(auctionId, status)` - Update status

### Bidding
- `createBid(bidData)` - Place a bid
- `getAuctionBids(auctionId)` - Get auction bids
- `getHighestBid(auctionId)` - Get highest bid
- `updateAuctionCurrentBid(auctionId, amount, bidderId)` - Update current bid

### Messaging
- `createMessage(messageData)` - Send message
- `getConversation(userId, otherId, limit)` - Get conversation

### Notifications
- `createNotification(notificationData)` - Create notification
- `getUserNotifications(userId, unreadOnly)` - Get notifications
- `markNotificationAsRead(notificationId)` - Mark as read

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=bid_brilliance

# Server
PORT=3000
NODE_ENV=development

# Client
CLIENT_URL=http://localhost:5173

# JWT
JWT_SECRET=secret_key_here
JWT_EXPIRE=7d

# API
API_PREFIX=/api
LOG_LEVEL=debug
```

## Connection Pool

MySQL connection pool configured with:
- `connectionLimit`: 10 concurrent connections
- `waitForConnections`: true
- `enableKeepAlive`: true
- `queueLimit`: 0 (unlimited queue)

## Error Handling

All Socket.IO errors are emitted to client:
```typescript
socket.emit('error', { message: 'Error description', error: errorDetails })
```

## Performance Optimization

1. **Indexes**: All tables have optimized indexes
2. **Connection Pooling**: Reuses database connections
3. **Query Optimization**: Efficient SELECT with JOINs
4. **Event Broadcasting**: Only relevant users receive updates

## Security Considerations (TODO)

- [ ] Implement JWT authentication
- [ ] Add request validation
- [ ] Enable rate limiting
- [ ] Add HTTPS/SSL
- [ ] Implement CORS properly
- [ ] Add input sanitization
- [ ] Add SQL injection protection
- [ ] Implement audit logging

## Development

### Run with Auto-Restart
```bash
npm run dev
```

### Production Build
```bash
npm start
```

## Dependencies

- `express`: Web framework
- `socket.io`: Real-time communication
- `mysql2`: MySQL driver
- `dotenv`: Environment configuration
- `cors`: CORS middleware
- `helmet`: Security headers
- `jsonwebtoken`: JWT support
- `bcryptjs`: Password hashing
- `express-validator`: Input validation

## Scripts

```bash
npm start        # Start server
npm run dev      # Start with auto-restart
npm test         # Run tests
```

## Support

For detailed setup instructions, see [MYSQL_SETUP.md](../MYSQL_SETUP.md)

