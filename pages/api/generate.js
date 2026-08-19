export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { type, ...fields } = req.body || {};
  let prompt = "";

  if (type === "legenda") {
    const { nicho, assunto, tom } = fields;
    if (!nicho || !assunto) {
      return res.status(400).json({ error: "Preencha o nicho e o assunto do post." });
    }
    prompt = `Você é especialista em redação para Instagram no Brasil.
Nicho: ${nicho}
Assunto do post: ${assunto}
Tom: ${tom || "Divertido"}

Gere:
- 3 legendas curtas (2 a 4 linhas cada), em português do Brasil, cada uma com uma chamada para ação diferente
- 15 hashtags relevantes e não saturadas (evite hashtags genéricas demais como #instagood)

Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto antes ou depois, no formato:
{"legendas": ["...", "...", "..."], "hashtags": ["#tag1", "#tag2", ...]}`;
  } else if (type === "bio") {
    const { negocio, publico, tom } = fields;
    if (!negocio || !publico) {
      return res.status(400).json({ error: "Preencha o tipo de negócio e o público-alvo." });
    }
    prompt = `Você é especialista em branding para redes sociais no Brasil.
Tipo de negócio: ${negocio}
Público-alvo: ${publico}
Tom: ${tom || "Divertido"}

Gere:
- 5 opções de nome de perfil comercial (curtos, fáceis de lembrar e de buscar)
- 3 bios prontas para Instagram/TikTok (até 150 caracteres cada), cada uma com emoji e uma chamada para ação de link na bio

Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto antes ou depois, no formato:
{"nomes": ["...", "...", "...", "...", "..."], "bios": ["...", "...", "..."]}`;
  } else {
    return res.status(400).json({ error: "Tipo inválido." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Erro Anthropic:", data);
      return res.status(502).json({ error: "Erro ao gerar conteúdo. Tenta de novo." });
    }

    const text = (data.content || []).map((b) => b.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro interno ao gerar conteúdo." });
  }
}
