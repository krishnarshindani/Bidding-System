# Implementation Plan: Auction Completion and Winner Management System

## Overview

This implementation plan breaks down the auction completion and winner management system into discrete, incremental coding tasks. The approach follows a bottom-up strategy: first implementing core backend services and database queries, then enhancing the sweeper and API routes, and finally updating the frontend dashboards with proper currency display and winner information.

## Tasks

- [x] 1. Create currency formatting utility
  - Create `src/utils/currency.ts` with `formatCR()` and `formatCRDisplay()` functions
  - Handle null/undefined values gracefully
  - Ensure consistent " CR" suffix for all amounts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

- [x] 1.1 Write property tests for currency formatting
  - **Property 11: Currency Formatting Consistency**
  - **Validates: Requirements 5.1-5.7**
  - Test that all numeric amounts are formatted with " CR" suffix
  - Test null/undefined handling
  - Test whole numbers vs decimals

- [x] 2. Enhance database query functions
  - [x] 2.1 Add `markBidAsWon()` function to queries.js
    - Update bid status to 'won' for winning bid
    - _Requirements: 3.2_
  
  - [x] 2.2 Add `markOtherBidsAsOutbid()` function to queries.js
    - Update all non-winning bids to 'outbid' status for an auction
    - _Requirements: 9.2_
  
  - [x] 2.3 Enhance `getAuctionWinnerDetails()` function
    - Join with users table to get username, email, phone
    - Join with auctions table to get auction title
    - Return complete winner information
    - _Requirements: 6.2, 12.5_
  
  - [x] 2.4 Add `getUserWonAuctions()` function (if not exists)
    - Query auctions where user is current_highest_bidder_id and status is 'ended'
    - Include bid amount and timestamp
    - _Requirements: 7.2_
  
  - [x] 2.5 Add `getUserLostAuctions()` function (if not exists)
    - Query auctions where user placed bids but didn't win
    - Include highest bid and winner information
    - _Requirements: 7.2_

- [x] 2.6 Write property tests for query functions
  - **Property 4: Winning Bid Status Update**
  - **Validates: Requirements 3.2, 9.2**
  - Test that exactly one bid is marked 'won' and others are 'outbid'

