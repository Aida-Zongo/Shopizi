/**
 * Abstract payment gateway interface.
 * All payment gateways (CinetPay, Orange Money, Moov Money) must implement this.
 */
class PaymentGateway {
  async initiatePayment({ amount, phoneNumber, reference, description }) {
    throw new Error('Not implemented');
  }
  async verifyPayment(transactionId) {
    throw new Error('Not implemented');
  }
  async processWebhook(payload, signature) {
    throw new Error('Not implemented');
  }
  getGatewayName() {
    throw new Error('Not implemented');
  }
}

module.exports = PaymentGateway;