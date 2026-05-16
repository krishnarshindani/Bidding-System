# Design Document: Auction Completion and Winner Management System

## Overview

This design document specifies the technical implementation for a comprehensive auction completion and winner management system for the Bid Brilliance platform. The system handles two primary auction completion paths: automatic time-based expiration via a background sweeper process, and manual closure by administrators. It ensures proper winner assignment, credit transaction integrity, consistent currency display (CR not $), real-time notifications, and comprehensive dashboard reporting.

The design leverages the existing architecture:
- **Backend**: Node.js + Express + Socket.IO for real-time communication
- **Frontend**: React + TypeScript + Vite
- **Database**: MySQL with existing tables (auctions, bids, users, notifications, user_credits_history)
- **Real-time**: Socket.IO for bidirectional event-driven communication

Key design principles:
1. **Idempotency**: Auction completion operations can be safely retried
2. **Consistency**: Database transactions ensure data integrity
3. **Real-time**: All stakeholders receive immediate updates
4. **No Double Charging**: Credits deducted once when bid placed, not again on win
5. **Currency Clarity**: All displays show "CR" consistently

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Admin Dashboard  │         │ Bidder Dashboard │         │
│  │  - Auction List  │         │  - My Bids       │         │
│  │  - Winner Column │         │  - Won/Lost      │         │
│  │  - Close Button  │         │  - Notifications │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
└───────────┼─────────────────────────────┼────────────────────┘
            │                             │
            │    Socket.IO + REST API     │
            │                             │
┌───────────┼─────────────────────────────┼────────────────────┐
│           ▼                             ▼                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Backend (Node.js + Express)              │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Sweeper    │  │ Socket.IO    │  │ REST API   │ │   │
│  │  │  (setInterval)│  │  Handlers    │  │  Routes    │ │   │
│  │  │              │  │              │  │            │ │   │
│  │  │ - Check      │  │ - auction:end│  │ - POST     │ │   │
│  │  │   expired    │  │ - new-bid    │  │   /close   │ │   │
│  │  │ - Close      │  │ - notify     │  │ - GET      │ │   │
│  │  │   auctions   │  │              │  │   /winners │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │   │
│  │         │                  │                │        │   │
│  │         └──────────────────┼────────────────┘        │   │
│  │                            ▼                         │   │
│  │                  ┌──────────────────┐                │   │
│  │                  │ Auction Service  │                │   │
│  │                  │  - closeAuction  │                │   │
│  │                  │  - assignWinner  │                │   │
│  │                  │  - notify        │                │   │
│  │                  └────────┬─────────┘                │   │
│  └───────────────────────────┼──────────────────────────┘   │
│                              ▼                              │
│                    ┌──────────────────┐                     │
│                    │  Query Service   │                     │
│                    │  (queries.js)    │                     │
│                    └────────┬─────────┘                     │
└─────────────────────────────┼───────────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │   MySQL Database │
                    │  - auctions      │
                    │  - bids          │
                    │  - users         │
                    │  - notifications │
                    └──────────────────┘
```

### Data Flow

#### Automatic Auction Completion (Sweeper)
```
1. Sweeper runs every 10 seconds
2. Query active auctions where auction_end_time <= NOW()
3. For each expired auction:
   a. Get highest bid
   b. If bid exists:
      - Mark bid as 'won'
      - Update auction status to 'ended'
      - Create winner notification
      - Create seller notification
      - Emit Socket.IO events
   c. If no bids:
      - Update auction status to 'ended'
      - Emit Socket.IO event (no winner)
