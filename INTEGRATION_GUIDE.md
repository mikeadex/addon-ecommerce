# Integration Guide: addon-auth + addon-ecommerce

This guide shows how to integrate the `addon-auth` authentication module with the `addon-ecommerce` module for seamless user management and authentication.

## Overview

**addon-auth** provides:
- Email/Password authentication
- OAuth (Google, GitHub)
- Email verification
- Password reset
- 2FA ready
- Role-based access (User, Moderator, Admin)
- User & Admin dashboards
- Profile management

**addon-ecommerce** requires:
- User authentication for checkout
- Admin authentication for dashboard
- Role-based access control
- Session management
- User ID for orders, reviews, addresses

## Integration Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   addon-auth    │────────▶│ addon-ecommerce  │
│                 │         │                  │
│ - Login/Logout  │         │ - Shop           │
│ - Registration  │         │ - Cart           │
│ - User Profile  │         │ - Checkout       │
│ - Admin Panel   │         │ - Orders         │
│ - RBAC          │         │ - Admin Products │
└─────────────────┘         └──────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
            ┌─────────────────┐
            │  Shared Database │
            │  - Users         │
            │  - Sessions      │
            │  - Orders        │
            │  - Products      │
            └─────────────────┘
```

## Step-by-Step Integration

### 1. Database Schema Alignment

Both addons need to share the same User model. Merge the Prisma schemas:

**In your main `prisma/schema.prisma`:**

```prisma
// From addon-auth
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  password      String?
  image         String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // addon-auth relations
  accounts      Account[]
  sessions      Session[]
  profile       Profile?
  auditLogs     AuditLog[]

  // addon-ecommerce relations
  orders        Order[]
  reviews       Review[]
  addresses     Address[]
  wishlistItems WishlistItem[]
  carts         Cart[]

  @@index([email])
}

enum UserRole {
  USER        // Maps to CUSTOMER in ecommerce
  MODERATOR   // Can moderate reviews
  ADMIN       // Full access to both addons
}

// addon-auth models
model Account { /* ... */ }
model Session { /* ... */ }
model Profile { /* ... */ }
model AuditLog { /* ... */ }

// addon-ecommerce models
model Product { /* ... */ }
model Order { /* ... */ }
model Cart { /* ... */ }
// ... rest of ecommerce models
```

**Key Changes:**
- Use `USER` instead of `CUSTOMER` role (or map them)
- Add ecommerce relations to User model
- Keep all addon-auth models
- Keep all addon-ecommerce models

### 2. Shared NextAuth Configuration

Create a shared auth configuration that both addons use:

**`lib/auth.ts` (shared):**

```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',      // addon-auth login page
    signOut: '/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
          throw new Error('Account is disabled');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Update token on session update
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      // Log sign-in event (addon-auth audit log)
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'SIGN_IN',
          ipAddress: '',
          userAgent: '',
        },
      });
    },
  },
};
```

### 3. Update Environment Variables

Merge environment variables from both addons:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# NextAuth (shared)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (addon-auth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"

# Email (addon-auth)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourapp.com"

# Stripe (addon-ecommerce)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Update Routing Structure

Organize routes to avoid conflicts:

```
app/
├── (auth)/                    # addon-auth routes
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── verify-email/
│   └── profile/
├── (admin)/                   # Shared admin layout
│   ├── layout.tsx            # Admin auth check
│   ├── users/                # addon-auth admin
│   ├── products/             # addon-ecommerce admin
│   ├── orders/               # addon-ecommerce admin
│   └── coupons/              # addon-ecommerce admin
├── shop/                      # addon-ecommerce
├── cart/                      # addon-ecommerce
├── checkout/                  # addon-ecommerce
├── orders/                    # addon-ecommerce (user)
└── api/
    ├── auth/                  # NextAuth (shared)
    ├── users/                 # addon-auth
    ├── products/              # addon-ecommerce
    ├── cart/                  # addon-ecommerce
    ├── checkout/              # addon-ecommerce
    └── admin/                 # Both addons
        ├── users/             # addon-auth
        ├── products/          # addon-ecommerce
        └── orders/            # addon-ecommerce
```

### 5. Role Mapping

Map roles between the two addons:

**In ecommerce APIs:**

```typescript
// Map addon-auth roles to ecommerce roles
const roleMap = {
  USER: 'CUSTOMER',
  MODERATOR: 'CUSTOMER', // or 'VENDOR' if you add that
  ADMIN: 'ADMIN',
};

// In API routes
const session = await getServerSession(authOptions);
const ecommerceRole = roleMap[session.user.role] || 'CUSTOMER';

