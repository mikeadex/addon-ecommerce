# E-Commerce Addon

A modern, full-featured e-commerce system built with Next.js 16, Prisma, PostgreSQL, and Stripe.

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

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Setup database** (already done):

   ```bash
   npm run prisma:generate
   ```

3. **Start development server**:

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
