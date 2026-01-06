# API Reference

Complete API documentation for the E-Commerce Addon.

## Authentication

All authenticated endpoints require a valid session. Use NextAuth.js to manage authentication.

**Headers:**
```
Cookie: next-auth.session-token=<token>
```

## Products API

### List Products

```http
GET /api/products
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 12) - Items per page
- `category` (string) - Filter by category ID
- `search` (string) - Search in name and description
- `minPrice` (number) - Minimum price filter
- `maxPrice` (number) - Maximum price filter
- `sortBy` (string, default: 'createdAt') - Sort field
- `sortOrder` ('asc' | 'desc', default: 'desc') - Sort direction

**Response:**
```json
{
  "products": [
    {
      "id": "clxxx",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Description",
      "price": 99.99,
      "compareAtPrice": 129.99,
      "quantity": 50,
      "status": "ACTIVE",
      "featured": true,
      "category": { "id": "clxxx", "name": "Electronics" },
      "images": [
        { "id": "clxxx", "url": "https://...", "position": 0 }
      ],
      "variants": [],
      "averageRating": 4.5,
      "reviewCount": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9
  }
}
```

### Get Product Details

```http
GET /api/products/[id]
```

**Response:** Single product object with full details

## Cart API

### Get Cart

```http
GET /api/cart
```

**Response:**
```json
{
  "items": [
    {
      "id": "clxxx",
      "productId": "clxxx",
      "variantId": null,
      "quantity": 2,
      "price": 99.99,
      "product": {
        "name": "Product Name",
        "images": [{ "url": "https://..." }]
      }
    }
  ],
  "subtotal": 199.98,
  "itemCount": 2
}
```

### Add to Cart

```http
POST /api/cart
```

**Request Body:**
```json
{
  "productId": "clxxx",
  "variantId": "clxxx",  // optional
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true
}
```

### Update Cart Item

```http
PATCH /api/cart/[itemId]
```

**Request Body:**
```json
{
  "quantity": 3
}
```

### Remove from Cart

```http
DELETE /api/cart/[itemId]
```

## Checkout API

### Create Order

```http
POST /api/checkout
```

**Request Body:**
```json
{
  "shippingAddressId": "clxxx",
  "billingAddressId": "clxxx",  // optional, defaults to shipping
  "couponCode": "SAVE10",        // optional
  "paymentMethod": "CARD"
}
```

**Response:**
```json
{
  "order": {
    "id": "clxxx",
    "orderNumber": "ORD-1234567890",
    "status": "PENDING",
    "subtotal": 199.98,
    "discount": 19.99,
    "shipping": 10.00,
    "tax": 0,
    "total": 189.99,
    "items": [...],
    "shippingAddress": {...}
  },
  "clientSecret": "pi_xxx_secret_xxx"
}
```

Use `clientSecret` with Stripe Elements to complete payment.

## Orders API

### List User Orders

```http
GET /api/orders
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response:**
```json
{
  "orders": [
    {
      "id": "clxxx",
      "orderNumber": "ORD-1234567890",
      "status": "DELIVERED",
      "paymentStatus": "PAID",
      "total": 189.99,
      "createdAt": "2024-01-01T00:00:00Z",
      "items": [...],
      "shippingAddress": {...}
    }
  ],
  "pagination": {...}
}
```

### Get Order Details

```http
GET /api/orders/[id]
```

## Reviews API

### List Product Reviews

```http
GET /api/reviews?productId=clxxx
```

**Query Parameters:**
- `productId` (string, required)
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response:**
```json
{
  "reviews": [
    {
      "id": "clxxx",
      "rating": 5,
      "title": "Great product!",
      "comment": "Highly recommended",
      "verified": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "user": {
        "id": "clxxx",
        "name": "John Doe",
        "image": "https://..."
      }
    }
  ],
  "pagination": {...}
}
```

### Create Review

```http
POST /api/reviews
```

**Request Body:**
```json
{
  "productId": "clxxx",
  "rating": 5,
  "title": "Great product!",
  "comment": "Highly recommended"
}
```

**Validation:**
- Rating: 1-5 (integer)
- Comment: Required, min 1 character
- One review per user per product

### Update Review

```http
PATCH /api/reviews/[id]
```

**Request Body:**
```json
{
  "rating": 4,
  "title": "Updated title",
  "comment": "Updated comment"
}
```

### Delete Review

```http
DELETE /api/reviews/[id]
```

## Wishlist API

### Get Wishlist

```http
GET /api/wishlist
```

**Response:**
```json
{
  "items": [
    {
      "id": "clxxx",
      "productId": "clxxx",
      "createdAt": "2024-01-01T00:00:00Z",
      "product": {
        "id": "clxxx",
        "name": "Product Name",
        "price": 99.99,
        "images": [...],
        "category": {...}
      }
    }
  ]
}
```

### Add to Wishlist

```http
POST /api/wishlist
```

**Request Body:**
```json
{
  "productId": "clxxx"
}
```

### Remove from Wishlist

```http
DELETE /api/wishlist?productId=clxxx
```

## Addresses API

### List Addresses

```http
GET /api/addresses
```

**Response:**
```json
{
  "addresses": [
    {
      "id": "clxxx",
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US",
      "phone": "+1234567890",
      "isDefault": true
    }
  ]
}
```

### Create Address

```http
POST /api/addresses
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "company": "Acme Inc",        // optional
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",     // optional
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "phone": "+1234567890",       // optional
  "isDefault": false
}
```

### Update Address

```http
PATCH /api/addresses/[id]
```

### Delete Address

```http
DELETE /api/addresses/[id]
```

## Admin APIs

All admin endpoints require `role === 'ADMIN'`.

### Admin - List Products

```http
GET /api/admin/products
```

**Query Parameters:**
- `page`, `limit`, `status`

### Admin - Create Product

```http
POST /api/admin/products
```

**Request Body:**
```json
{
  "name": "New Product",
  "slug": "new-product",
  "description": "Product description",
  "price": 99.99,
  "categoryId": "clxxx",
  "quantity": 100,
  "status": "ACTIVE",
  "featured": false
}
```

### Admin - Update Product

```http
PATCH /api/admin/products/[id]
```

### Admin - Delete Product

```http
DELETE /api/admin/products/[id]
```

### Admin - List Orders

```http
GET /api/admin/orders
```

**Query Parameters:**
- `page`, `limit`, `status`

### Admin - Update Order Status

```http
PATCH /api/admin/orders/[id]
```

**Request Body:**
```json
{
  "status": "SHIPPED",
  "trackingNumber": "1Z999AA10123456784",
  "shippingCarrier": "UPS"
}
```

**Order Statuses:**
- `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`

### Admin - List Coupons

```http
GET /api/admin/coupons
```

### Admin - Create Coupon

```http
POST /api/admin/coupons
```

**Request Body:**
```json
{
  "code": "SAVE20",
  "description": "20% off everything",
  "discountType": "PERCENTAGE",
  "discountValue": 20,
  "minPurchase": 50,           // optional
  "maxDiscount": 100,          // optional
  "usageLimit": 1000,          // optional
  "startDate": "2024-01-01T00:00:00Z",  // optional
  "endDate": "2024-12-31T23:59:59Z",    // optional
  "isActive": true
}
```

**Discount Types:**
- `PERCENTAGE` - Percentage discount (discountValue = percentage)
- `FIXED` - Fixed amount discount (discountValue = amount)
- `FREE_SHIPPING` - Free shipping

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
