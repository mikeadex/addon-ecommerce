import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { updateOrderStatusSchema } from '@/lib/validations';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateOrderStatusSchema.parse(body);

    const updateData: any = { ...validatedData };

    if (validatedData.status === 'SHIPPED' && !updateData.shippedAt) {
      updateData.shippedAt = new Date();
    }
    if (validatedData.status === 'DELIVERED' && !updateData.deliveredAt) {
      updateData.deliveredAt = new Date();
    }
    if (validatedData.status === 'CANCELLED' && !updateData.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
