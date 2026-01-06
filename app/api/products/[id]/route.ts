import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { 
        id: params.id,
        status: 'PUBLISHED',
        isDeleted: false,
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
        variants: {
          where: { isDeleted: false },
          include: {
            options: true,
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: { productId: params.id, isApproved: true },
      _avg: { rating: true },
      _count: true,
    });

    // Get related products
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'PUBLISHED',
        isDeleted: false,
      },
      include: {
        images: {
          take: 1,
          orderBy: { order: 'asc' },
        },
      },
      take: 4,
    });

    return NextResponse.json({
      ...product,
      averageRating: avgRating._avg.rating || 0,
      reviewCount: avgRating._count || 0,
      relatedProducts,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
