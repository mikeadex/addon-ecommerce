# Integration Guide

## Overview

This e-commerce addon is designed to be a **standalone, plug-and-play module** that can be integrated into any Next.js application. It provides a complete e-commerce backend with minimal setup required.

## Integration Steps

### 1. File Structure

Copy the following directories into your Next.js project:

```
your-project/
├── app/
│   └── api/
│       ├── products/
│       ├── cart/
│       ├── checkout/
│       ├── orders/
│       ├── reviews/
│       ├── wishlist/
│       ├── addresses/
│       └── admin/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── validations.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── types/
    └── next-auth.d.ts
```

### 2. Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.22.0",
    "@stripe/stripe-js": "^8.6.0",
    "bcrypt": "^6.0.0",
    "next-auth": "^4.24.13",
    "stripe": "^20.1.0",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "prisma": "^5.22.0",
    "tsx": "^4.21.0"
  }
}
```

### 3. Environment Configuration

Add these variables to your `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# Optional: Seed with sample data
npx prisma db seed
```

### 5. Authentication Setup

The addon uses NextAuth.js. If you already have NextAuth configured:

1. Merge the `authOptions` from `lib/auth.ts` with your existing config
2. Ensure the User model includes the `role` field
3. Update your session callback to include `user.id` and `user.role`

If you don't have NextAuth:

1. Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 6. TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## API Usage Examples

### Adding to Cart

```typescript
const response = await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'product-id',
    quantity: 1,
    variantId: 'variant-id' // optional
  })
});
```

### Creating an Order

```typescript
const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shippingAddressId: 'address-id',
    billingAddressId: 'address-id', // optional
    couponCode: 'SAVE10', // optional
    paymentMethod: 'CARD'
  })
});

const { order, clientSecret } = await response.json();
// Use clientSecret with Stripe Elements to complete payment
```

### Fetching Products

```typescript
const response = await fetch('/api/products?page=1&limit=12&category=electronics&search=laptop');
const { products, pagination } = await response.json();
```

## Customization

### Adding Custom Fields

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev`
3. Update validation schemas in `lib/validations.ts`
4. Modify API routes as needed

### Extending User Roles

Add new roles to the `Role` enum in `schema.prisma`:

```prisma
enum Role {
  CUSTOMER
  ADMIN
  VENDOR
  MANAGER  // new role
}
```

### Custom Shipping Logic

Update the shipping calculation in `app/api/checkout/route.ts`:

```typescript
// Replace this simple logic
const shippingCost = subtotal > 100 ? 0 : 10;

// With your custom logic
const shippingCost = calculateShipping(cart, shippingAddress);
```

## Security Considerations

1. **API Routes**: All admin routes check for `role === 'ADMIN'`
2. **Input Validation**: All endpoints use Zod schemas
3. **SQL Injection**: Prisma provides parameterized queries
4. **Session Security**: Use secure cookies in production
5. **Rate Limiting**: Consider adding rate limiting middleware

## Performance Tips

1. **Database Indexes**: Run the index migration for production
2. **Caching**: Consider Redis for frequently accessed data
3. **Image Optimization**: Use Next.js Image component
4. **Connection Pooling**: Configure Prisma connection pool

## Troubleshooting

### TypeScript Errors with NextAuth

The `session.user` type errors are due to NextAuth v4 type inference. These won't affect runtime. To fix:

```typescript
// In your API routes
const session = await getServerSession(authOptions);
const userId = session?.user?.id as string | undefined;
```

### Database Connection Issues

Ensure your `DATABASE_URL` is correct and the database is accessible:

```bash
npx prisma db pull  # Test connection
```

### Stripe Webhook Setup

For production, set up Stripe webhooks to handle payment confirmations:

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  
  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
  
  if (event.type === 'payment_intent.succeeded') {
    // Update order status
  }
  
  return new Response(JSON.stringify({ received: true }));
}
```

## Support

For issues or questions:
1. Check the README.md
2. Review the API documentation
3. Examine the seed.ts file for usage examples
