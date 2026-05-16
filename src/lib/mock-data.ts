import { Auction, Bid, User, Notification, AuctionStats } from "./types";

export const mockUsers: User[] = [
  { id: "admin-1", email: "admin@codebidz.com", name: "Admin", role: "admin", credits: 0, createdAt: new Date("2024-01-01") },
  { id: "bidder-1", email: "alice@example.com", name: "Alice Chen", role: "bidder", credits: 500, createdAt: new Date("2024-01-15") },
  { id: "bidder-2", email: "bob@example.com", name: "Bob Martinez", role: "bidder", credits: 350, createdAt: new Date("2024-01-20") },
  { id: "bidder-3", email: "carol@example.com", name: "Carol Davis", role: "bidder", credits: 720, createdAt: new Date("2024-02-01") },
  { id: "bidder-4", email: "dave@example.com", name: "Dave Wilson", role: "bidder", credits: 180, createdAt: new Date("2024-02-10") },
  { id: "bidder-5", email: "emma@example.com", name: "Emma Thompson", role: "bidder", credits: 600, createdAt: new Date("2024-02-15") },
];

const now = new Date();
const hour = 60 * 60 * 1000;

export const mockAuctions: Auction[] = [
  {
    id: "auction-1", title: "Vintage Mechanical Watch", description: "A rare 1960s Swiss mechanical watch in pristine condition. Features a 42mm case with sapphire crystal.", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600", startTime: new Date(now.getTime() - 2 * hour), endTime: new Date(now.getTime() + 4 * hour), minimumBid: 50, currentBid: 180, currentBidderId: "bidder-1", currentBidderName: "Alice Chen", status: "active", category: "Collectibles", totalBids: 12,
  },
  {
    id: "auction-2", title: "Original Abstract Painting", description: "A stunning original oil painting by emerging artist. 36x48 inches on stretched canvas.", image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600", startTime: new Date(now.getTime() - 1 * hour), endTime: new Date(now.getTime() + 6 * hour), minimumBid: 100, currentBid: 340, currentBidderId: "bidder-3", currentBidderName: "Carol Davis", status: "active", category: "Art", totalBids: 8,
  },
  {
    id: "auction-3", title: "Gaming Laptop RTX 4090", description: "High-end gaming laptop with RTX 4090, 64GB RAM, 2TB SSD. Factory sealed.", image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600", startTime: new Date(now.getTime() - 3 * hour), endTime: new Date(now.getTime() + 2 * hour), minimumBid: 200, currentBid: 520, currentBidderId: "bidder-2", currentBidderName: "Bob Martinez", status: "active", category: "Electronics", totalBids: 18,
  },
  {
    id: "auction-4", title: "Signed First Edition Book", description: "Signed first edition of a classic novel. Excellent condition with dust jacket.", image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600", startTime: new Date(now.getTime() + 2 * hour), endTime: new Date(now.getTime() + 10 * hour), minimumBid: 30, currentBid: 0, status: "upcoming", category: "Books", totalBids: 0,
  },
  {
    id: "auction-5", title: "Antique Persian Rug", description: "Hand-knotted Persian rug from the early 1900s. Vibrant colors, 8x10 feet.", image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600", startTime: new Date(now.getTime() - 10 * hour), endTime: new Date(now.getTime() - 1 * hour), minimumBid: 150, currentBid: 450, currentBidderId: "bidder-5", currentBidderName: "Emma Thompson", winnerId: "bidder-5", winnerName: "Emma Thompson", status: "ended", category: "Antiques", totalBids: 15,
  },
  {
    id: "auction-6", title: "Drone with 4K Camera", description: "Professional-grade drone with 4K HDR camera, 45-min flight time, obstacle avoidance.", image: "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=600", startTime: new Date(now.getTime() - 30 * 60000), endTime: new Date(now.getTime() + 8 * hour), minimumBid: 80, currentBid: 165, currentBidderId: "bidder-4", currentBidderName: "Dave Wilson", status: "active", category: "Electronics", totalBids: 6,
  },
];

