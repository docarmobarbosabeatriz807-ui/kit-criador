const PRECO = 19.9;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Informe um e-mail para gerar o Pix." });
  }

  try {
    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify({
        transaction_amount: PRECO,
        description: "Kit Criador - acesso ilimitado",
        payment_method_id: "pix",
        payer: { email },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Erro Mercado Pago:", data);
      return res.status(502).json({ error: data.message || "Erro ao gerar o Pix." });
    }

    const txData = data.point_of_interaction?.transaction_data;
    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: txData?.qr_code,
      qr_code_base64: txData?.qr_code_base64,
      preco: PRECO,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro interno ao gerar o Pix." });
  }
}
