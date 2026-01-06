import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionId = request.cookies.get('cart_session_id')?.value;

    if (!session?.user?.email && !sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      shippingAddressId,
      billingAddressId,
      couponCode,
      paymentMethod = 'CARD',
    } = body;

    // Get user cart
    const cart = await prisma.cart.findFirst({
      where: session?.user?.email
        ? { userId: session.user.email }
        : { sessionId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      const availableStock = item.variant?.quantity || item.product.quantity;
      if (availableStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.product.name}`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    let subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    let discount = 0;
    let coupon = null;

    // Apply coupon if provided
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.isActive) {
        return NextResponse.json(
          { error: 'Invalid coupon code' },
          { status: 400 }
        );
      }

      // Check expiry
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Coupon has expired' },
          { status: 400 }
        );
      }

      // Check usage limit
      if (coupon.usageLimit) {
        const usageCount = await prisma.order.count({
          where: { couponId: coupon.id },
        });
        if (usageCount >= coupon.usageLimit) {
          return NextResponse.json(
            { error: 'Coupon usage limit reached' },
            { status: 400 }
          );
        }
      }

      // Check minimum order value
      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        return NextResponse.json(
          {
            error: `Minimum order value of $${coupon.minOrderValue} required`,
          },
          { status: 400 }
        );
      }

      // Calculate discount
      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      } else if (coupon.type === 'FIXED') {
        discount = coupon.value;
      }
    }

    // Calculate shipping (simplified - flat rate for now)
    const shippingCost =
      coupon?.type === 'FREE_SHIPPING' ? 0 : subtotal > 100 ? 0 : 10;

    const total = subtotal - discount + shippingCost;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: session?.user?.email || sessionId || '',
      },
    });

    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.email,
        sessionId: !session?.user?.email ? sessionId : null,
        orderNumber: `ORD-${Date.now()}`,
        status: 'PENDING',
        subtotal,
        discount,
        shippingCost,
        tax: 0, // TODO: Calculate tax based on address
        total,
        paymentMethod,
        paymentStatus: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        shippingAddressId,
        billingAddressId: billingAddressId || shippingAddressId,
        couponId: coupon?.id,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.product.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        coupon: true,
      },
    });

    // Reduce stock for all items
    for (const item of cart.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { quantity: { decrement: item.quantity } },
        });
      } else {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return NextResponse.json({
      order,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
