# Addon Responsibilities & Feature Ownership

This document clarifies which addon handles specific functionalities when using `addon-auth` and `addon-ecommerce` together.

## Core Responsibilities

### addon-auth
**Primary Focus:** User authentication, authorization, and account management

**Handles:**
- ✅ User registration & login
- ✅ Password management (reset, change)
- ✅ Email verification
- ✅ OAuth providers (Google, GitHub)
- ✅ Session management
- ✅ Role-based access control (RBAC)
- ✅ User profile management
- ✅ Two-factor authentication (2FA)
- ✅ Audit logs (security events)
- ✅ User dashboard
- ✅ Admin user management

### addon-ecommerce
**Primary Focus:** E-commerce functionality and business logic

**Handles:**
- ✅ Product catalog management
- ✅ Shopping cart operations
- ✅ Order processing
- ✅ Payment integration (Stripe)
- ✅ Inventory management
- ✅ Product reviews
- ✅ Wishlist functionality
- ✅ Coupon/discount system
- ✅ Category management
- ✅ Address management (shipping/billing)
- ✅ Order status tracking
- ✅ Admin product/order management

---

## Advanced Features Ownership

### 1. Transaction Notifications

**Owner:** `addon-ecommerce` ✅

**Rationale:** Transaction notifications are directly tied to e-commerce business events (orders, payments, shipping).

**Implementation Location:**
```
addon-ecommerce/
├── lib/
│   └── notifications/
│       ├── email.ts          # Email notifications
│       ├── sms.ts            # SMS notifications (optional)
│       └── templates/
│           ├── order-confirmation.tsx
│           ├── order-shipped.tsx
│           ├── order-delivered.tsx
│           ├── payment-received.tsx
│           └── refund-processed.tsx
├── app/api/
│   └── webhooks/
│       └── stripe/
│           └── route.ts      # Stripe webhook handler
```

**Notification Types:**
- Order confirmation
- Payment received
- Order shipped
- Order delivered
- Refund processed
- Low stock alerts (admin)
- New review notification (admin)

**Integration with addon-auth:**
- Uses user email from addon-auth User model
- Respects user notification preferences (if stored in Profile)
- Can trigger audit logs for important transactions

**Example Implementation:**
```typescript
// lib/notifications/email.ts
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function sendOrderConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { product: true } },
      shippingAddress: true,
    },
  });

  if (!order?.user?.email) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: order.user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: generateOrderConfirmationHTML(order),
  });

  // Optional: Log to addon-auth audit log
  await prisma.auditLog.create({
    data: {
      userId: order.userId!,
      action: 'ORDER_CONFIRMATION_SENT',
      metadata: { orderId, orderNumber: order.orderNumber },
    },
  });
}
```

---

### 2. Abandoned Cart Recovery

**Owner:** `addon-ecommerce` ✅

**Rationale:** Cart abandonment is an e-commerce-specific feature tied to shopping cart data and conversion optimization.

**Implementation Location:**
```
addon-ecommerce/
├── lib/
│   └── cart-recovery/
│       ├── detector.ts       # Detect abandoned carts
│       ├── scheduler.ts      # Schedule recovery emails
│       └── templates/
│           ├── cart-reminder-1.tsx  # First reminder (1 hour)
│           ├── cart-reminder-2.tsx  # Second reminder (24 hours)
│           └── cart-reminder-3.tsx  # Final reminder (3 days)
├── app/api/
│   └── cron/
│       └── abandoned-carts/
│           └── route.ts      # Cron job endpoint
```

**Algorithm Components:**

**1. Detection Logic:**
```typescript
// lib/cart-recovery/detector.ts
export async function detectAbandonedCarts() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // Find carts that:
  // - Have items
  // - Haven't been updated in 1+ hours
  // - Belong to registered users (have email)
  // - Haven't been converted to orders
  // - Haven't received recovery email yet (or last email was >24h ago)
  
  const abandonedCarts = await prisma.cart.findMany({
    where: {
      updatedAt: {
        gte: threeDaysAgo,  // Not too old
        lte: oneHourAgo,    // Not too recent
      },
      userId: { not: null }, // Only registered users
      items: {
        some: {},           // Has items
      },
      // Check if cart was converted to order
      NOT: {
        user: {
          orders: {
            some: {
              createdAt: {
                gte: oneHourAgo,
              },
            },
          },
        },
      },
    },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: { images: true },
          },
        },
      },
    },
  });

  return abandonedCarts;
}
```

