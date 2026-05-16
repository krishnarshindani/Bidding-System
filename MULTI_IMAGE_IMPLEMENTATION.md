# Multi-Image Auction Implementation

## Overview
This implementation enables admins to upload up to 3 images for auction items and allows bidders to view them in a carousel/gallery format similar to Amazon and Flipkart.

## Changes Made

### 1. Database Schema
**File**: `database/migration_add_auction_images.sql`

Created a new `auction_images` table to store multiple images per auction:
```sql
CREATE TABLE auction_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auction_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_order INT DEFAULT 1,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auction_id (auction_id),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
);
```

**Key Features**:
- Stores up to 3 images per auction
- `image_order` field allows ordering of images (1, 2, 3)
- Automatic cascade delete when auction is deleted
- Indexed for fast queries

### 2. Backend API

#### Server Endpoint
**File**: `server/server.js`

Added new endpoint for multiple image uploads:
```javascript
app.post('/api/upload-multiple', upload.array('images', 3), (req, res) => {
  // Handles up to 3 image uploads
  // Returns array of image URLs
});
```

#### Database Queries
**File**: `server/services/queries.js`

Added new query functions:
- `addAuctionImage(auctionId, imageUrl, imageOrder)` - Add image to auction
- `getAuctionImages(auctionId)` - Retrieve all images for an auction
- `deleteAuctionImage(imageId)` - Remove specific image
- `updateAuctionImageOrder(imageId, newOrder)` - Reorder images

#### Auction Routes
**File**: `server/routes/auctions.js`

Updated `/create` endpoint to:
- Accept `imageUrls` array in request body
- Store multiple images in `auction_images` table
- Maintain backward compatibility with single image

### 3. Frontend API Service
**File**: `src/services/api.ts`

Added new method:
```typescript
uploadMultipleImages: async (files: File[]) => {
  // Uploads up to 3 images
  // Returns array of image URLs
}
```

### 4. Admin Dashboard
**File**: `src/pages/AdminDashboard.tsx`

#### Image Upload UI
- Changed from single file input to multiple file input
- Accepts up to 3 images
- Shows preview thumbnails for all selected images
- Displays count of uploaded images

#### Form Handling
```typescript
const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Limits to 3 files
  // Generates previews for all images
  // Updates state with file array
}
```

#### Auction Creation
- Uploads all selected images
- Stores URLs in database
- Uses first image as primary/featured image
- Shows success message with image count

### 5. Bidder View (AuctionDetail)
**File**: `src/pages/AuctionDetail.tsx`

Currently displays single image. To implement carousel:

**Recommended Implementation**:
```typescript
// Add state for image gallery
const [currentImageIndex, setCurrentImageIndex] = useState(0);
const [auctionImages, setAuctionImages] = useState<string[]>([]);

// Fetch images when auction loads
useEffect(() => {
  const images = await API_SERVICE.auctions.getAuctionImages(auctionId);
  setAuctionImages(images);
}, [auctionId]);

// Render carousel with navigation
<div className="image-carousel">
  <img src={auctionImages[currentImageIndex]} />
  <button onClick={() => setCurrentImageIndex(prev => (prev - 1 + auctionImages.length) % auctionImages.length)}>
    Previous
  </button>
  <button onClick={() => setCurrentImageIndex(prev => (prev + 1) % auctionImages.length)}>
    Next
  </button>
  {/* Thumbnail strip */}
  <div className="thumbnails">
    {auctionImages.map((img, idx) => (
      <img 
        key={idx} 
        src={img} 
        onClick={() => setCurrentImageIndex(idx)}
        className={idx === currentImageIndex ? 'active' : ''}
      />
    ))}
  </div>
</div>
```

## Database Migration

To apply the schema changes, run:
```bash
mysql -u root -p bid_brilliance < database/migration_add_auction_images.sql
```

Or execute the SQL directly in your MySQL client.

## Usage

### Admin: Creating Auction with Multiple Images

1. Go to Admin Dashboard → Create tab
2. Fill in auction details (title, description, price, etc.)
3. In "Auction Images" section:
   - Click file input
   - Select up to 3 images
   - Preview thumbnails appear
4. Click "Create Auction"
5. Images are uploaded and stored in database

### Bidder: Viewing Images

Currently shows single image. After implementing carousel:
- Main image display area
- Previous/Next navigation buttons
- Thumbnail strip at bottom
- Click thumbnail to jump to that image
- Similar to Amazon/Flipkart product galleries

## API Endpoints

### Upload Multiple Images
```
POST /api/upload-multiple
Content-Type: multipart/form-data

Body: FormData with 'images' field (up to 3 files)

Response:
{
  "imageUrls": ["/uploads/img1.jpg", "/uploads/img2.jpg", "/uploads/img3.jpg"],
  "count": 3
}
```

### Create Auction with Images
```
POST /api/auctions/create
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "...",
  "description": "...",
  "categoryId": 1,
  "startingPrice": 100,
  "auctionEndTime": "2024-01-15T10:00:00",
  "imageUrl": "/uploads/primary.jpg",
  "imageUrls": ["/uploads/img1.jpg", "/uploads/img2.jpg", "/uploads/img3.jpg"]
}
```

## File Structure

```
database/
  migration_add_auction_images.sql    # Schema migration

server/
  server.js                           # Upload endpoint
  routes/auctions.js                  # Create with images
  services/queries.js                 # Image queries

src/
  services/api.ts                     # uploadMultipleImages method
  pages/AdminDashboard.tsx            # Image upload UI
  pages/AuctionDetail.tsx             # (To be updated with carousel)
```

## Next Steps

1. **Implement Carousel in AuctionDetail**
   - Add image gallery component
   - Implement navigation controls
   - Add thumbnail strip
   - Fetch images from database

2. **Enhance UI**
   - Add zoom functionality
   - Implement lightbox/modal view
   - Add image lazy loading
   - Responsive design for mobile

3. **Image Optimization**
   - Compress images on upload
   - Generate thumbnails
   - Implement CDN caching
   - Add image validation

4. **Admin Features**
   - Reorder images
   - Delete individual images
   - Edit auction images
   - Image cropping tool

## Backward Compatibility

- Existing auctions with single `image_url` continue to work
- New auctions can have up to 3 images
- Primary image stored in `image_url` field
- Additional images stored in `auction_images` table

## Testing

### Test Auction Creation with Images
1. Login as admin
2. Go to Create Auction tab
3. Select 3 images
4. Verify previews display
5. Submit form
6. Check database for images in `auction_images` table

### Test Image Retrieval
```sql
SELECT * FROM auction_images WHERE auction_id = 1;
```

Should return 3 rows with image URLs and order.

## Performance Considerations

- Images indexed by `auction_id` for fast retrieval
- Cascade delete prevents orphaned images
- Lazy loading recommended for bidder view
- Consider CDN for image delivery
- Compress images to reduce storage

## Security

- File type validation (images only)
- File size limits (5MB per image)
- Filename sanitization
- CORS headers configured
- Authentication required for upload

## Troubleshooting

**Images not uploading**
- Check file size (max 5MB)
- Verify file format (jpg, png, gif, webp)
- Check server upload directory permissions
- Review server logs

**Images not displaying**
- Verify image URLs in database
- Check `/uploads` directory exists
- Verify static file serving configured
- Check CORS headers

**Database errors**
- Run migration script
- Verify foreign key constraints
- Check auction_id references valid auction
