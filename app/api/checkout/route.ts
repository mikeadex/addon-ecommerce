import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionId = request.cookies.get('cart_session_id')?.value;

    if (!session?.user?.id && !sessionId) {
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
      where: session?.user?.id
        ? { userId: session.user.id }
        : { sessionId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      let availableStock = item.product.quantity;
      
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        availableStock = variant?.quantity || 0;
      }
      
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
      if (coupon.endDate && coupon.endDate < new Date()) {
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
      if (coupon.minPurchase && subtotal < coupon.minPurchase) {
        return NextResponse.json(
          {
            error: `Minimum order value of $${coupon.minPurchase} required`,
          },
          { status: 400 }
        );
      }

      // Calculate discount
      if (coupon.discountType === 'PERCENTAGE') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, coupon.maxDiscount);
        }
      } else if (coupon.discountType === 'FIXED') {
        discount = coupon.discountValue;
      }
    }

    // Calculate shipping (simplified - flat rate for now)
    const shippingCost =
      coupon?.discountType === 'FREE_SHIPPING' ? 0 : subtotal > 100 ? 0 : 10;

    const total = subtotal - discount + shippingCost;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: session?.user?.id || sessionId || '',
      },
    });

    // Use transaction to ensure atomicity
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: session?.user?.id,
          orderNumber: `ORD-${Date.now()}`,
          status: 'PENDING',
          subtotal,
          discount,
          shipping: shippingCost,
          tax: 0,
          total,
          paymentMethod,
          paymentStatus: 'PENDING',
          paymentIntentId: paymentIntent.id,
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
              total: item.price * item.quantity,
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
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { quantity: { decrement: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
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
