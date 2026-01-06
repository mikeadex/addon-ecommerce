# Stripe Payment Setup Guide

## Quick Setup (5 Minutes)

### 1. Get Your Stripe Keys

1. **Sign up for Stripe** (if you haven't already):
   - Visit https://dashboard.stripe.com/register
   - Complete the registration

2. **Get your API keys**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)

3. **Add keys to your `.env` file**:
   ```env
   STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
   ```

### 2. Test the Integration

That's it! Your payment system is ready. The checkout flow will:
- ✅ Create orders in your database
- ✅ Generate Stripe PaymentIntents
- ✅ Handle inventory deduction
- ✅ Clear the cart after successful orders

### 3. Test Cards

Use these test cards in your checkout:

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Declined |
| 4000 0025 0000 3155 | Requires authentication |

**Expiry**: Any future date  
**CVC**: Any 3 digits  
**ZIP**: Any 5 digits

## Going Live

### 1. Activate Your Account

1. Go to https://dashboard.stripe.com/settings/account
2. Complete the business verification
3. Add bank account details

### 2. Switch to Production Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Toggle to "Production" mode
3. Copy your production keys
4. Update your `.env` file:
   ```env
   STRIPE_SECRET_KEY="sk_live_your_live_secret_key"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_live_publishable_key"
   ```

### 3. Set Up Webhooks (Optional but Recommended)

Webhooks notify your app when payments succeed or fail:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the webhook signing secret
6. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
   ```

## Current Implementation

The checkout flow is already implemented:

```typescript
// When user clicks "Place Order":
1. Validates cart and stock
2. Applies coupon codes (if any)
3. Creates Stripe PaymentIntent
4. Creates order in database
5. Reduces product inventory
6. Clears the cart
7. Returns order confirmation
```

## Customization

### Change Currency

Edit `/app/api/checkout/route.ts`:
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(total * 100),
  currency: 'usd', // Change to 'eur', 'gbp', etc.
  // ...
});
```

### Add Payment Methods

Stripe supports multiple payment methods:
- Credit/Debit Cards (already enabled)
- Apple Pay
- Google Pay
- ACH Direct Debit
- And more...

Enable them in your Stripe Dashboard → Settings → Payment methods

## Troubleshooting

### "Invalid API Key"
- Check that your keys are correctly copied to `.env`
- Restart your dev server after updating `.env`

### "Payment Intent Creation Failed"
- Verify your Stripe account is active
- Check that you're using test keys in development

### Orders Created but Payment Not Processed
- This is normal in test mode
- Use test cards to simulate payments
- Check Stripe Dashboard → Payments to see test transactions

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test your integration: https://dashboard.stripe.com/test/payments