**2. Recovery Email Scheduler:**
```typescript
// lib/cart-recovery/scheduler.ts
export async function scheduleRecoveryEmails() {
  const abandonedCarts = await detectAbandonedCarts();

  for (const cart of abandonedCarts) {
    const timeSinceUpdate = Date.now() - cart.updatedAt.getTime();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const threeDays = 3 * oneDay;

    // Get last recovery email sent
    const lastEmail = await prisma.cartRecoveryEmail.findFirst({
      where: { cartId: cart.id },
      orderBy: { sentAt: 'desc' },
    });

    const timeSinceLastEmail = lastEmail 
      ? Date.now() - lastEmail.sentAt.getTime() 
      : Infinity;

    // First reminder: 1 hour after abandonment
    if (timeSinceUpdate >= oneHour && timeSinceUpdate < oneDay && !lastEmail) {
      await sendRecoveryEmail(cart, 'REMINDER_1');
    }
    
    // Second reminder: 24 hours after abandonment
    else if (timeSinceUpdate >= oneDay && timeSinceUpdate < threeDays && 
             (!lastEmail || lastEmail.emailType === 'REMINDER_1')) {
      await sendRecoveryEmail(cart, 'REMINDER_2');
    }
    
    // Final reminder: 3 days after abandonment
    else if (timeSinceUpdate >= threeDays && 
             (!lastEmail || lastEmail.emailType === 'REMINDER_2')) {
      await sendRecoveryEmail(cart, 'REMINDER_3');
    }
  }
}

async function sendRecoveryEmail(cart: any, emailType: string) {
  // Generate unique recovery link
  const recoveryToken = generateSecureToken();
  
  await prisma.cartRecoveryEmail.create({
    data: {
      cartId: cart.id,
      emailType,
      sentAt: new Date(),
      recoveryToken,
    },
  });

  // Send email with cart items and recovery link
  await sendEmail({
    to: cart.user.email,
    subject: getSubjectForEmailType(emailType),
    html: generateRecoveryEmailHTML(cart, recoveryToken, emailType),
  });
}
```

