import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { getSetting, isFeatureEnabled } from '@/lib/settings';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  template: string;
}

async function getTransporter() {
  const host = await getSetting('smtp_host', process.env.SMTP_HOST || '');
  const port = await getSetting('smtp_port', process.env.SMTP_PORT || '587');
  const user = await getSetting('smtp_user', process.env.SMTP_USER || '');
  const password = await getSetting('smtp_password', process.env.SMTP_PASSWORD || '');

  if (!host || !user || !password) {
    throw new Error('Email configuration is incomplete. Please configure SMTP settings in admin panel.');
  }

  return nodemailer.createTransporter({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: {
      user,
      pass: password,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    const from = await getSetting('email_from', process.env.EMAIL_FROM || 'noreply@shop.com');

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    // Log email
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'SENT',
        sentAt: new Date(),
        metadata: { messageId: info.messageId },
      },
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);

    // Log failed email
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template,
        status: 'FAILED',
        failedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return false;
  }
}

export async function sendOrderConfirmation(orderId: string): Promise<boolean> {
  const enabled = await isFeatureEnabled('order_confirmation_enabled');
  if (!enabled) return false;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order?.user?.email) return false;

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.name}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            $${item.price.toFixed(2)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            $${item.total.toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0;">Order Confirmation</h1>
          <p style="margin: 10px 0 0 0; color: #666;">Thank you for your order!</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">Order #${order.orderNumber}</h2>
          <p>Hi ${order.user.name || 'Customer'},</p>
          <p>We've received your order and will send you a confirmation when it ships.</p>

          <h3 style="margin-top: 30px; margin-bottom: 15px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <table style="width: 100%; max-width: 300px; margin-left: auto;">
              <tr>
                <td style="padding: 5px;">Subtotal:</td>
                <td style="padding: 5px; text-align: right;">$${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px;">Shipping:</td>
                <td style="padding: 5px; text-align: right;">$${order.shipping.toFixed(2)}</td>
              </tr>
              ${order.tax > 0 ? `
              <tr>
                <td style="padding: 5px;">Tax:</td>
                <td style="padding: 5px; text-align: right;">$${order.tax.toFixed(2)}</td>
              </tr>
              ` : ''}
              ${order.discount > 0 ? `
              <tr>
                <td style="padding: 5px; color: #16a34a;">Discount:</td>
                <td style="padding: 5px; text-align: right; color: #16a34a;">-$${order.discount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="font-weight: bold; font-size: 18px; border-top: 2px solid #e5e7eb;">
                <td style="padding: 10px 5px;">Total:</td>
                <td style="padding: 10px 5px; text-align: right;">$${order.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${order.shippingAddress ? `
          <h3 style="margin-top: 30px; margin-bottom: 15px;">Shipping Address</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p style="margin: 0;">${order.shippingAddress.firstName} ${order.shippingAddress.lastName}</p>
            <p style="margin: 5px 0 0 0;">${order.shippingAddress.addressLine1}</p>
            ${order.shippingAddress.addressLine2 ? `<p style="margin: 5px 0 0 0;">${order.shippingAddress.addressLine2}</p>` : ''}
            <p style="margin: 5px 0 0 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
            <p style="margin: 5px 0 0 0;">${order.shippingAddress.country}</p>
          </div>
          ` : ''}
        </div>

        <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
          <p style="margin: 0; color: #666;">Questions? Contact us at support@shop.com</p>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: order.user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
      template: 'order_confirmation',
    });
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return false;
  }
}

export async function sendOrderShipped(orderId: string): Promise<boolean> {
  const enabled = await isFeatureEnabled('order_shipped_enabled');
  if (!enabled) return false;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: true,
      },
    });

    if (!order?.user?.email) return false;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0;">Your Order Has Shipped! 📦</h1>
        </div>

        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
          <p>Hi ${order.user.name || 'Customer'},</p>
          <p>Great news! Your order <strong>#${order.orderNumber}</strong> has been shipped and is on its way to you.</p>

          ${order.trackingNumber ? `
          <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Tracking Number:</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; color: #10b981;">${order.trackingNumber}</p>
            ${order.shippingCarrier ? `<p style="margin: 5px 0 0 0; color: #666;">Carrier: ${order.shippingCarrier}</p>` : ''}
          </div>
          ` : ''}

          <p>You can expect delivery within 3-5 business days.</p>
        </div>

        <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
          <p style="margin: 0; color: #666;">Questions? Contact us at support@shop.com</p>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: order.user.email,
      subject: `Your Order Has Shipped - ${order.orderNumber}`,
      html,
      template: 'order_shipped',
    });
  } catch (error) {
    console.error('Error sending order shipped email:', error);
    return false;
  }
}

export async function sendOrderDelivered(orderId: string): Promise<boolean> {
  const enabled = await isFeatureEnabled('order_delivered_enabled');
  if (!enabled) return false;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
      },
    });

    if (!order?.user?.email) return false;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0;">Order Delivered! 🎉</h1>
        </div>

        <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
          <p>Hi ${order.user.name || 'Customer'},</p>
          <p>Your order <strong>#${order.orderNumber}</strong> has been delivered!</p>
          <p>We hope you love your purchase. If you have any questions or concerns, please don't hesitate to reach out.</p>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/orders/${order.id}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Order</a>
          </div>

          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <strong>Love your purchase?</strong> We'd appreciate if you could leave a review!
          </p>
        </div>

        <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 10px; text-align: center;">
          <p style="margin: 0; color: #666;">Questions? Contact us at support@shop.com</p>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: order.user.email,
      subject: `Your Order Has Been Delivered - ${order.orderNumber}`,
      html,
      template: 'order_delivered',
    });
  } catch (error) {
    console.error('Error sending order delivered email:', error);
    return false;
  }
}