4. Continue to next auction
```

#### Manual Auction Completion (Admin)
```
1. Admin clicks "Close" button in dashboard
2. Frontend sends POST /api/auctions/:id/close
3. Backend verifies admin privileges
4. Backend calls closeAuctionAndDeclareWinner()
5. Same winner assignment logic as sweeper
6. Return winner details to frontend
7. Frontend updates UI with winner info
```

## Components and Interfaces

### Backend Components

#### 1. Sweeper Process (server/server.js)

**Location**: `server/server.js` (existing setInterval)

**Responsibilities**:
- Run every 10 seconds
- Query expired active auctions
- Delegate to auction completion service
- Handle errors gracefully (log and continue)

**Interface**:
```javascript
// Existing implementation - needs enhancement
setInterval(async () => {
  try {
    const activeAuctions = await queries.getActiveAuctions(100, 0);
    for (const auction of activeAuctions) {
      const endTime = new Date(auction.auction_end_time).getTime();
      const now = Date.now();
      if (endTime <= now) {
        await completeAuction(auction.id, 'sweeper');
      }
    }
  } catch (error) {
    console.error('[SWEEPER] Error:', error.message);
  }
}, 10000);
```

#### 2. Auction Completion Service

**Location**: New module `server/services/auctionCompletion.js`

**Responsibilities**:
- Centralize auction completion logic
- Handle both sweeper and manual closure
- Ensure idempotency
- Manage database transactions
- Emit Socket.IO events
- Create notifications

**Interface**:
```javascript
/**
 * Complete an auction and assign winner
 * @param {number} auctionId - The auction to complete
 * @param {string} source - 'sweeper' or 'admin'
 * @param {object} io - Socket.IO instance
 * @returns {Promise<object>} Winner details or null
 */
async function completeAuction(auctionId, source, io) {
  // 1. Get auction details
  // 2. Check if already ended (idempotency)
  // 3. Get highest bid
  // 4. Begin transaction
  // 5. Update auction status
  // 6. Update bid status
  // 7. Create notifications
  // 8. Commit transaction
  // 9. Emit Socket.IO events
  // 10. Return winner details
}
```

#### 3. Query Service Enhancements (server/services/queries.js)

**Existing Functions to Use**:
- `getActiveAuctions(limit, offset)` - Get active auctions
- `getAuctionById(auctionId)` - Get auction details
- `getHighestBid(auctionId)` - Get highest bid
- `getUserById(userId)` - Get user details
- `updateAuctionStatus(auctionId, status)` - Update auction status
- `createNotification(data)` - Create notification
- `closeAuctionAndDeclareWinner(auctionId)` - Existing winner assignment

**New Functions Needed**:
```javascript
// Mark bid as won
async function markBidAsWon(bidId) {
  await pool.query(
    'UPDATE bids SET bid_status = ? WHERE id = ?',
    ['won', bidId]
  );
}

// Get auction winner details (enhanced)
async function getAuctionWinnerDetails(auctionId) {
  const [rows] = await pool.query(
    `SELECT b.*, u.username, u.email, u.phone, a.title as auction_title
     FROM bids b
     JOIN users u ON b.bidder_id = u.id
     JOIN auctions a ON b.auction_id = a.id
     WHERE b.auction_id = ? AND b.bid_status = 'won'
     LIMIT 1`,
    [auctionId]
  );
  return rows[0];
}
```

#### 4. REST API Routes (server/routes/auctions.js)

**Existing Route to Enhance**:
```javascript
// POST /api/auctions/:auctionId/close
// - Verify admin privileges
// - Call completeAuction service
// - Return winner details
```

**New Routes Needed**:
```javascript
// GET /api/auctions/:auctionId/winner
// - Return winner details for ended auction
// - Public endpoint (no auth required)

// GET /api/auctions/user/won
// - Return auctions won by authenticated user
// - Requires authentication

// GET /api/auctions/user/lost
// - Return auctions user bid on but lost
// - Requires authentication
```

#### 5. Socket.IO Event Handlers (server/server.js)

**Existing Events to Enhance**:
```javascript
// socket.on('auction:end') - Manual closure
// - Verify user is admin or seller
// - Call completeAuction service
// - Emit results
```

**Events to Emit**:
```javascript
// auction:ended - To auction room
{
  auctionId: number,
  status: 'ended',
  winner: { id, username, email } | null,
  finalPrice: number,
  message: string
}

