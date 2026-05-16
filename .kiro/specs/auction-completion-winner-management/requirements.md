# Requirements Document

## Introduction

This specification defines the requirements for a comprehensive auction completion and winner management system for the Bid Brilliance platform. The system must handle auction lifecycle completion through both automatic time-based expiration and manual admin closure, properly assign winners, manage credit transactions, display currency consistently as CR (Credits), and provide real-time updates to all stakeholders.

## Glossary

- **System**: The Bid Brilliance auction platform backend and frontend
- **Sweeper**: An automated background process that checks for expired auctions every 10 seconds
- **Winner**: The user with the highest bid when an auction ends
- **CR**: Credits, the platform's internal currency unit (not dollars)
- **Admin**: A user with administrative privileges who can manually close auctions
- **Bidder**: A user who places bids on auctions
- **Seller**: A user who creates auctions
- **Socket.IO**: Real-time bidirectional communication library
- **Active_Auction**: An auction with status 'active' that accepts bids
- **Ended_Auction**: An auction with status 'ended' that no longer accepts bids
- **Highest_Bid**: The bid with the largest bid_amount for a given auction
- **Winner_Assignment**: The process of marking a bidder as the winner and updating auction status

## Requirements

### Requirement 1: Auction Completion via Time Expiration

**User Story:** As a system administrator, I want auctions to automatically close when their end time is reached, so that the platform operates without manual intervention.

#### Acceptance Criteria

1. WHEN the Sweeper runs its periodic check, THE System SHALL identify all Active_Auctions where auction_end_time is less than or equal to current time
2. WHEN an expired Active_Auction is identified, THE System SHALL update the auction status to 'ended'
3. WHEN an expired auction has at least one bid, THE System SHALL assign the Highest_Bid bidder as the winner
4. WHEN an expired auction has no bids, THE System SHALL mark the auction as 'ended' with no winner
5. WHEN the Sweeper processes an auction, THE System SHALL complete the process within 2 seconds to avoid blocking other auctions

### Requirement 2: Auction Completion via Manual Closure

**User Story:** As an admin, I want to manually close active auctions, so that I can handle special circumstances or policy violations.

#### Acceptance Criteria

1. WHEN an Admin requests to close an Active_Auction, THE System SHALL verify the user has admin privileges
2. WHEN a valid admin closes an Active_Auction, THE System SHALL update the auction status to 'ended'
3. WHEN a manually closed auction has at least one bid, THE System SHALL assign the Highest_Bid bidder as the winner
4. WHEN a manually closed auction has no bids, THE System SHALL mark the auction as 'ended' with no winner
5. IF an auction is already ended, THEN THE System SHALL reject the close request with an appropriate error message

### Requirement 3: Winner Assignment and Notification

**User Story:** As a bidder, I want to be notified immediately when I win an auction, so that I can proceed with the transaction.

#### Acceptance Criteria

1. WHEN an auction ends with bids, THE System SHALL identify the bid with the highest bid_amount as the winning bid
2. WHEN a winner is identified, THE System SHALL update the bid status to 'won' in the database
3. WHEN a winner is assigned, THE System SHALL create a notification record for the winner with type 'auction_won'
4. WHEN a winner is assigned, THE System SHALL emit a real-time Socket.IO event to the winner's user channel
5. WHEN a winner is assigned, THE System SHALL create a notification for the seller with winner details
6. WHEN a winner is assigned, THE System SHALL emit a real-time Socket.IO event to the auction room with winner information

### Requirement 4: Credit Management on Auction Completion

**User Story:** As a bidder, I want my credits to be handled correctly when auctions end, so that I am not charged twice for winning.

#### Acceptance Criteria

1. WHEN a winning bid is determined, THE System SHALL NOT deduct credits again (credits already deducted when bid was placed)
2. WHEN an auction ends with no winner, THE System SHALL ensure no credit transactions occur
3. WHEN a bidder is outbid before auction end, THE System SHALL have already returned their credits
4. THE System SHALL maintain accurate credit balance records in the user_credits_history table
5. THE System SHALL record the transaction type as 'bid_placement' when credits are initially deducted

### Requirement 5: Currency Display Consistency

**User Story:** As a user, I want all currency amounts displayed as CR (Credits), so that I understand the platform uses credits not dollars.

#### Acceptance Criteria

1. WHEN displaying bid amounts in the Admin Dashboard, THE System SHALL append " CR" to all numeric values
2. WHEN displaying bid amounts in the Bidder Dashboard, THE System SHALL append " CR" to all numeric values
3. WHEN displaying user credit balances, THE System SHALL append " CR" to all numeric values
4. WHEN displaying auction starting prices, THE System SHALL append " CR" to all numeric values
5. WHEN displaying winning bid amounts, THE System SHALL append " CR" to all numeric values
6. WHEN sending notifications about bids or credits, THE System SHALL use "CR" not "$" or "dollars"
7. WHEN displaying transaction history, THE System SHALL show amounts with " CR" suffix

