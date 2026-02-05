import axios from 'axios';
import crypto from 'crypto';

const SANDBOX_API = 'https://sandbox.directpayph.com/api';
const PRODUCTION_API = 'https://nexuspay.cloud/api';

interface DirectPayConfig {
  merchantId: string;
  merchantKey: string;
  username: string;
  password: string;
  env: 'SANDBOX' | 'PRODUCTION';
}

class DirectPayService {
  private config: DirectPayConfig;
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private csrfToken: string | null = null;
  private cookies: string = '';

  constructor() {
    this.config = {
      merchantId: process.env.DIRECTPAY_MERCHANT_ID || '',
      merchantKey: process.env.DIRECTPAY_MERCHANT_KEY || '',
      username: process.env.DIRECTPAY_USERNAME || '',
      password: process.env.DIRECTPAY_PASSWORD || '',
      env: (process.env.DIRECTPAY_ENV as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX',
    };
    this.baseUrl = this.config.env === 'PRODUCTION' ? PRODUCTION_API : SANDBOX_API;
  }

  private async getCSRFToken(): Promise<void> {
    const response = await axios.get(`${this.baseUrl}/csrf_token`, {
      withCredentials: true,
    });
    
    this.csrfToken = response.data.csrf_token;
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      this.cookies = setCookie.map((c: string) => c.split(';')[0]).join('; ');
    }
  }

  private async authenticate(): Promise<void> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return;
    }

    await this.getCSRFToken();

    const response = await axios.post(
      `${this.baseUrl}/create/login`,
      {
        username: this.config.username,
        password: this.config.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.csrfToken,
          Cookie: this.cookies,
        },
      }
    );

    if (response.data.token) {
      this.token = response.data.token;
      this.tokenExpiry = Date.now() + 25 * 60 * 1000; // 25 minutes
    } else {
      throw new Error('Failed to authenticate with DirectPay');
    }
  }

  async createPayment(params: {
    amount: number;
    description: string;
    referenceId: string;
    webhookUrl: string;
    returnUrl: string;
  }): Promise<{
    paymentUrl: string;
    transactionId: string;
    qrCode?: string;
  }> {
    await this.authenticate();

    const response = await axios.post(
      `${this.baseUrl}/pay_cashin`,
      {
        merchant_id: this.config.merchantId,
        amount: params.amount.toString(),
        description: params.description,
        reference_id: params.referenceId,
        callback_url: params.webhookUrl,
        return_url: params.returnUrl,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          'X-CSRF-TOKEN': this.csrfToken,
          Cookie: this.cookies,
        },
      }
    );

    return {
      paymentUrl: response.data.payment_url || response.data.checkout_url,
      transactionId: response.data.transaction_id || response.data.id,
      qrCode: response.data.qr_code,
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<{
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
    amount?: number;
    paidAt?: Date;
  }> {
    await this.authenticate();

    const response = await axios.get(
      `${this.baseUrl}/cashin_transactions_status/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'X-CSRF-TOKEN': this.csrfToken,
          Cookie: this.cookies,
        },
      }
    );

    const statusMap: Record<string, 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'> = {
      pending: 'PENDING',
      completed: 'COMPLETED',
      success: 'COMPLETED',
      paid: 'COMPLETED',
      failed: 'FAILED',
      expired: 'EXPIRED',
    };

    return {
      status: statusMap[response.data.status?.toLowerCase()] || 'PENDING',
      amount: parseFloat(response.data.amount),
      paidAt: response.data.paid_at ? new Date(response.data.paid_at) : undefined,
    };
  }

  async getWalletBalance(): Promise<number> {
    await this.authenticate();

    const response = await axios.get(`${this.baseUrl}/user/info`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'X-CSRF-TOKEN': this.csrfToken,
        Cookie: this.cookies,
      },
    });

    return parseFloat(response.data.balance || '0');
  }

  // Verify webhook signature
  verifyWebhook(payload: any, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.merchantKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }

  getEnvironment(): 'SANDBOX' | 'PRODUCTION' {
    return this.config.env;
  }
}

export const directPay = new DirectPayService();
export default directPay;