// notification:new - To winner user channel
{
  type: 'auction_won',
  auctionId: number,
  finalPrice: number,
  auctionTitle: string
}

// notification:new - To seller user channel
{
  type: 'auction_ended',
  auctionId: number,
  winnerName: string,
  finalPrice: number
}
```

### Frontend Components

#### 1. Admin Dashboard (src/pages/AdminDashboard.tsx)

**Enhancements Needed**:
- Add "Winner" column to auctions table
- Display winner username for ended auctions
- Display "No bids" for ended auctions with no winner
- Display "-" for active auctions
- Ensure all currency displays show "CR" suffix
- Handle real-time auction:ended events

**Component Structure**:
```typescript
interface Auction {
  id: number;
  title: string;
  status: string;
  current_bid_price: number;
  total_bids: number;
  current_highest_bidder_id: number | null;
  winner_username?: string; // New field
}

// In render:
<td className="p-4">
  {auction.status === "ended" ? (
    auction.winner_username ? (
      <span className="text-sm font-medium text-primary">
        {auction.winner_username}
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">No bids</span>
    )
  ) : (
    <span className="text-sm text-muted-foreground">-</span>
  )}
</td>
```

#### 2. Bidder Dashboard (src/pages/BidderDashboard.tsx)

**Enhancements Needed**:
- Fetch and display won auctions
- Fetch and display lost auctions
- Ensure all currency displays show "CR" suffix
- Handle real-time notification:new events
- Update bid history when auctions end

**New API Calls**:
```typescript
// Fetch won auctions
const wonAuctions = await API_SERVICE.auctions.getUserWonAuctions(token);