### Requirement 6: Admin Dashboard Winner Display

**User Story:** As an admin, I want to see winner information for ended auctions in my dashboard, so that I can track auction outcomes.

#### Acceptance Criteria

1. WHEN an Admin views the auctions table, THE System SHALL display a "Winner" column
2. WHEN an auction status is 'ended' and has a winner, THE System SHALL display the winner's username in the Winner column
3. WHEN an auction status is 'ended' with no bids, THE System SHALL display "No bids" in the Winner column
4. WHEN an auction status is 'active', THE System SHALL display "-" in the Winner column
5. WHEN an Admin clicks on a winner name, THE System SHALL navigate to the winner's user profile or display winner details
6. THE System SHALL fetch winner information from the current_highest_bidder_id field in the auctions table

### Requirement 7: Bidder Dashboard Auction History

**User Story:** As a bidder, I want to see which auctions I won and which I lost, so that I can track my bidding performance.

#### Acceptance Criteria

1. WHEN a Bidder views their dashboard, THE System SHALL provide a "My Bids" tab showing all bids placed
2. WHEN displaying bid history, THE System SHALL show auction title, bid amount in CR, bid status, and timestamp
3. WHEN a bid status is 'won', THE System SHALL highlight it with a distinct visual indicator
4. WHEN a bid status is 'outbid', THE System SHALL display it with a muted visual style
5. WHEN a Bidder clicks on a bid entry, THE System SHALL navigate to the auction detail page
6. THE System SHALL fetch bid history from the bids table joined with auctions table

### Requirement 8: Real-Time Update Propagation

**User Story:** As a user, I want to receive immediate updates when auctions end, so that I know the outcome without refreshing.

#### Acceptance Criteria

1. WHEN an auction ends, THE System SHALL emit a 'auction:ended' Socket.IO event to the auction room
2. WHEN an auction ends, THE System SHALL emit a 'notification:new' Socket.IO event to the winner's user channel
3. WHEN an auction ends, THE System SHALL emit a 'notification:new' Socket.IO event to the seller's user channel
4. WHEN a user receives an auction end notification, THE System SHALL update the UI without requiring a page refresh
5. THE System SHALL include winner details (id, username, email) in the 'auction:ended' event payload
6. THE System SHALL include final price in CR in the 'auction:ended' event payload

### Requirement 9: Database Consistency and Integrity

**User Story:** As a system architect, I want auction completion to maintain database consistency, so that data remains accurate and reliable.

#### Acceptance Criteria

1. WHEN an auction is marked as 'ended', THE System SHALL ensure the current_highest_bidder_id field is populated if bids exist
2. WHEN a bid is marked as 'won', THE System SHALL ensure all other bids for that auction are marked as 'outbid'
3. WHEN winner assignment occurs, THE System SHALL update the auction status and bid status in a single transaction
4. IF any database operation fails during auction completion, THEN THE System SHALL roll back all changes
5. THE System SHALL log all auction completion events with timestamp, auction ID, and winner ID

### Requirement 10: Error Handling and Edge Cases

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that unexpected scenarios don't crash the platform.

#### Acceptance Criteria

1. WHEN an auction has multiple bids with identical highest amounts, THE System SHALL select the earliest bid as the winner
2. WHEN the Sweeper encounters a database error, THE System SHALL log the error and continue processing other auctions
3. WHEN a winner notification fails to send, THE System SHALL still complete the auction closure process
4. WHEN an auction end time is in the past but status is still 'active', THE System SHALL process it on the next Sweeper run
5. IF a user account is deleted before auction ends, THEN THE System SHALL handle the missing user gracefully
6. WHEN Socket.IO connection is lost, THE System SHALL still persist auction completion to the database

### Requirement 11: Performance and Scalability

**User Story:** As a system administrator, I want auction completion to be efficient, so that the platform can handle many simultaneous auction endings.

#### Acceptance Criteria

1. WHEN the Sweeper runs, THE System SHALL process up to 100 expired auctions per iteration
2. WHEN processing multiple expired auctions, THE System SHALL complete all within 10 seconds
3. THE System SHALL use database indexes on auction_end_time and status fields for efficient queries
4. THE System SHALL batch database updates where possible to reduce query count
5. THE System SHALL limit Socket.IO event emissions to only connected users to reduce network overhead

### Requirement 12: Audit Trail and Reporting

**User Story:** As an admin, I want to see a complete history of auction completions, so that I can audit platform activity.

#### Acceptance Criteria

1. WHEN an auction ends, THE System SHALL create a notification record for the seller
2. WHEN an auction ends, THE System SHALL create a notification record for the winner
3. THE System SHALL store all credit transactions in the user_credits_history table with related_auction_id
4. WHEN an Admin requests auction winners report, THE System SHALL return all ended auctions with winner details
5. THE System SHALL include auction title, winner name, winning bid amount in CR, and end timestamp in reports
