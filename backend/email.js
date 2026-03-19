// Mock de email - funções desativadas
async function sendConfirmationEmail(email, token) {
  console.log(`[EMAIL] Confirmation link would be sent to ${email}: token=${token}`);
  return true;
}

async function sendPasswordResetEmail(email, token) {
  console.log(`[EMAIL] Password reset link would be sent to ${email}: token=${token}`);
  return true;
}

async function sendOrderConfirmationEmail(email, orderData) {
  console.log(`[EMAIL] Order confirmation would be sent to ${email}`, orderData);
  return true;
}

module.exports = {
  sendConfirmationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail
};
