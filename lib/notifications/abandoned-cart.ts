import { prisma } from '@/lib/prisma';
import { sendEmail } from './email';
import { getSetting, isFeatureEnabled } from '@/lib/settings';
import crypto from 'crypto';

function generateRecoveryToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function detectAbandonedCarts() {
  const enabled = await isFeatureEnabled('abandoned_cart_enabled');
  if (!enabled) return [];

  const delayHours = parseInt(await getSetting('abandoned_cart_delay_hours', '1'));
  const reminderHours = new Date(Date.now() - delayHours * 60 * 60 * 1000);
  const maxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days max

  const abandonedCarts = await prisma.cart.findMany({
    where: {
      updatedAt: {
        gte: maxAge,
        lte: reminderHours,
      },
      userId: { not: null },
      items: {
        some: {},
      },
    },
    include: {
      user: true,
      items: {
        include: {
          product: {
            include: { images: true },
          },
        },
      },
      recoveryEmails: {
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
    },
  });

  return abandonedCarts;
}

export async function scheduleRecoveryEmails() {
  try {
    const abandonedCarts = await detectAbandonedCarts();
    const delay1 = parseInt(await getSetting('abandoned_cart_delay_hours', '1')) * 60 * 60 * 1000;
    const delay2 = parseInt(await getSetting('abandoned_cart_reminder_2_hours', '24')) * 60 * 60 * 1000;
    const delay3 = parseInt(await getSetting('abandoned_cart_reminder_3_hours', '72')) * 60 * 60 * 1000;

    let emailsSent = 0;

    for (const cart of abandonedCarts) {
      if (!cart.user?.email) continue;

      const timeSinceUpdate = Date.now() - cart.updatedAt.getTime();
      const lastEmail = cart.recoveryEmails[0];
      const timeSinceLastEmail = lastEmail ? Date.now() - lastEmail.sentAt.getTime() : Infinity;

      // Check if cart was converted to order
      const recentOrder = await prisma.order.findFirst({
        where: {
          userId: cart.userId!,
          createdAt: {
            gte: cart.updatedAt,
          },
        },
      });

      if (recentOrder) continue;

      // First reminder
      if (timeSinceUpdate >= delay1 && !lastEmail) {
        await sendRecoveryEmail(cart, 'REMINDER_1');
        emailsSent++;
      }
      // Second reminder
      else if (
        timeSinceUpdate >= delay2 &&
        lastEmail?.emailType === 'REMINDER_1' &&
        timeSinceLastEmail >= delay2 - delay1
      ) {
        await sendRecoveryEmail(cart, 'REMINDER_2');
        emailsSent++;
      }
      // Final reminder
      else if (
        timeSinceUpdate >= delay3 &&
        lastEmail?.emailType === 'REMINDER_2' &&
        timeSinceLastEmail >= delay3 - delay2
      ) {
        await sendRecoveryEmail(cart, 'REMINDER_3');
        emailsSent++;
      }
    }

    return { success: true, emailsSent, cartsProcessed: abandonedCarts.length };
  } catch (error) {
    console.error('Error scheduling recovery emails:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendRecoveryEmail(cart: any, emailType: string) {
  const recoveryToken = generateRecoveryToken();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const recoveryUrl = `${baseUrl}/cart?recovery=${recoveryToken}`;

  await prisma.cartRecoveryEmail.create({
    data: {
      cartId: cart.id,
      emailType,
      recoveryToken,
    },
  });

  const cartTotal = cart.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

  const itemsHtml = cart.items
    .slice(0, 3)
    .map(
      (item: any) => `
      <tr>
        <td style="padding: 15px;">
          ${
            item.product.images[0]
              ? `<img src="${item.product.images[0].url}" alt="${item.product.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;">`
              : ''
          }
        </td>
        <td style="padding: 15px;">
          <strong>${item.product.name}</strong><br>
          <span style="color: #666;">Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 15px; text-align: right;">
          <strong>$${(item.price * item.quantity).toFixed(2)}</strong>
        </td>
      </tr>
    `
    )
    .join('');

  const subject =
    emailType === 'REMINDER_1'
      ? "You left something in your cart! 🛒"
      : emailType === 'REMINDER_2'
      ? "Still interested? Your cart is waiting! ⏰"
      : "Last chance! Your cart expires soon 🎁";

  const message =
    emailType === 'REMINDER_1'
      ? "We noticed you left some items in your cart. Complete your purchase now!"
      : emailType === 'REMINDER_2'
      ? "Your items are still waiting for you. Don't miss out on these great products!"
      : "This is your last reminder! Your cart will expire soon. Complete your order now and enjoy your purchase!";

  const urgency =
    emailType === 'REMINDER_3'
      ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <strong style="color: #92400e;">⚠️ Cart Expiring Soon!</strong>
      <p style="margin: 5px 0 0 0; color: #92400e;">Your cart will expire in 24 hours. Complete your purchase now to secure these items!</p>
    </div>
  `
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🛒 Your Cart Awaits!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${message}</p>
      </div>

      ${urgency}

      <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
        <h2 style="margin-top: 0; color: #1f2937;">Your Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${cart.items.length > 3 ? `<p style="color: #666; text-align: center; margin: 10px 0;">+ ${cart.items.length - 3} more item(s)</p>` : ''}

        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: right;">
          <p style="margin: 0; font-size: 18px;"><strong>Cart Total: $${cartTotal.toFixed(2)}</strong></p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${recoveryUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            Complete Your Purchase →
          </a>
        </div>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          Questions? Contact us at support@shop.com<br>
          <a href="${baseUrl}/cart" style="color: #667eea; text-decoration: none;">View your cart</a>
        </p>
      </div>

      <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
        <p>You're receiving this email because you have items in your cart.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: cart.user.email,
    subject,
    html,
    template: `abandoned_cart_${emailType.toLowerCase()}`,
  });
}

export async function handleCartRecovery(recoveryToken: string, userId: string) {
  try {
    const recovery = await prisma.cartRecoveryEmail.findUnique({
      where: { recoveryToken },
      include: {
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!recovery) {
      return { success: false, error: 'Invalid recovery token' };
    }

    // Mark as clicked
    if (!recovery.clickedAt) {
      await prisma.cartRecoveryEmail.update({
        where: { id: recovery.id },
        data: { clickedAt: new Date() },
      });
    }

    // If user completes purchase, mark as converted
    // This will be called from the checkout API

    return { success: true, cart: recovery.cart };
  } catch (error) {
    console.error('Error handling cart recovery:', error);
    return { success: false, error: 'Failed to recover cart' };
  }
}

export async function markCartRecoveryConverted(cartId: string, orderId: string) {
  try {
    await prisma.cartRecoveryEmail.updateMany({
      where: {
        cartId,
        convertedAt: null,
      },
      data: {
        convertedAt: new Date(),
        orderId,
      },
    });
  } catch (error) {
    console.error('Error marking cart recovery as converted:', error);
  }
}
