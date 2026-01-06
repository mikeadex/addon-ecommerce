import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Get cart
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const sessionId = request.cookies.get('cart_session_id')?.value;

    if (!session?.user?.email && !sessionId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const cart = await prisma.cart.findFirst({
      where: session?.user?.email
        ? { userId: session.user.email }
        : { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  orderBy: { order: 'asc' },
                },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      return NextResponse.json({ items: [], total: 0 });
    }

    // Calculate totals
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return NextResponse.json({
      items: cart.items,
      subtotal,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// Add to cart
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let sessionId = request.cookies.get('cart_session_id')?.value;

    // Generate session ID for guest users
    if (!session?.user?.email && !sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    const body = await request.json();
    const { productId, variantId, quantity = 1 } = body;

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: variantId ? { where: { id: variantId } } : false,
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const variant = variantId ? product.variants?.[0] : null;
    const price = variant?.price || product.price;

    // Check stock
    const availableStock = variant?.quantity || product.quantity;
    if (availableStock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      );
    }

    // Find or create cart
    let cart = await prisma.cart.findFirst({
      where: session?.user?.email
        ? { userId: session.user.email }
        : { sessionId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session?.user?.email,
          sessionId: !session?.user?.email ? sessionId : null,
        },
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (availableStock < newQuantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for requested quantity' },
          { status: 400 }
        );
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId,
          quantity,
          price,
        },
      });
    }

    const response = NextResponse.json({ success: true });

    // Set session cookie for guest users
    if (!session?.user?.email && sessionId) {
      response.cookies.set('cart_session_id', sessionId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add to cart' },
      { status: 500 }
    );
  }
}