- [x] 3. Create auction completion service
  - [x] 3.1 Create `server/services/auctionCompletion.js` module
    - Export `completeAuction(auctionId, source, io)` function
    - Implement idempotency check (skip if already ended)
    - Get auction details and highest bid
    - _Requirements: 1.2, 2.2, 2.5_
  
  - [x] 3.2 Implement winner assignment logic
    - Handle tie-breaking (earliest bid wins)
    - Update auction status to 'ended'
    - Mark winning bid as 'won'
    - Mark other bids as 'outbid'
    - Update auction.current_highest_bidder_id
    - _Requirements: 1.3, 2.3, 3.1, 3.2, 10.1_
  
  - [x] 3.3 Implement no-bid auction handling
    - Mark auction as 'ended' with no winner
    - Create seller notification about no bids
    - _Requirements: 1.4, 2.4_
  
  - [x] 3.4 Implement notification creation
    - Create winner notification (type: 'auction_won')
    - Create seller notification (type: 'auction_ended')
    - Use "CR" in notification messages
    - Handle notification creation failures gracefully
    - _Requirements: 3.3, 3.5, 5.6, 10.3_
  
  - [x] 3.5 Implement Socket.IO event emission
    - Emit 'auction:ended' to auction room with winner details
    - Emit 'notification:new' to winner's user channel
    - Emit 'notification:new' to seller's user channel
    - Handle Socket.IO failures gracefully (don't block database updates)
    - _Requirements: 3.4, 3.6, 8.1, 8.2, 8.3, 10.6_
  
  - [x] 3.6 Implement database transaction wrapper
    - Wrap all database updates in a transaction
    - Rollback on any failure
    - Log completion events
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 3.7 Write property tests for auction completion service
  - **Property 2: Auction Status Transition**
  - **Validates: Requirements 1.2, 2.2**
  - **Property 3: Winner Assignment from Highest Bid**
  - **Validates: Requirements 1.3, 2.3, 3.1**
  - **Property 5: Tie-Breaking by Timestamp**
  - **Validates: Requirements 10.1**
  - **Property 9: No Double Credit Deduction**
  - **Validates: Requirements 4.1**
  - **Property 10: No Credit Transactions for No-Bid Auctions**
  - **Validates: Requirements 4.2**
  - **Property 13: Idempotent Auction Closure**
  - **Validates: Requirements 2.5**
  - **Property 15: Transaction Atomicity**
  - **Validates: Requirements 9.3, 9.4**
  - **Property 21: Notification Failure Tolerance**
  - **Validates: Requirements 10.3**
  - **Property 22: Socket.IO Failure Tolerance**
  - **Validates: Requirements 10.6**

- [x] 4. Checkpoint - Ensure core service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance sweeper process
  - [x] 5.1 Update sweeper in `server/server.js`
    - Import and use `completeAuction()` from auction completion service
    - Replace inline logic with service call
    - Improve error handling (log and continue on failure)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.2_
  
  - [x] 5.2 Add sweeper logging
    - Log each auction processed
    - Log errors with auction ID
    - Log completion summary
    - _Requirements: 9.5_

- [x] 5.3 Write property tests for sweeper
  - **Property 1: Expired Auction Identification**
  - **Validates: Requirements 1.1, 10.4**
  - **Property 20: Fault Isolation in Sweeper**
  - **Validates: Requirements 10.2**

- [-] 6. Enhance REST API routes
  - [x] 6.1 Update POST `/api/auctions/:auctionId/close` route
    - Verify admin privileges
    - Call `completeAuction()` service
    - Return winner details in response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 6.2 Enhance GET `/api/auctions/:auctionId/winner` route
    - Use enhanced `getAuctionWinnerDetails()` query
    - Return complete winner information
    - Format bid amount with " CR"
    - _Requirements: 6.2, 12.5_
  
  - [ ] 6.3 Enhance GET `/api/auctions/user/won` route
    - Use `getUserWonAuctions()` query
    - Format all amounts with " CR"
    - _Requirements: 7.2_
  
  - [ ] 6.4 Enhance GET `/api/auctions/user/lost` route
    - Use `getUserLostAuctions()` query
    - Format all amounts with " CR"
    - _Requirements: 7.2_
  
  - [ ] 6.5 Enhance GET `/api/auctions/admin/winners` route
    - Use `getAllAuctionWinners()` query
    - Format all amounts with " CR"
    - _Requirements: 12.4, 12.5_

- [ ] 6.6 Write property tests for API routes
  - **Property 12: Admin Authorization for Manual Closure**
  - **Validates: Requirements 2.1**
  - **Property 23: Winners Report Completeness**
  - **Validates: Requirements 12.4**
  - **Property 24: Winners Report Data Structure**
  - **Validates: Requirements 12.5**

- [x] 7. Update Socket.IO event handler
  - [x] 7.1 Update `socket.on('auction:end')` handler in `server/server.js`
    - Call `completeAuction()` service instead of inline logic
    - Remove duplicate code
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 7.2 Write property tests for Socket.IO events
  - **Property 19: Auction Ended Event Payload Structure**
  - **Validates: Requirements 8.5, 8.6**

- [ ] 8. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Update Admin Dashboard frontend
  - [ ] 9.1 Add winner column to auctions table in `src/pages/AdminDashboard.tsx`
    - Add "Winner" column header
    - Display winner username for ended auctions with winner
    - Display "No bids" for ended auctions without winner
    - Display "-" for active auctions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 9.2 Update all currency displays to use formatCR utility
    - Import `formatCRDisplay()` from currency utility
    - Replace all hardcoded currency displays
    - Ensure "CR" suffix on all bid amounts, starting prices, credit balances
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_
  
  - [ ] 9.3 Add real-time auction:ended event handler
    - Listen for 'auction:ended' Socket.IO events
    - Update auction list when event received
    - Show winner information in real-time
    - _Requirements: 8.1, 8.4_
  
  - [ ] 9.4 Fetch winner information for ended auctions
    - Call API to get winner details when displaying ended auctions
    - Display winner username in winner column
    - _Requirements: 6.2, 6.6_

- [ ] 9.5 Write property tests for Admin Dashboard
  - **Property 16: Winner Column Display for Ended Auctions**
  - **Validates: Requirements 6.2**
  - **Property 17: Winner Column Display for Active Auctions**
  - **Validates: Requirements 6.4**

- [ ] 10. Update Bidder Dashboard frontend
  - [ ] 10.1 Add won/lost auctions tabs in `src/pages/BidderDashboard.tsx`
    - Add "Won Auctions" tab
    - Add "Lost Auctions" tab
    - Fetch data from new API endpoints
    - _Requirements: 7.1_
  
  - [ ] 10.2 Update bid history display
    - Show auction title, bid amount, status, timestamp
    - Highlight won bids with distinct styling
    - Show muted styling for outbid bids
    - Use formatCR for all amounts
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ] 10.3 Update all currency displays to use formatCR utility
    - Import `formatCRDisplay()` from currency utility
    - Replace all hardcoded currency displays
    - Ensure "CR" suffix on all amounts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_
  
  - [ ] 10.4 Add real-time notification handlers
    - Listen for 'notification:new' Socket.IO events
    - Update notifications list when event received
    - Show toast notification for auction wins
    - _Requirements: 8.2, 8.4_

