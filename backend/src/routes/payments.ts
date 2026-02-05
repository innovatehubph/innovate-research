import { Router, Request, Response } from 'express';
import { PrismaClient, Plan } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import directPay from '../services/directpay';

const router = Router();
const prisma = new PrismaClient();

// Plan pricing
const planPricing: Record<Plan, number> = {
  FREE: 0,
  STARTER: 499,
  PRO: 1499,
  ENTERPRISE: 4999,
};

const planCredits: Record<Plan, number> = {
  FREE: 5,
  STARTER: 25,
  PRO: 100,
  ENTERPRISE: 999999, // Unlimited
};

// Get available plans
router.get('/plans', (req: Request, res: Response) => {
  const plans = Object.entries(planPricing).map(([plan, price]) => ({
    id: plan,
    name: plan.charAt(0) + plan.slice(1).toLowerCase(),
    price,
    credits: planCredits[plan as Plan],
    features: getPlanFeatures(plan as Plan),
  }));
  res.json(plans);
});

function getPlanFeatures(plan: Plan): string[] {
  const features: Record<Plan, string[]> = {
    FREE: [
      '5 research reports/month',
      'Basic templates',
      'Markdown export',
      'Email support',
    ],
    STARTER: [
      '25 research reports/month',
      'All templates',
      'PDF, Markdown, CSV export',
      'API access (100 calls/day)',
      'Priority email support',
    ],
    PRO: [
      '100 research reports/month',
      'All templates + custom',
      'All export formats including RAG',
      'Full API access',
      'Webhooks',
      'Priority support',
    ],
    ENTERPRISE: [
      'Unlimited research reports',
      'Custom templates',
      'All export formats',
      'Unlimited API access',
      'Custom webhooks',
      'Dedicated support',
      'SLA guarantee',
    ],
  };
  return features[plan];
}

// Subscribe to a plan
router.post('/subscribe', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body;
    const userId = req.user!.id;

    if (!plan || !planPricing[plan as Plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const selectedPlan = plan as Plan;
    const amount = planPricing[selectedPlan];

    // Free plan - just update
    if (amount === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { plan: selectedPlan, credits: planCredits[selectedPlan] },
      });
      return res.json({ success: true, message: 'Subscribed to FREE plan' });
    }

    // Create transaction record
    const referenceId = `IR-${uuid().slice(0, 8).toUpperCase()}`;
    
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        plan: selectedPlan,
        status: 'PENDING',
        directpayRef: referenceId,
      },
    });

    // Create payment with DirectPay
    const baseUrl = process.env.APP_URL || 'https://research.innovatehub.site';
    const payment = await directPay.createPayment({
      amount,
      description: `Innovate Research ${selectedPlan} Plan Subscription`,
      referenceId,
      webhookUrl: `${baseUrl}/api/payments/webhook`,
      returnUrl: `${baseUrl}/dashboard?payment=success`,
    });

    // Update transaction with payment URL
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { directpayRef: payment.transactionId },
    });

    res.json({
      paymentUrl: payment.paymentUrl,
      transactionId: payment.transactionId,
      qrCode: payment.qrCode,
      amount,
      plan: selectedPlan,
      environment: directPay.getEnvironment(),
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payment webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-signature'] as string;

    // Verify webhook signature (optional for sandbox)
    if (directPay.getEnvironment() === 'PRODUCTION') {
      if (!directPay.verifyWebhook(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { transaction_id, status, reference_id, amount } = payload;

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { directpayRef: transaction_id },
          { directpayRef: reference_id },
        ],
      },
      include: { user: true },
    });

    if (!transaction) {
      console.log('Transaction not found:', transaction_id || reference_id);
      return res.json({ received: true });
    }

    // Update transaction status
    const isCompleted = ['completed', 'success', 'paid'].includes(status?.toLowerCase());
    
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: isCompleted ? 'COMPLETED' : status },
    });

    // If payment completed, upgrade user
    if (isCompleted) {
      await prisma.user.update({
        where: { id: transaction.userId },
        data: {
          plan: transaction.plan,
          credits: planCredits[transaction.plan],
        },
      });
      console.log(`User ${transaction.userId} upgraded to ${transaction.plan}`);
    }

    res.json({ received: true, processed: isCompleted });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's transactions
router.get('/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check payment status
router.get('/status/:transactionId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await directPay.checkPaymentStatus(req.params.transactionId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all transactions
router.get('/admin/transactions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.plan !== 'ENTERPRISE') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const transactions = await prisma.transaction.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalRevenue = await prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    res.json({
      transactions,
      totalRevenue: totalRevenue._sum.amount || 0,
      environment: directPay.getEnvironment(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate payment (SANDBOX only)
router.post('/simulate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (directPay.getEnvironment() !== 'SANDBOX') {
      return res.status(400).json({ error: 'Simulation only available in sandbox' });
    }

    const { transactionId } = req.body;

    const transaction = await prisma.transaction.findFirst({
      where: { directpayRef: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Simulate successful payment
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'COMPLETED' },
    });

    await prisma.user.update({
      where: { id: transaction.userId },
      data: {
        plan: transaction.plan,
        credits: planCredits[transaction.plan],
      },
    });

    res.json({ success: true, message: 'Payment simulated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