// Fetch lost auctions
const lostAuctions = await API_SERVICE.auctions.getUserLostAuctions(token);
```

#### 3. API Service (src/services/api.ts)

**New Methods Needed**:
```typescript
export const API_SERVICE = {
  auctions: {
    // ... existing methods
    
    getWinner: async (auctionId: number) => {
      const response = await fetch(`${API_BASE}/auctions/${auctionId}/winner`);
      return response.json();
    },
    
    getUserWonAuctions: async (token: string) => {
      const response = await fetch(`${API_BASE}/auctions/user/won`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    },
    
    getUserLostAuctions: async (token: string) => {
      const response = await fetch(`${API_BASE}/auctions/user/lost`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.json();
    }
  }
};
```

#### 4. Currency Display Utility

**Location**: New file `src/utils/currency.ts`

**Purpose**: Centralize currency formatting to ensure consistency

**Interface**:
```typescript
/**
 * Format a number as CR (Credits)
 * @param amount - The numeric amount
 * @returns Formatted string with CR suffix
 */
export function formatCR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0 CR';
  return `${amount.toFixed(2)} CR`;
}

/**
 * Format CR for display (no decimals if whole number)
 * @param amount - The numeric amount
 * @returns Formatted string with CR suffix
 */
export function formatCRDisplay(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0 CR';
  const num = Number(amount);
  return num % 1 === 0 ? `${num} CR` : `${num.toFixed(2)} CR`;
}
```

## Data Models

### Database Schema (Existing)

#### auctions table
```sql
CREATE TABLE auctions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  starting_price DECIMAL(10, 2) NOT NULL,
  current_bid_price DECIMAL(10, 2) DEFAULT NULL,
  reserve_price DECIMAL(10, 2),
  status ENUM('draft', 'scheduled', 'active', 'ended', 'cancelled') DEFAULT 'active',
  auction_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auction_end_time TIMESTAMP NOT NULL,
  current_highest_bidder_id INT,
  total_bids INT DEFAULT 0,
  -- ... other fields
  FOREIGN KEY (current_highest_bidder_id) REFERENCES users(id)
);
```

**Key Fields for Winner Management**:
- `status`: Must be 'ended' when auction completes
- `current_highest_bidder_id`: References the winner
- `current_bid_price`: The winning bid amount

#### bids table
```sql
CREATE TABLE bids (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auction_id INT NOT NULL,
  bidder_id INT NOT NULL,
  bid_amount DECIMAL(10, 2) NOT NULL,
  bid_status ENUM('active', 'outbid', 'won', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (auction_id) REFERENCES auctions(id),
  FOREIGN KEY (bidder_id) REFERENCES users(id)
);
```

**Key Fields for Winner Management**:
- `bid_status`: Must be 'won' for winning bid, 'outbid' for others
- `bid_amount`: Used to determine highest bid

#### notifications table
```sql
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('bid_outbid', 'auction_ended', 'auction_won', 'payment_received', 'system') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_auction_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_auction_id) REFERENCES auctions(id)
);
```

**Notification Types for Auction Completion**:
- `auction_won`: Sent to winner
- `auction_ended`: Sent to seller

#### user_credits_history table
```sql
CREATE TABLE user_credits_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  transaction_type ENUM('initial_assignment', 'bid_placement', 'bid_return', 'auction_win', 'admin_adjustment') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  related_auction_id INT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_auction_id) REFERENCES auctions(id)
);
```

**Transaction Types**:
- `bid_placement`: Credits deducted when bid placed (already implemented)
- `bid_return`: Credits returned when outbid (already implemented)
- `auction_win`: NOT USED (credits already deducted on bid placement)

### Data Integrity Rules

1. **Winner Assignment**:
   - `auctions.current_highest_bidder_id` MUST match the bidder_id of the bid with `bid_status = 'won'`
   - Only ONE bid per auction can have `bid_status = 'won'`
   - All other bids for that auction MUST have `bid_status = 'outbid'`

2. **Credit Consistency**:
   - Winner's credits were already deducted when they placed the winning bid
   - NO additional deduction occurs on auction completion
   - `user_credits_history` records show `bid_placement` transaction for winning bid

3. **Status Transitions**:
   - Auction status can only transition: `active` → `ended`
   - Once `ended`, status cannot change back to `active`
   - Bid status transitions: `active` → `won` (for winner) or `active` → `outbid` (for losers)

## Error Handling

### Error Scenarios and Responses

1. **Auction Not Found**:
   - HTTP 404: "Auction not found"
   - Log warning, continue processing other auctions

2. **Auction Already Ended**:
   - HTTP 400: "Auction is already closed"
   - Skip processing (idempotent)

3. **No Bids on Auction**:
   - Mark auction as ended with no winner
   - Create notification for seller: "Auction ended with no bids"
   - Emit Socket.IO event with `winner: null`

4. **Database Transaction Failure**:
   - Rollback all changes
   - Log error with auction ID
   - HTTP 500: "Failed to complete auction"
   - Retry on next sweeper run

5. **Socket.IO Emission Failure**:
   - Log warning
   - Continue with auction completion (database is source of truth)
   - Users will see updates on next page refresh

6. **Notification Creation Failure**:
   - Log warning
   - Continue with auction completion
   - Notification can be created manually if needed

7. **Multiple Bids with Same Amount**:
   - Select bid with earliest `created_at` timestamp
   - Log info: "Tie-breaker applied for auction {id}"

8. **User Account Deleted**:
   - Check if user exists before creating notification
   - Skip notification if user not found
   - Still complete auction and mark bid as won

### Error Logging Format

```javascript
console.error('[AUCTION_COMPLETION]', {
  timestamp: new Date().toISOString(),
  auctionId: auction.id,
  source: 'sweeper' | 'admin',
  error: error.message,
  stack: error.stack
});
```

## Testing Strategy

### Unit Tests

**Backend Unit Tests** (`server/services/auctionCompletion.test.js`):
1. Test `completeAuction()` with auction that has bids
2. Test `completeAuction()` with auction that has no bids
3. Test `completeAuction()` with already ended auction (idempotency)
4. Test `completeAuction()` with multiple bids (highest wins)
5. Test `completeAuction()` with tied bids (earliest wins)
6. Test `completeAuction()` with database error (rollback)
7. Test `completeAuction()` with missing user (graceful handling)

**Query Service Tests** (`server/services/queries.test.js`):
1. Test `markBidAsWon()` updates correct bid
2. Test `getAuctionWinnerDetails()` returns complete winner info
3. Test `getUserWonAuctions()` returns only won auctions
4. Test `getUserLostAuctions()` returns only lost auctions

**Frontend Unit Tests** (`src/utils/currency.test.ts`):
1. Test `formatCR()` with whole numbers
2. Test `formatCR()` with decimals
3. Test `formatCR()` with null/undefined
4. Test `formatCRDisplay()` removes unnecessary decimals

### Integration Tests

**End-to-End Auction Completion**:
1. Create auction with end time in past
2. Place bid on auction
3. Wait for sweeper to run
4. Verify auction status is 'ended'
5. Verify bid status is 'won'
6. Verify winner notification created
7. Verify seller notification created
8. Verify Socket.IO events emitted

**Manual Auction Closure**:
1. Admin logs in
2. Creates active auction
3. Bidder places bid
4. Admin clicks "Close" button
5. Verify auction closes immediately
6. Verify winner assigned correctly
7. Verify UI updates in real-time

**Currency Display**:
1. Navigate to Admin Dashboard
2. Verify all bid amounts show "CR" suffix
3. Navigate to Bidder Dashboard
4. Verify all credit balances show "CR" suffix
5. Verify notifications use "CR" not "$"

### Property-Based Tests

Property tests will be defined after completing the prework analysis in the next section.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection Analysis

After analyzing all acceptance criteria, several redundancies were identified:
- Requirements 2.2, 2.3, 2.4 duplicate the logic of 1.2, 1.3, 1.4 (manual vs automatic closure use same logic)
- Requirements 5.2-5.5, 5.7 all test the same currency formatting function
- Requirements 3.3 and 12.2 both test winner notification creation
- Requirements 3.5 and 12.1 both test seller notification creation
- Requirements 4.3, 4.4, 4.5 test existing bid placement logic, not auction completion
- Requirements 9.3 and 9.4 both test transaction atomicity

The following properties eliminate these redundancies while maintaining comprehensive coverage.

### Core Auction Completion Properties

**Property 1: Expired Auction Identification**
*For any* set of auctions, when the sweeper runs, all and only those auctions with status 'active' and auction_end_time <= current_time should be identified for processing.
**Validates: Requirements 1.1, 10.4**

**Property 2: Auction Status Transition**
*For any* auction that is closed (either by sweeper or admin), the auction status should transition from 'active' to 'ended'.
**Validates: Requirements 1.2, 2.2**

**Property 3: Winner Assignment from Highest Bid**
*For any* auction with at least one bid, when the auction ends, the bidder with the highest bid_amount should be assigned as the winner (current_highest_bidder_id).
**Validates: Requirements 1.3, 2.3, 3.1**

**Property 4: Winning Bid Status Update**
*For any* auction with a winner, exactly one bid should have bid_status = 'won' and all other bids should have bid_status = 'outbid'.
**Validates: Requirements 3.2, 9.2**

**Property 5: Tie-Breaking by Timestamp**
*For any* auction where multiple bids have the same highest bid_amount, the bid with the earliest created_at timestamp should be selected as the winner.
**Validates: Requirements 10.1 (edge case)**

### Notification Properties

**Property 6: Winner Notification Creation**
*For any* auction that ends with a winner, a notification record with type 'auction_won' should be created for the winner's user_id.
**Validates: Requirements 3.3, 12.2**

**Property 7: Seller Notification Creation**
*For any* auction that ends with a winner, a notification record with type 'auction_ended' should be created for the seller's user_id containing winner details.
**Validates: Requirements 3.5, 12.1**

**Property 8: Notification Message Currency Format**
*For any* notification message containing currency amounts, the message should use "CR" and should not contain "$" or "dollars".
**Validates: Requirements 5.6**

### Credit Management Properties

**Property 9: No Double Credit Deduction**
*For any* winning bid, the user's credit balance should not change during auction completion (credits were already deducted when bid was placed).
**Validates: Requirements 4.1**

**Property 10: No Credit Transactions for No-Bid Auctions**
*For any* auction that ends with zero bids, no new credit transaction records should be created during auction completion.
**Validates: Requirements 4.2**

### Currency Display Properties

**Property 11: Currency Formatting Consistency**
*For any* numeric currency amount displayed in the UI, the formatted string should end with " CR".
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7**

### Authorization Properties

**Property 12: Admin Authorization for Manual Closure**
*For any* user without admin privileges (user_type != 'admin'), attempting to manually close an auction should be rejected with an authorization error.
**Validates: Requirements 2.1**

**Property 13: Idempotent Auction Closure**
*For any* auction with status 'ended', attempting to close it again should be rejected without modifying the database.
**Validates: Requirements 2.5**

### Database Consistency Properties

**Property 14: Winner ID Population**
*For any* auction with status 'ended' and at least one bid, the current_highest_bidder_id field should not be null.
**Validates: Requirements 9.1**

**Property 15: Transaction Atomicity**
*For any* auction completion operation, if any database update fails, all changes should be rolled back (auction status, bid status, notifications).
**Validates: Requirements 9.3, 9.4**

### UI Display Properties

**Property 16: Winner Column Display for Ended Auctions**
*For any* ended auction with a winner, the admin dashboard winner column should display the winner's username.
**Validates: Requirements 6.2**

**Property 17: Winner Column Display for Active Auctions**
*For any* active auction, the admin dashboard winner column should display "-".
**Validates: Requirements 6.4**

**Property 18: Bid History Display Completeness**
*For any* bid history entry displayed in the bidder dashboard, the rendered output should contain auction title, bid amount with " CR" suffix, bid status, and timestamp.
**Validates: Requirements 7.2**

### Socket.IO Event Properties

**Property 19: Auction Ended Event Payload Structure**
*For any* 'auction:ended' Socket.IO event, the payload should contain auctionId, status, winner object (with id, username, email), and finalPrice.
**Validates: Requirements 8.5, 8.6**

### Error Handling Properties

**Property 20: Fault Isolation in Sweeper**
*For any* batch of expired auctions processed by the sweeper, if one auction fails to complete due to an error, the other auctions should still be processed successfully.
**Validates: Requirements 10.2**

**Property 21: Notification Failure Tolerance**
*For any* auction completion, if notification creation fails, the auction should still be marked as ended and the winner should still be assigned.
**Validates: Requirements 10.3**

**Property 22: Socket.IO Failure Tolerance**
*For any* auction completion, if Socket.IO event emission fails, the database updates should still be persisted.
**Validates: Requirements 10.6**

### Reporting Properties

**Property 23: Winners Report Completeness**
*For any* request for auction winners report, the response should include all auctions with status 'ended' that have a winner.
**Validates: Requirements 12.4**

**Property 24: Winners Report Data Structure**
*For any* entry in the winners report, it should contain auction title, winner name, winning bid amount with " CR" suffix, and end timestamp.
**Validates: Requirements 12.5**

### Edge Case Handling

The following edge cases should be handled by the property-based test generators:

1. **No-Bid Auctions** (Requirements 1.4, 2.4, 6.3): Generators should create auctions with zero bids to ensure the system handles them gracefully.

2. **Tied Bids** (Requirements 10.1): Generators should create scenarios where multiple bids have identical amounts to test tie-breaking logic.

3. **Deleted User Accounts** (Requirements 10.5): Test data should include scenarios where a user account is deleted before auction ends.

4. **Empty Strings and Null Values**: Generators should include edge cases for missing or null data fields.

### Property Test Configuration

All property-based tests should:
- Run a minimum of 100 iterations per property
- Use appropriate generators for auction data, bid data, and user data
- Include edge cases in the generated data
- Tag each test with the format: `Feature: auction-completion-winner-management, Property {number}: {property_title}`

