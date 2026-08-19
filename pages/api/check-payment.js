export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "id obrigatório" });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Erro ao consultar pagamento:", data);
      return res.status(502).json({ error: "Erro ao consultar pagamento." });
    }
    return res.status(200).json({ status: data.status });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro interno ao consultar pagamento." });
  }
}
