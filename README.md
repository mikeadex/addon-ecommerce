# E-Commerce Addon

**A production-ready, standalone e-commerce module** built with Next.js 16, Prisma, PostgreSQL, and Stripe. Designed to be integrated into any Next.js application as a reusable addon.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

### 🛍️ Customer Features

- **Product Catalog**: Browse products with advanced filtering and search
- **Product Details**: View detailed product information with images, variants, and reviews
- **Shopping Cart**: Add products to cart with quantity management
- **Guest Checkout**: Shop without account creation (session-based cart)
- **Order Management**: View order history and track orders
- **Coupon System**: Apply discount coupons (percentage, fixed, free shipping)
- **Product Reviews**: Rate and review purchased products
- **Wishlist**: Save products for later
- **Responsive Design**: Works beautifully on all devices

### 🔧 Technical Features

- **Product Variants**: Support for product options (size, color, etc.)
- **Inventory Management**: Real-time stock tracking
- **Payment Processing**: Stripe integration with PaymentIntents
- **Authentication**: NextAuth with credential provider
- **Multi-role System**: Customer, Admin, and Vendor roles
- **Image Management**: Multiple product images with ordering
- **Category Hierarchy**: Nested category support
- **Order Status Tracking**: From pending to delivered
- **Address Management**: Multiple shipping/billing addresses

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account (for payments)

### Installation

1. **Clone or copy this addon into your project**:

   ```bash
   # If standalone
   git clone <your-repo-url>
   cd addon-ecommerce
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3001"
   NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

   # Stripe
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

4. **Setup database**:

   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Run migrations
   npm run prisma:migrate

   # Seed database with sample data (optional)
   npm run prisma:seed
   ```

5. **Start development server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3001](http://localhost:3001)

## Test Accounts

- **Admin**: admin@shop.com / admin123
- **Customer**: customer@shop.com / admin123

## Sample Products

**20 products** across 4 categories with realistic pricing and images:

### Electronics (7 products)

- Premium Wireless Headphones ($299.99)
- Smart Watch Pro ($399.99)
- Laptop Backpack Pro ($89.99)
- Mechanical Gaming Keyboard ($149.99)
- Wireless Mouse Ergonomic ($39.99)
- Bluetooth Speaker Portable ($89.99)
- Smart LED Light Bulb ($19.99)

### Clothing (5 products)

- Slim Fit Cotton T-Shirt ($29.99)
- Leather Wallet Bifold ($44.99)
- Denim Jacket Classic ($79.99)
- Canvas Tote Bag Large ($24.99)
- Sunglasses Polarized Sport ($59.99)

### Home & Living (4 products)

- Modern Table Lamp ($79.99)
- Ceramic Coffee Mug Set ($39.99)
- Throw Blanket Cozy ($54.99)
- Smart LED Light Bulb ($19.99)

### Sports & Outdoors (5 products)

- Yoga Mat Premium ($49.99)
- Running Shoes Ultra ($129.99)
- Stainless Steel Water Bottle ($34.99)
- Resistance Bands Set ($29.99)
- Sunglasses Polarized Sport ($59.99)

All products include:

- Multiple high-quality images
- Product variants (sizes, colors, etc.)
- Detailed descriptions
- Stock management
- Featured items marked

## 📚 API Documentation

### Customer APIs

#### Products
- `GET /api/products` - List products with filtering, search, pagination
- `GET /api/products/[id]` - Get product details

#### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart` - Add item to cart
- `PATCH /api/cart/[itemId]` - Update cart item quantity
- `DELETE /api/cart/[itemId]` - Remove item from cart

#### Checkout & Orders
- `POST /api/checkout` - Create order and Stripe payment intent
- `GET /api/orders` - List user's orders
- `GET /api/orders/[id]` - Get order details

#### Reviews
- `GET /api/reviews?productId=xxx` - Get product reviews
- `POST /api/reviews` - Create review
- `PATCH /api/reviews/[id]` - Update review
- `DELETE /api/reviews/[id]` - Delete review

#### Wishlist
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist?productId=xxx` - Remove from wishlist

#### Addresses
- `GET /api/addresses` - List user addresses
- `POST /api/addresses` - Create address
- `PATCH /api/addresses/[id]` - Update address
- `DELETE /api/addresses/[id]` - Delete address

### Admin APIs

#### Products Management
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product

#### Orders Management
- `GET /api/admin/orders` - List all orders
- `PATCH /api/admin/orders/[id]` - Update order status

#### Coupons Management
- `GET /api/admin/coupons` - List coupons
- `POST /api/admin/coupons` - Create coupon

## 🏗️ Architecture

### Database Schema

The addon uses a comprehensive Prisma schema with 13 models:

- **User & Auth**: User, Account, Session, VerificationToken
- **Products**: Product, ProductImage, ProductOption, ProductVariant, Category
- **Shopping**: Cart, CartItem, Order, OrderItem
- **Features**: Review, WishlistItem, Coupon, Address

### Key Features

✅ **Input Validation** - Zod schemas for all API endpoints  
✅ **Database Transactions** - Atomic operations for checkout  
✅ **Performance Optimized** - Indexed queries, no N+1 problems  
✅ **Guest Checkout** - Session-based cart for non-authenticated users  
✅ **Role-Based Access** - Customer, Admin, Vendor roles  
✅ **Stripe Integration** - PaymentIntents API  
✅ **Stock Management** - Real-time inventory tracking  
✅ **Coupon System** - Percentage, fixed, and free shipping discounts  

## 🔧 Integration Guide

### Integrating into Existing Next.js App

1. **Copy the addon files**:
   ```bash
   cp -r addon-ecommerce/app/api/* your-app/app/api/
   cp -r addon-ecommerce/lib/* your-app/lib/
   cp addon-ecommerce/prisma/schema.prisma your-app/prisma/
   ```

2. **Merge dependencies** into your `package.json`:
   ```json
   {
     "dependencies": {
       "@prisma/client": "^5.22.0",
       "stripe": "^20.1.0",
       "next-auth": "^4.24.13",
       "zod": "^4.3.5"
     }
   }
   ```

3. **Run migrations**:
   ```bash
   npx prisma migrate dev
   ```

4. **Configure authentication** - Ensure NextAuth is set up with the provided `lib/auth.ts`

5. **Add environment variables** as shown in Quick Start

## 🧪 Testing

Run the seeder to populate test data:

```bash
npm run prisma:seed
```

This creates:
- 2 test users (admin and customer)
- 20 sample products across 4 categories
- Product variants, images, and reviews

## 📦 Production Deployment

### Database Indexes

Run the index migration for production performance:

```bash
npx prisma migrate deploy
```

### Environment Variables

Ensure all production environment variables are set:
- Use production Stripe keys
- Set secure `NEXTAUTH_SECRET`
- Configure production `DATABASE_URL`
- Set `NEXTAUTH_URL` to your domain

### Recommended Optimizations

- Enable Prisma connection pooling
- Configure Redis for session storage (optional)
- Set up CDN for product images
- Enable rate limiting on API routes

## 🤝 Contributing

This is a standalone, reusable addon. Feel free to customize for your needs.

## 📄 License

MIT License - feel free to use in your projects.

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [NextAuth.js Documentation](https://next-auth.js.org/)
