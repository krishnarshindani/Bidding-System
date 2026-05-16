# Bid Brilliance

Bid Brilliance is a real-time online auction platform where users can create auctions, place bids, and receive instant updates whenever a new bid is made. The project is designed to provide a smooth and interactive bidding experience similar to modern e-commerce auction websites.

The application is built using React and TypeScript for the frontend, Node.js and Express for the backend, MySQL for database management, and Socket.IO for real-time communication.

---

## Features

- User registration and login
- Create and manage auctions
- Browse auctions by category
- Place bids in real time
- Instant notifications when outbid
- Watchlist to save favorite auctions
- Direct messaging between users
- User reviews and ratings
- Responsive design for mobile and desktop

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Node.js
- Express.js
- Socket.IO

### Database
- MySQL

### Additional Tools
- JWT Authentication
- bcryptjs
- Framer Motion

---

## Project Structure

```text
bid-brilliance/
├── database/        # MySQL schema and tables
├── server/          # Backend code
├── src/             # Frontend source code
├── public/          # Static assets
└── README.md
```

---

## How It Works

1. Sellers create auctions by adding product details and a starting price.
2. Buyers browse active auctions and place bids.
3. Whenever a new bid is placed, all connected users see the update instantly using Socket.IO.
4. Users receive notifications if they are outbid.
5. Once the auction ends, the highest bidder wins.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/bid-brilliance.git
cd bid-brilliance
```

### 2. Set Up the Database

```bash
mysql -u root -p < database/bid_brilliance.sql
```

### 3. Start the Backend

```bash
cd server
npm install
npm run dev
```

### 4. Start the Frontend

```bash
cd ..
npm install --legacy-peer-deps
npm run dev
```

### 5. Open the Application

Visit:

```text
http://localhost:5173
```

---

## Environment Variables

### Backend (`server/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bid_brilliance
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_secret_key
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## Real-Time Functionality

The most important part of this project is the live bidding system. Socket.IO is used to establish a persistent connection between the client and server so that:

- New bids appear instantly
- Auction status updates in real time
- Notifications are delivered immediately
- Messages are exchanged without refreshing the page

---

## Database Overview

The database contains multiple tables to manage:

- Users
- Auctions
- Bids
- Categories
- Watchlists
- Messages
- Notifications
- Payments
- Reviews

---

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Input validation
- SQL injection prevention
- Secure environment variables

---

## Future Improvements

- Payment gateway integration
- Email notifications
- Advanced analytics dashboard
- Admin moderation tools
- Deployment to cloud platforms

---

## Learning Outcomes

Through this project, I gained practical experience with:

- Full-stack web development
- Real-time communication using Socket.IO
- Database design and normalization
- REST API development
- Authentication and security
- Responsive UI design

---

## Conclusion

Bid Brilliance demonstrates how a complete real-time auction platform can be built using modern web technologies. It combines a responsive frontend, secure backend, and efficient database design to deliver a scalable and interactive bidding experience.

---

## Author

Krish Narshindani  
B.Tech Computer Science Engineering  
Nirma University