// Check admin access
const isAdmin = session.user.role === 'ADMIN';
```

### 6. Update Header Component

Link to addon-auth pages:

```typescript
// components/Header.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ShoppingCart, User, LogOut } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const [cartCount, setCartCount] = useState(0);

  // ... cart count logic

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/">ShopHub</Link>

          <nav className="flex items-center gap-6">
            <Link href="/shop">Shop</Link>
            {session && <Link href="/orders">Orders</Link>}
            {session?.user?.role === 'ADMIN' && (
              <Link href="/admin">Admin</Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative">
              <ShoppingCart />
              {cartCount > 0 && (
                <span className="badge">{cartCount}</span>
              )}
            </Link>

            {session ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <User />
                </Link>
                <button onClick={() => signOut()}>
                  <LogOut />
                </button>
              </div>
            ) : (
              <Link href="/login">
                <User />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
```

### 7. Checkout Flow Integration

Update checkout to work with addon-auth:

```typescript
// app/checkout/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/checkout');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  // Rest of checkout logic
  return (
    <div>
      {/* Checkout form */}
    </div>
  );
}
```

### 8. Admin Dashboard Integration

Create a shared admin layout:

```typescript
// app/(admin)/layout.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login?callbackUrl=/admin');
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Admin Sidebar with both addons:**

```typescript
// components/AdminSidebar.tsx
import Link from 'next/link';
import { Users, Package, ShoppingBag, Tag, Settings } from 'lucide-react';

export default function AdminSidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white">
      <div className="p-4">
        <h2 className="text-xl font-bold">Admin Panel</h2>
      </div>
      <nav className="space-y-1">
        {/* addon-auth */}
        <Link href="/admin/users" className="nav-link">
          <Users /> Users
        </Link>
        <Link href="/admin/audit-logs" className="nav-link">
          <Settings /> Audit Logs
        </Link>

        {/* addon-ecommerce */}
        <Link href="/admin/products" className="nav-link">
          <Package /> Products
        </Link>
        <Link href="/admin/orders" className="nav-link">
          <ShoppingBag /> Orders
        </Link>
        <Link href="/admin/coupons" className="nav-link">
          <Tag /> Coupons
        </Link>
      </nav>
    </aside>
  );
}
```

### 9. Migration Steps

**Step 1: Clone addon-auth**
```bash
git clone https://github.com/mikeadex/addon-auth.git
```

**Step 2: Merge Prisma Schemas**
```bash
# Copy addon-auth models to your schema
# Add ecommerce relations to User model
# Run migration
npx prisma migrate dev --name merge-auth-ecommerce
```

**Step 3: Copy Auth Files**
```bash
# From addon-auth, copy:
# - app/(auth)/* pages
# - app/api/auth/* (if custom)
# - components/auth/*
# - lib/email.ts (if using email)
```

**Step 4: Update Imports**
```bash
# Update all imports to use shared auth config
# Replace local auth.ts with shared version
```

**Step 5: Seed Database**
```bash
# Merge seed scripts from both addons
npm run prisma:seed
```

**Step 6: Test Integration**
```bash
npm run dev
# Test login flow
# Test checkout flow
# Test admin access
```

## API Alignment

### Authentication Check Pattern

Both addons should use the same pattern:

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // API logic
}
```

### Admin Check Pattern

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin API logic
}
```

## Testing the Integration

### 1. Test Authentication Flow
```bash
# Visit /login (addon-auth)
# Login with test credentials
# Verify session is created
# Check that user ID is in session
```

### 2. Test Ecommerce Flow
```bash
# Browse /shop
# Add items to cart
# Go to /checkout
# Should redirect to /login if not authenticated
# After login, should return to checkout
# Complete purchase
# View order at /orders
```

### 3. Test Admin Flow
```bash
# Login as admin
# Visit /admin
# Should see both auth and ecommerce admin sections
# Test user management (addon-auth)
# Test product management (addon-ecommerce)
# Test order management (addon-ecommerce)
```

## Troubleshooting

### Session not persisting
- Check NEXTAUTH_SECRET is set
- Verify both addons use same authOptions
- Check cookie domain settings

### User ID not in session
- Verify JWT callback includes user.id
- Check session callback maps token.id to session.user.id

### Admin access denied
- Verify user has role: 'ADMIN' in database
- Check role is included in JWT token
- Verify admin check uses correct role name

### Cart not merging after login
- Check cart API handles both session ID and user ID
- Verify login callback migrates guest cart

## Best Practices

1. **Single Source of Truth**: Use addon-auth for all authentication
2. **Shared Configuration**: Both addons use same NextAuth config
3. **Consistent Roles**: Map roles clearly between addons
4. **Unified Admin**: Single admin panel for both addons
5. **Session Management**: Use JWT strategy for stateless sessions
6. **Error Handling**: Consistent error messages across addons
7. **Audit Logging**: Log important ecommerce actions to addon-auth audit log

## Summary

Integration checklist:
- ✅ Merge Prisma schemas (User model + relations)
- ✅ Share NextAuth configuration
- ✅ Update environment variables
- ✅ Organize routes to avoid conflicts
- ✅ Map roles between addons
- ✅ Update header to use addon-auth login
- ✅ Protect checkout with authentication
- ✅ Create unified admin dashboard
- ✅ Test complete user flow
- ✅ Test admin functionality

With this integration, you get:
- Professional authentication system (addon-auth)
- Complete ecommerce functionality (addon-ecommerce)
- Unified user experience
- Single admin dashboard
- Shared user database
- Seamless session management

Both addons work together as a cohesive system! 🚀
