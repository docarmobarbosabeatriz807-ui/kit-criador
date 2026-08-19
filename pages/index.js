import { useState, useEffect, useRef } from "react";
import { Copy, Check, Sparkles, Instagram, PenLine, IdCard, Lock, QrCode } from "lucide-react";

const TONES = ["Divertido", "Sério e direto", "Elegante", "Motivacional"];
const FREE_LIMIT = 3;

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors"
      style={{ background: copied ? "#F4B942" : "rgba(246,241,231,0.1)", color: copied ? "#0F3D3E" : "#F6F1E7" }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function PaywallModal({ onClose, onUnlocked }) {
  const [step, setStep] = useState("email"); // email | qrcode | erro
  const [email, setEmail] = useState("");
  const [pix, setPix] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function gerarPix() {
    if (!email.trim() || !email.includes("@")) {
      setErro("Digite um e-mail válido.");
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      const r = await fetch("/api/create-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao gerar Pix");
      setPix(data);
      setStep("qrcode");
      pollRef.current = setInterval(async () => {
        const check = await fetch(`/api/check-payment?id=${data.id}`);
        const checkData = await check.json();
        if (checkData.status === "approved") {
          clearInterval(pollRef.current);
          localStorage.setItem("kitcriador_unlocked", "1");
          onUnlocked();
        }
      }, 5000);
    } catch (e) {
      setErro(e.message || "Não deu para gerar o Pix agora.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,61,62,0.85)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ background: "#123536", border: "1px solid rgba(246,241,231,0.15)", color: "#F6F1E7" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(244,185,66,0.15)" }}>
          <Lock size={18} color="#F4B942" />
        </div>

        {step === "email" && (
          <>
            <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold mb-2">
              Suas {FREE_LIMIT} gerações grátis acabaram
            </h2>
            <p className="text-sm mb-4" style={{ color: "#9FC7C3" }}>
              Pague uma vez via Pix e libere gerações ilimitadas. O acesso libera sozinho assim que o pagamento cair.
            </p>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>
              Seu e-mail
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
              style={{ background: "#0F3D3E", border: "1px solid rgba(246,241,231,0.2)", color: "#F6F1E7" }}
            />
            {erro && <p className="text-xs mb-3" style={{ color: "#FF8B94" }}>{erro}</p>}
            <button
              onClick={gerarPix}
              disabled={carregando}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-3"
              style={{ background: "#F4B942", color: "#0F3D3E", opacity: carregando ? 0.6 : 1 }}
            >
              <QrCode size={15} /> {carregando ? "Gerando Pix..." : "Gerar Pix — R$ 19,90"}
            </button>
          </>
        )}

        {step === "qrcode" && pix && (
          <>
            <h2 style={{ fontFamily: "'Fraunces', serif" }} className="text-xl font-semibold mb-2">
              Escaneie ou copie o Pix
            </h2>
            <p className="text-sm mb-4" style={{ color: "#9FC7C3" }}>
              Assim que o pagamento for aprovado, o acesso libera automaticamente nesta tela.
            </p>
            {pix.qr_code_base64 && (
              <img
                src={`data:image/png;base64,${pix.qr_code_base64}`}
                alt="QR Code Pix"
                className="w-40 h-40 mx-auto mb-4 rounded-lg"
                style={{ background: "#fff" }}
              />
            )}
            {pix.qr_code && (
              <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(246,241,231,0.06)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#9FC7C3" }}>
                  Pix Copia e Cola
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] truncate">{pix.qr_code}</span>
                  <CopyBtn text={pix.qr_code} />
                </div>
              </div>
            )}
            <p className="text-xs flex items-center gap-2" style={{ color: "#9FC7C3" }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#F4B942" }} />
              Aguardando pagamento...
            </p>
          </>
        )}

        <button onClick={onClose} className="w-full text-center text-xs py-3 mt-1" style={{ color: "#9FC7C3" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function KitCriador() {
  const [tab, setTab] = useState("legenda");
  const [usageCount, setUsageCount] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [ready, setReady] = useState(false);

  const [nicho, setNicho] = useState("");
  const [assunto, setAssunto] = useState("");
  const [tomLegenda, setTomLegenda] = useState(TONES[0]);
  const [loadingLegenda, setLoadingLegenda] = useState(false);
  const [erroLegenda, setErroLegenda] = useState("");
  const [resultLegenda, setResultLegenda] = useState(null);

  const [negocio, setNegocio] = useState("");
  const [publico, setPublico] = useState("");
  const [tomBio, setTomBio] = useState(TONES[0]);
  const [loadingBio, setLoadingBio] = useState(false);
  const [erroBio, setErroBio] = useState("");
  const [resultBio, setResultBio] = useState(null);

  useEffect(() => {
    setUsageCount(Number(localStorage.getItem("kitcriador_usage") || 0));
    setUnlocked(localStorage.getItem("kitcriador_unlocked") === "1");
    setReady(true);
  }, []);

  function registrarUso() {
    const novo = usageCount + 1;
    setUsageCount(novo);
    localStorage.setItem("kitcriador_usage", String(novo));
  }

  function limiteAtingido() {
    return !unlocked && usageCount >= FREE_LIMIT;
  }

  async function gerar(type) {
    if (limiteAtingido()) {
      setShowPaywall(true);
      return;
    }
    const setLoading = type === "legenda" ? setLoadingLegenda : setLoadingBio;
    const setErro = type === "legenda" ? setErroLegenda : setErroBio;
    const setResult = type === "legenda" ? setResultLegenda : setResultBio;
    const body =
      type === "legenda"
        ? { type, nicho, assunto, tom: tomLegenda }
        : { type, negocio, publico, tom: tomBio };

    if (type === "legenda" && (!nicho.trim() || !assunto.trim())) {
      setErroLegenda("Preencha o nicho e o assunto do post.");
      return;
    }
    if (type === "bio" && (!negocio.trim() || !publico.trim())) {
      setErroBio("Preencha o tipo de negócio e o público-alvo.");
      return;
    }

    setErro("");
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro ao gerar.");
      setResult(data);
      registrarUso();
    } catch (e) {
      setErro(e.message || "Não deu para gerar agora. Tenta de novo.");
    } finally {
      setLoading(false);
    }
  }

  const activeName = resultBio?.nomes?.[0];
  const activeBio = resultBio?.bios?.[0];
  const activeCaption = resultLegenda?.legendas?.[0];
  const gerasRestantes = Math.max(0, FREE_LIMIT - usageCount);

  return (
    <div style={{ background: "#0F3D3E", minHeight: "100vh" }}>
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUnlocked={() => {
            setUnlocked(true);
            setShowPaywall(false);
          }}
        />
      )}
      <div style={{ fontFamily: "'Sora', sans-serif", color: "#F6F1E7" }} className="max-w-5xl mx-auto px-5 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(244,185,66,0.15)", color: "#F4B942" }}>
              <Sparkles size={13} /> Kit Criador
            </div>
            {ready && (
              <div
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: unlocked ? "rgba(244,185,66,0.15)" : "rgba(246,241,231,0.08)", color: unlocked ? "#F4B942" : "#9FC7C3" }}
              >
                {unlocked ? "Ilimitado liberado" : `${gerasRestantes} gerações grátis restantes`}
              </div>
            )}
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }} className="text-3xl sm:text-4xl leading-tight mb-2">
            Legenda, hashtag, nome e bio —<br className="hidden sm:block" /> tudo num lugar só.
          </h1>
          <p style={{ color: "#9FC7C3" }} className="text-sm sm:text-base max-w-xl">
            Preenche os campos, a ferramenta escreve por você. Sem trava criativa, sem folha em branco.
          </p>
          <p style={{ color: "#5F8B87" }} className="text-xs mt-2">kitcriador.com.br</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("legenda")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: tab === "legenda" ? "#F4B942" : "rgba(246,241,231,0.08)", color: tab === "legenda" ? "#0F3D3E" : "#F6F1E7" }}
          >
            <Instagram size={16} /> Legenda &amp; Hashtags
          </button>
          <button
            onClick={() => setTab("bio")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: tab === "bio" ? "#F4B942" : "rgba(246,241,231,0.08)", color: tab === "bio" ? "#0F3D3E" : "#F6F1E7" }}
          >
            <IdCard size={16} /> Nome &amp; Bio
          </button>
        </div>

        <div className="grid sm:grid-cols-[1fr_260px] gap-6">
          <div>
            {tab === "legenda" && (
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(246,241,231,0.05)", border: "1px solid rgba(246,241,231,0.1)" }}>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Nicho</label>
                    <input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="ex: fitness, moda, renda extra"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: "#0F3D3E", border: "1px solid rgba(246,241,231,0.2)", color: "#F6F1E7" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Assunto do post</label>
                    <input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="ex: treino de perna em casa"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: "#0F3D3E", border: "1px solid rgba(246,241,231,0.2)", color: "#F6F1E7" }} />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Tom</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button key={t} onClick={() => setTomLegenda(t)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{ background: tomLegenda === t ? "#FF8B94" : "rgba(246,241,231,0.08)", color: tomLegenda === t ? "#0F3D3E" : "#F6F1E7" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {erroLegenda && <p className="text-xs mb-3" style={{ color: "#FF8B94" }}>{erroLegenda}</p>}
                <button onClick={() => gerar("legenda")} disabled={loadingLegenda}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#F4B942", color: "#0F3D3E", opacity: loadingLegenda ? 0.6 : 1 }}>
                  {limiteAtingido() ? <Lock size={15} /> : <PenLine size={15} />}
                  {loadingLegenda ? "Gerando..." : limiteAtingido() ? "Liberar ilimitado" : "Gerar legendas"}
                </button>

                {resultLegenda && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9FC7C3" }}>Legendas</h3>
                      <div className="space-y-2">
                        {resultLegenda.legendas.map((l, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg text-sm" style={{ background: "rgba(246,241,231,0.06)" }}>
                            <span className="whitespace-pre-line">{l}</span>
                            <CopyBtn text={l} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9FC7C3" }}>Hashtags</h3>
                      <div className="flex items-start justify-between gap-3 p-3 rounded-lg text-sm" style={{ background: "rgba(246,241,231,0.06)" }}>
                        <span className="flex-1">{resultLegenda.hashtags.join(" ")}</span>
                        <CopyBtn text={resultLegenda.hashtags.join(" ")} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "bio" && (
              <div className="rounded-2xl p-5 sm:p-6" style={{ background: "rgba(246,241,231,0.05)", border: "1px solid rgba(246,241,231,0.1)" }}>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Tipo de negócio</label>
                    <input value={negocio} onChange={(e) => setNegocio(e.target.value)} placeholder="ex: loja de doces, consultoria financeira"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: "#0F3D3E", border: "1px solid rgba(246,241,231,0.2)", color: "#F6F1E7" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Público-alvo</label>
                    <input value={publico} onChange={(e) => setPublico(e.target.value)} placeholder="ex: mães de 25 a 40 anos"
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: "#0F3D3E", border: "1px solid rgba(246,241,231,0.2)", color: "#F6F1E7" }} />
                  </div>
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9FC7C3" }}>Tom</label>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button key={t} onClick={() => setTomBio(t)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{ background: tomBio === t ? "#FF8B94" : "rgba(246,241,231,0.08)", color: tomBio === t ? "#0F3D3E" : "#F6F1E7" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {erroBio && <p className="text-xs mb-3" style={{ color: "#FF8B94" }}>{erroBio}</p>}
                <button onClick={() => gerar("bio")} disabled={loadingBio}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#F4B942", color: "#0F3D3E", opacity: loadingBio ? 0.6 : 1 }}>
                  {limiteAtingido() ? <Lock size={15} /> : <PenLine size={15} />}
                  {loadingBio ? "Gerando..." : limiteAtingido() ? "Liberar ilimitado" : "Gerar nome e bio"}
                </button>

                {resultBio && (
                  <div className="mt-6 space-y-5">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9FC7C3" }}>Nomes de perfil</h3>
                      <div className="space-y-2">
                        {resultBio.nomes.map((n, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg text-sm" style={{ background: "rgba(246,241,231,0.06)" }}>
                            <span>{n}</span>
                            <CopyBtn text={n} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9FC7C3" }}>Bios</h3>
                      <div className="space-y-2">
                        {resultBio.bios.map((b, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg text-sm" style={{ background: "rgba(246,241,231,0.06)" }}>
                            <span className="whitespace-pre-line">{b}</span>
                            <CopyBtn text={b} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            <div className="sticky top-6 rounded-[28px] p-4 mx-auto" style={{ background: "#123536", border: "1px solid rgba(246,241,231,0.12)", width: 240 }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "#F4B942", color: "#0F3D3E" }}>
                  {(activeName || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{activeName || "seu.perfil"}</p>
                  <p className="text-[10px]" style={{ color: "#9FC7C3" }}>Perfil comercial</p>
                </div>
              </div>
              <p className="text-[11px] leading-snug mb-3" style={{ color: "#F6F1E7" }}>
                {activeBio || "Sua bio aparece aqui assim que você gerar."}
              </p>
              <div className="rounded-lg aspect-square mb-2 flex items-center justify-center text-[10px] p-2 text-center" style={{ background: "rgba(246,241,231,0.08)", color: "#9FC7C3" }}>
                {activeCaption || "Sua legenda aparece aqui"}
              </div>
              <p className="text-[10px] italic" style={{ color: "#9FC7C3" }}>Prévia — não é o app oficial</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
