# Setup Guide: Admin Settings & Notifications

This guide explains how to configure your e-commerce store using the new admin settings panel instead of editing `.env` files.

## Features Implemented

### 1. Admin Settings Panel
- **Location:** `/admin/settings`
- **Purpose:** Configure all API keys and settings through a user-friendly UI
- **Security:** Sensitive values (passwords, API keys) are encrypted in the database

### 2. Transaction Notifications
- Order confirmation emails
- Order shipped notifications
- Order delivered notifications
- All configurable via admin panel

### 3. Abandoned Cart Recovery
- Automatic detection of abandoned carts
- 3-tier email reminder system
- Customizable timing for each reminder
- Recovery link tracking and conversion analytics

## Quick Start

### Step 1: Access Admin Settings

1. Login as an admin user
2. Navigate to `/admin/settings`
3. You'll see three tabs:
   - **Email Settings** - SMTP configuration
   - **Payment Settings** - Stripe API keys
   - **Notifications** - Enable/disable features

### Step 2: Configure Email (SMTP)

**Required for notifications to work:**

1. Go to **Email Settings** tab
2. Fill in your SMTP details:
   - **SMTP Host:** `smtp.gmail.com` (for Gmail)
   - **SMTP Port:** `587` (or `465` for SSL)
   - **SMTP Username:** Your email address
   - **SMTP Password:** Your app password (not regular password!)
   - **From Email:** The email address that appears as sender

**Getting Gmail App Password:**
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate a new app password for "Mail"
5. Copy and paste it into the SMTP Password field

3. Click **Save Email Settings**

### Step 3: Configure Stripe (Optional)

If you haven't set Stripe keys in `.env`:

1. Go to **Payment Settings** tab
2. Fill in:
   - **Stripe Secret Key:** `sk_test_...` or `sk_live_...`
   - **Stripe Publishable Key:** `pk_test_...` or `pk_live_...`
   - **Stripe Webhook Secret:** `whsec_...` (from Stripe Dashboard)

3. Click **Save Stripe Settings**

### Step 4: Configure Notifications

1. Go to **Notifications** tab
2. Enable/disable features:

**Order Notifications:**
- ✅ Order Confirmation Email
- ✅ Order Shipped Email
- ✅ Order Delivered Email

**Abandoned Cart Recovery:**
- ✅ Enable Abandoned Cart Recovery
- Set timing for reminders:
  - First Reminder: `1` hour (default)
  - Second Reminder: `24` hours (default)
  - Final Reminder: `72` hours (default)

**Inventory Alerts:**
- ✅ Low Stock Alerts
- Set threshold: `10` units (default)

3. Click **Save Notification Settings**

## How It Works

### Settings Storage

- All settings are stored in the `system_settings` database table
- Sensitive values (passwords, API keys) are **encrypted** using AES-256
- Settings override `.env` values when present
- Fallback to `.env` if setting not found in database

### Email Notifications

When enabled, the system automatically sends emails for:

1. **Order Confirmation** - Sent immediately after order is placed
2. **Order Shipped** - Sent when order status changes to SHIPPED
3. **Order Delivered** - Sent when order status changes to DELIVERED

All emails are logged in the `email_logs` table for tracking.

### Abandoned Cart Recovery

**How it works:**

1. **Detection:** Cron job runs every hour checking for abandoned carts
2. **Criteria:** Cart is considered abandoned if:
   - Has items
   - Belongs to registered user (has email)
   - Not updated in X hours (configurable)
   - Not converted to order
   - No recent recovery email sent

3. **Email Schedule:**
   - **1st Reminder:** "You left something in your cart!"
   - **2nd Reminder:** "Still interested? Your cart is waiting!"
   - **3rd Reminder:** "Last chance! Your cart expires soon"

4. **Recovery Link:** Each email contains a unique recovery link
5. **Tracking:** System tracks:
   - When email was sent
   - When link was clicked
   - If cart was converted to order

### Cron Job Setup

**For Vercel (Automatic):**
- Already configured in `vercel.json`
- Runs every hour automatically
- No additional setup needed

**For Other Platforms:**

Set up a cron job to hit this endpoint every hour:
```bash
curl -X GET https://yoursite.com/api/cron/abandoned-carts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Add to your `.env`:
```env
CRON_SECRET=your-secure-random-string
```

**Manual Testing:**
```bash
# Test the cron job
curl -X GET http://localhost:3000/api/cron/abandoned-carts \
  -H "Authorization: Bearer your-cron-secret"
```

## Environment Variables

### Required (if not using admin settings)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ecommerce"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Settings Encryption (Important!)
SETTINGS_ENCRYPTION_KEY="your-32-character-encryption-key"

# Cron Security
CRON_SECRET="your-secure-cron-secret"
```

### Optional (can be configured via admin panel)

```env
# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourstore.com"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## Testing Notifications

### Test Order Confirmation

1. Place a test order
2. Check email inbox
3. Verify order confirmation email received
4. Check `/admin/settings` → Email Logs (coming soon)

### Test Abandoned Cart

1. Add items to cart (as logged-in user)
2. Leave cart for 1+ hours
3. Wait for cron job to run (or trigger manually)
4. Check email for recovery reminder
5. Click recovery link
6. Verify cart is restored

### View Email Logs

Query the database:
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

Or build an admin page to view logs (recommended).

## Troubleshooting

### Emails Not Sending

**Check:**
1. SMTP settings are correct in admin panel
2. SMTP password is an app password (not regular password)
3. Email logs table for error messages
4. Server logs for detailed errors

**Test SMTP connection:**
```bash
# In your project directory
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
});
transporter.verify().then(console.log).catch(console.error);
"
```

### Abandoned Cart Not Working

**Check:**
1. Cron job is running (check Vercel logs or server logs)
2. Abandoned cart feature is enabled in settings
3. Cart has registered user with email
4. Timing settings are correct
5. CRON_SECRET matches in `.env` and request header

**Manual trigger:**
```bash
curl -X GET http://localhost:3000/api/cron/abandoned-carts \
  -H "Authorization: Bearer your-cron-secret"
```

### Settings Not Saving

**Check:**
1. Logged in as ADMIN user
2. Database migration ran successfully
3. `system_settings` table exists
4. Browser console for errors
5. Server logs for API errors

## Security Best Practices

1. **Encryption Key:** Use a strong 32-character key for `SETTINGS_ENCRYPTION_KEY`
2. **Cron Secret:** Use a secure random string for `CRON_SECRET`
3. **HTTPS:** Always use HTTPS in production
4. **Admin Access:** Restrict admin panel to trusted users only
5. **Regular Backups:** Backup your database regularly

## Advanced Configuration

### Custom Email Templates

Edit email templates in:
- `lib/notifications/email.ts` - Order notifications
- `lib/notifications/abandoned-cart.ts` - Cart recovery emails

### Custom Notification Logic

Add new notification types:
1. Create function in `lib/notifications/email.ts`
2. Add setting toggle in admin panel
3. Call function from appropriate API route

### Analytics & Reporting

Build admin pages to view:
- Email delivery rates
- Cart recovery conversion rates
- Revenue from recovered carts
- Most abandoned products

Query `email_logs` and `cart_recovery_emails` tables.

## Summary

✅ **No more `.env` editing** - Configure everything through admin panel  
✅ **Secure** - Sensitive data encrypted in database  
✅ **User-friendly** - Simple UI for non-technical users  
✅ **Automated** - Notifications and cart recovery run automatically  
✅ **Trackable** - All emails logged for analytics  

Your e-commerce store now has enterprise-level notification and recovery features! 🎉