**3. Cron Job Setup:**
```typescript
// app/api/cron/abandoned-carts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scheduleRecoveryEmails } from '@/lib/cart-recovery/scheduler';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await scheduleRecoveryEmails();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Abandoned cart recovery error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

**4. Database Schema Addition:**
```prisma
// Add to addon-ecommerce schema
model CartRecoveryEmail {
  id            String   @id @default(cuid())
  cartId        String
  emailType     String   // REMINDER_1, REMINDER_2, REMINDER_3
  sentAt        DateTime @default(now())
  recoveryToken String   @unique
  clickedAt     DateTime?
  convertedAt   DateTime?
  
  cart          Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  
  @@index([cartId])
  @@index([recoveryToken])
}
```

**5. Cron Schedule (Vercel Cron or external):**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/abandoned-carts",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

**Recovery Email Features:**
- Personalized cart summary
- Product images and prices
- One-click cart recovery link
- Optional discount code incentive
- Urgency messaging (stock running low)
- Mobile-responsive design

---

### 3. Email System Architecture

**Shared Infrastructure:**
Both addons can use the same email service configuration:

```env
# Shared email config
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourapp.com"
```

**Email Types by Addon:**

**addon-auth emails:**
- Welcome email
- Email verification
- Password reset
- Login alerts
- 2FA codes
- Account changes

**addon-ecommerce emails:**
- Order confirmation
- Payment received
- Shipping updates
- Delivery confirmation
- Review requests
- Abandoned cart recovery
- Low stock alerts (admin)
- Promotional emails

---

### 4. Other Advanced Features

#### Recommendation Engine
**Owner:** `addon-ecommerce` ✅
- Product recommendations
- "Customers also bought"
- Personalized suggestions
- Based on order history and browsing

#### Analytics & Reporting
**Owner:** Both (separate concerns)
- **addon-auth:** User analytics, login patterns, security metrics
- **addon-ecommerce:** Sales analytics, conversion rates, revenue reports

#### Loyalty/Rewards Program
**Owner:** `addon-ecommerce` ✅
- Points system
- Reward tiers
- Redemption logic
- Special offers for loyal customers

#### Inventory Alerts
**Owner:** `addon-ecommerce` ✅
- Low stock notifications
- Out of stock alerts
- Restock notifications to customers
- Supplier reorder suggestions

#### Review Moderation
**Owner:** `addon-ecommerce` (with addon-auth roles) ✅
- Review approval workflow
- Spam detection
- User with MODERATOR role can approve/reject
- Admin can manage all reviews

#### Shipping Integration
**Owner:** `addon-ecommerce` ✅
- Shipping rate calculation
- Label generation
- Tracking integration
- Carrier APIs (USPS, FedEx, UPS)

#### Tax Calculation
**Owner:** `addon-ecommerce` ✅
- Tax rate lookup by location
- Tax exemption handling
- Integration with tax services (TaxJar, Avalara)

#### Multi-currency Support
**Owner:** `addon-ecommerce` ✅
- Currency conversion
- Price display in local currency
- Payment processing in multiple currencies

#### Subscription Products
**Owner:** `addon-ecommerce` ✅
- Recurring billing
- Subscription management
- Stripe Subscriptions integration
- Auto-renewal handling

---

## Implementation Priority

### Phase 1: Core Features (Completed ✅)
- Authentication (addon-auth)
- Product catalog (addon-ecommerce)
- Shopping cart (addon-ecommerce)
- Checkout & orders (addon-ecommerce)
- Basic admin panels (both)

### Phase 2: Essential Notifications
1. **Order confirmation emails** (addon-ecommerce)
2. **Shipping notifications** (addon-ecommerce)
3. **Payment confirmations** (addon-ecommerce)

### Phase 3: Conversion Optimization
1. **Abandoned cart recovery** (addon-ecommerce)
2. **Product recommendations** (addon-ecommerce)
3. **Review request emails** (addon-ecommerce)

### Phase 4: Advanced Features
1. **Loyalty program** (addon-ecommerce)
2. **Advanced analytics** (both)
3. **Subscription products** (addon-ecommerce)
4. **Multi-currency** (addon-ecommerce)

---

## Communication Between Addons

### Event-Driven Architecture (Recommended)

Create a shared event system:

```typescript
// lib/events/emitter.ts
import { EventEmitter } from 'events';

export const appEvents = new EventEmitter();

// Event types
export enum AppEvent {
  // Auth events
  USER_REGISTERED = 'user.registered',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  
  // Ecommerce events
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  CART_ABANDONED = 'cart.abandoned',
  REVIEW_CREATED = 'review.created',
}

// Usage in addon-ecommerce
appEvents.emit(AppEvent.ORDER_CREATED, { orderId, userId });

// Listener in notification system
appEvents.on(AppEvent.ORDER_CREATED, async (data) => {
  await sendOrderConfirmation(data.orderId);
});
```

---

## Summary

| Feature | Owner | Location |
|---------|-------|----------|
| User Authentication | addon-auth | `/auth/*` |
| Transaction Notifications | addon-ecommerce | `/lib/notifications/*` |
| Abandoned Cart Recovery | addon-ecommerce | `/lib/cart-recovery/*` |
| Order Management | addon-ecommerce | `/admin/orders/*` |
| User Management | addon-auth | `/admin/users/*` |
| Email Verification | addon-auth | `/auth/verify/*` |
| Payment Processing | addon-ecommerce | `/api/checkout/*` |
| Product Recommendations | addon-ecommerce | `/lib/recommendations/*` |
| Security Audit Logs | addon-auth | `/admin/audit-logs/*` |
| Sales Analytics | addon-ecommerce | `/admin/analytics/*` |

**Key Principle:** 
- **addon-auth** = User identity & security
- **addon-ecommerce** = Business logic & transactions

Both addons can share infrastructure (email service, database) but maintain clear separation of concerns! 🎯