- [ ] 10.5 Write property tests for Bidder Dashboard
  - **Property 18: Bid History Display Completeness**
  - **Validates: Requirements 7.2**

- [ ] 11. Update API service frontend
  - [ ] 11.1 Add new API methods to `src/services/api.ts`
    - Add `getWinner(auctionId)` method
    - Add `getUserWonAuctions(token)` method
    - Add `getUserLostAuctions(token)` method
    - Add `getAllWinners(token)` method for admin
    - _Requirements: 6.2, 7.2, 12.4_

- [ ] 12. Update notification messages
  - [ ] 12.1 Review all notification creation calls
    - Ensure all use "CR" not "$" or "dollars"
    - Update any hardcoded currency references
    - _Requirements: 5.6_

- [ ] 12.2 Write property tests for notification messages
  - **Property 8: Notification Message Currency Format**
  - **Validates: Requirements 5.6**

- [ ] 13. Final checkpoint - Integration testing
  - [ ] 13.1 Test automatic auction completion via sweeper
    - Create test auction with past end time
    - Place test bid
    - Wait for sweeper to run
    - Verify auction marked as ended
    - Verify winner assigned correctly
    - Verify notifications created
    - Verify Socket.IO events emitted
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 13.2 Test manual auction closure by admin
    - Admin logs in
    - Creates active auction
    - Bidder places bid
    - Admin clicks "Close" button
    - Verify auction closes immediately
    - Verify winner assigned correctly
    - Verify UI updates in real-time
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 13.3 Test currency display consistency
    - Navigate through all dashboards
    - Verify all currency amounts show "CR" suffix
    - Check auction cards, bid history, notifications
    - Verify no "$" or "dollars" references
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 13.4 Test winner display in admin dashboard
    - View ended auctions in admin dashboard
    - Verify winner column shows correct usernames
    - Verify "No bids" for auctions without bids
    - Verify "-" for active auctions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 13.5 Test bidder dashboard auction history
    - Bidder views their dashboard
    - Verify "My Bids" tab shows all bids
    - Verify won auctions are highlighted
    - Verify lost auctions are shown
    - Verify all amounts in CR
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 13.6 Test edge cases
    - Test auction with no bids
    - Test auction with tied bids (earliest wins)
    - Test auction with deleted user account
    - Test sweeper error handling (one failure doesn't stop others)
    - _Requirements: 1.4, 2.4, 10.1, 10.2, 10.5_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property-based tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across all inputs
- Integration tests validate end-to-end flows and real-time updates
- The implementation follows a bottom-up approach: utilities → queries → services → API → frontend
- Currency formatting is centralized in a utility to ensure consistency
- The auction completion service is reusable by both sweeper and manual closure
- Database transactions ensure atomicity and consistency
- Error handling is defensive (log and continue, don't crash)
