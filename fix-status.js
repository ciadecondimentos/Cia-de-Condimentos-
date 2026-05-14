const db = require('./backend/db');

(async () => {
  try {
    console.log('Conectando ao banco...');
    const r = await db.query(
      "UPDATE orders SET status = $1, payment_status = $1 WHERE (status = $2 OR payment_status = $2) AND payment_method = $3 RETURNING id",
      ["Pago", "Confirmado", "pix"]
    );
    console.log('✅ Atualizados:', r.rowCount, 'pedidos PIX de Confirmado para Pago');
    process.exit(0);
  } catch(e) {
    console.error('❌ Erro:', e.message);
    console.error(e);
    process.exit(1);
  }
})();
