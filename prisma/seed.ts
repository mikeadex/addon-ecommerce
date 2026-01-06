import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shop.com' },
    update: {},
    create: {
      email: 'admin@shop.com',
      name: 'Shop Admin',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create customer user
  const customer = await prisma.user.upsert({
    where: { email: 'customer@shop.com' },
    update: {},
    create: {
      email: 'customer@shop.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'CUSTOMER',
      emailVerified: new Date(),
    },
  });
  console.log('✅ Customer user created:', customer.email);

  // Create categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800',
    },
  });

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
    },
  });

  const home = await prisma.category.upsert({
    where: { slug: 'home-living' },
    update: {},
    create: {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Home decor and essentials',
      image: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800',
    },
  });

  const sports = await prisma.category.upsert({
    where: { slug: 'sports-outdoors' },
    update: {},
    create: {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800',
    },
  });

  console.log('✅ Categories created');

  // Create products with variants
  const products = [
    {
      name: 'Premium Wireless Headphones',
      slug: 'premium-wireless-headphones',
      description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality. Perfect for music lovers and professionals.',
      price: 299.99,
      compareAtPrice: 399.99,
      sku: 'WH-001',
      quantity: 50,
      categoryId: electronics.id,
      status: 'ACTIVE' as const,
      featured: true,
      metaTitle: 'Premium Wireless Headphones - Noise Cancelling',
      metaDescription: 'Experience superior sound with our premium wireless headphones featuring active noise cancellation',
      images: [
        { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', altText: 'Headphones main view', position: 0 },
        { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800', altText: 'Headphones side view', position: 1 },
      ],
      options: [
        { name: 'Color', values: ['Black', 'Silver', 'Blue'], position: 0 },
      ],
    },
    {
      name: 'Slim Fit Cotton T-Shirt',
      slug: 'slim-fit-cotton-tshirt',
      description: '100% premium cotton t-shirt with a modern slim fit. Comfortable, breathable, and perfect for everyday wear.',
      price: 29.99,
      compareAtPrice: 49.99,
      sku: 'TS-001',
      quantity: 200,
      categoryId: clothing.id,
      status: 'ACTIVE' as const,
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', altText: 'T-shirt front', position: 0 },
      ],
      options: [
        { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'], position: 0 },
        { name: 'Color', values: ['White', 'Black', 'Navy', 'Gray'], position: 1 },
      ],
    },
    {
      name: 'Smart Watch Pro',
      slug: 'smart-watch-pro',
      description: 'Advanced fitness tracker and smartwatch with heart rate monitoring, GPS, and 7-day battery life. Compatible with iOS and Android.',
      price: 399.99,
      sku: 'SW-001',
      quantity: 75,
      categoryId: electronics.id,
      status: 'ACTIVE' as const,
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', altText: 'Smart watch', position: 0 },
      ],
      options: [
        { name: 'Band', values: ['Sport', 'Leather', 'Metal'], position: 0 },
      ],
    },
    {
      name: 'Modern Table Lamp',
      slug: 'modern-table-lamp',
      description: 'Minimalist LED table lamp with adjustable brightness and color temperature. Perfect for reading or ambient lighting.',
      price: 79.99,
      sku: 'HL-001',
      quantity: 100,
      categoryId: home.id,
      status: 'ACTIVE' as const,
      images: [
        { url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800', altText: 'Table lamp', position: 0 },
      ],
    },
    {
      name: 'Yoga Mat Premium',
      slug: 'yoga-mat-premium',
      description: 'Extra thick non-slip yoga mat with carrying strap. Perfect for yoga, pilates, and floor exercises.',
      price: 49.99,
      sku: 'YM-001',
      quantity: 150,
      categoryId: sports.id,
      status: 'ACTIVE' as const,
      images: [
        { url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', altText: 'Yoga mat', position: 0 },
      ],
      options: [
        { name: 'Color', values: ['Purple', 'Blue', 'Pink', 'Black'], position: 0 },
      ],
    },
    {
      name: 'Laptop Backpack Pro',
      slug: 'laptop-backpack-pro',
      description: 'Durable water-resistant backpack with padded laptop compartment (up to 17 inch), USB charging port, and anti-theft design.',
      price: 89.99,
      compareAtPrice: 129.99,
      sku: 'BP-001',
      quantity: 80,
      categoryId: electronics.id,
      status: 'ACTIVE' as const,
      images: [
        { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', altText: 'Laptop backpack', position: 0 },
      ],
      options: [
        { name: 'Color', values: ['Black', 'Gray', 'Navy'], position: 0 },
      ],
    },
    {
      name: 'Ceramic Coffee Mug Set',
      slug: 'ceramic-coffee-mug-set',
      description: 'Set of 4 handcrafted ceramic coffee mugs. Microwave and dishwasher safe. Perfect for coffee, tea, or hot chocolate.',
      price: 39.99,
      sku: 'CM-001',
      quantity: 120,
      categoryId: home.id,
      status: 'ACTIVE' as const,
      images: [
        { url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', altText: 'Coffee mugs', position: 0 },
      ],
    },
    {
      name: 'Running Shoes Ultra',
      slug: 'running-shoes-ultra',
      description: 'Lightweight running shoes with advanced cushioning and breathable mesh upper. Perfect for long-distance running.',
      price: 129.99,
      compareAtPrice: 179.99,
      sku: 'RS-001',
      quantity: 90,
      categoryId: sports.id,
      status: 'ACTIVE' as const,
      featured: true,
      images: [
        { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', altText: 'Running shoes', position: 0 },
      ],
      options: [
        { name: 'Size', values: ['7', '8', '9', '10', '11', '12'], position: 0 },
        { name: 'Color', values: ['Black/White', 'Blue/Orange', 'Gray/Red'], position: 1 },
      ],
    },
  ];

  for (const productData of products) {
    const { images, options, ...productFields } = productData;
    
    const product = await prisma.product.create({
      data: {
        ...productFields,
        images: {
          create: images,
        },
        options: options ? {
          create: options,
        } : undefined,
      },
    });
    
    console.log(`✅ Created product: ${product.name}`);
  }

  // Create coupons
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: '10% off your first order',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minPurchase: 50,
        usageLimit: 1000,
        isActive: true,
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on orders over $100',
        discountType: 'FREE_SHIPPING',
        discountValue: 0,
        minPurchase: 100,
        isActive: true,
      },
      {
        code: 'SAVE20',
        description: '$20 off orders over $200',
        discountType: 'FIXED',
        discountValue: 20,
        minPurchase: 200,
        usageLimit: 500,
        isActive: true,
      },
    ],
  });
  console.log('✅ Coupons created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@shop.com / admin123');
  console.log('Customer: customer@shop.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