export const mockBids: Bid[] = [
  { id: "bid-1", auctionId: "auction-1", bidderId: "bidder-2", bidderName: "Bob Martinez", amount: 50, timestamp: new Date(now.getTime() - 100 * 60000), isWinning: false },
  { id: "bid-2", auctionId: "auction-1", bidderId: "bidder-1", bidderName: "Alice Chen", amount: 80, timestamp: new Date(now.getTime() - 90 * 60000), isWinning: false },
  { id: "bid-3", auctionId: "auction-1", bidderId: "bidder-3", bidderName: "Carol Davis", amount: 120, timestamp: new Date(now.getTime() - 60 * 60000), isWinning: false },
  { id: "bid-4", auctionId: "auction-1", bidderId: "bidder-1", bidderName: "Alice Chen", amount: 180, timestamp: new Date(now.getTime() - 30 * 60000), isWinning: true },
  { id: "bid-5", auctionId: "auction-2", bidderId: "bidder-1", bidderName: "Alice Chen", amount: 100, timestamp: new Date(now.getTime() - 50 * 60000), isWinning: false },
  { id: "bid-6", auctionId: "auction-2", bidderId: "bidder-3", bidderName: "Carol Davis", amount: 340, timestamp: new Date(now.getTime() - 20 * 60000), isWinning: true },
  { id: "bid-7", auctionId: "auction-3", bidderId: "bidder-4", bidderName: "Dave Wilson", amount: 200, timestamp: new Date(now.getTime() - 150 * 60000), isWinning: false },
  { id: "bid-8", auctionId: "auction-3", bidderId: "bidder-2", bidderName: "Bob Martinez", amount: 520, timestamp: new Date(now.getTime() - 10 * 60000), isWinning: true },
];

export const mockNotifications: Notification[] = [
  { id: "notif-1", userId: "bidder-1", type: "outbid", message: "You've been outbid on Gaming Laptop RTX 4090!", read: false, timestamp: new Date(now.getTime() - 10 * 60000), auctionId: "auction-3" },
  { id: "notif-2", userId: "bidder-1", type: "winning", message: "You're winning Vintage Mechanical Watch!", read: false, timestamp: new Date(now.getTime() - 30 * 60000), auctionId: "auction-1" },
  { id: "notif-3", userId: "bidder-1", type: "credit_assigned", message: "Admin assigned 200 credits to your account.", read: true, timestamp: new Date(now.getTime() - 2 * hour) },
];

export const mockStats: AuctionStats = {
  totalAuctions: 6,
  activeAuctions: 4,
  totalBids: 59,
  totalCreditsDistributed: 2350,
  totalRevenue: 1655,
  avgBidsPerAuction: 9.8,
};

export const bidActivityData = [
  { hour: "00:00", bids: 2 }, { hour: "02:00", bids: 1 }, { hour: "04:00", bids: 0 },
  { hour: "06:00", bids: 3 }, { hour: "08:00", bids: 8 }, { hour: "10:00", bids: 15 },
  { hour: "12:00", bids: 22 }, { hour: "14:00", bids: 28 }, { hour: "16:00", bids: 35 },
  { hour: "18:00", bids: 30 }, { hour: "20:00", bids: 25 }, { hour: "22:00", bids: 12 },
];

export const categoryData = [
  { name: "Electronics", value: 35, children: [{ name: "Laptops", value: 15 }, { name: "Drones", value: 10 }, { name: "Phones", value: 10 }] },
  { name: "Art", value: 25, children: [{ name: "Paintings", value: 15 }, { name: "Sculptures", value: 10 }] },
  { name: "Collectibles", value: 20, children: [{ name: "Watches", value: 12 }, { name: "Coins", value: 8 }] },
  { name: "Antiques", value: 15, children: [{ name: "Rugs", value: 8 }, { name: "Furniture", value: 7 }] },
  { name: "Books", value: 5, children: [{ name: "Fiction", value: 3 }, { name: "Non-Fiction", value: 2 }] },
];
