import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../api.js';

export default function Preview() {
  const { codigo } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [slide, setSlide] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [erro, setErro] = useState('');
  const [zoom, setZoom] = useState(1);

  const { previewData, values, moduleInfo, schema } = state || {};
  const images = previewData?.imagens || previewData?.paginas || previewData?.preview_urls || [];
  const custo = moduleInfo?.preco_creditos || 1;
  const saldoApos = (user?.creditos || 0) - custo;

  async function generate() {
    if (saldoApos < 0) { setErro('Créditos insuficientes. Compre mais créditos.'); return; }
    setErro(''); setGenerating(true);
    try {
      const hasImages = values && Object.values(values).some(v => v instanceof File);
      let result;

      if (hasImages) {
        const form = new FormData();
        form.append('modulo', codigo);
        const dados = {};
        for (const [k, v] of Object.entries(values || {})) {
          if (v instanceof File) form.append(k, v);
          else dados[k] = v;
        }
        form.append('dados', JSON.stringify(dados));
        const { data } = await api.post('/documents/generate', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        result = data;
      } else {
        const { data } = await api.post('/documents/generate', { modulo: codigo, dados: values });
        result = data;
      }

      setGenerated(result);
      updateUser({ creditos: (user?.creditos || 0) - custo });
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar documento.');
    } finally { setGenerating(false); }
  }

  async function downloadPdf(docId) {
    try {
      const { data } = await api.get(`/documents/download/${docId}`);
      window.open(data.url, '_blank');
    } catch { alert('Erro ao gerar link de download.'); }
  }

  if (!state) return <div className="page"><div className="container"><div className="alert alert-error">Dados de prévia não encontrados. <a href="#" onClick={() => navigate(-1)}>Voltar</a></div></div></div>;

  if (generated) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Documento gerado!</h1>
          <p style={{ color: 'var(--text-2)', marginBottom: 32 }}>{custo} crédito{custo !== 1 ? 's' : ''} debitado{custo !== 1 ? 's' : ''}. Saldo: {saldoApos}.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {generated.doc_id && (
              <button onClick={() => downloadPdf(generated.doc_id)} className="btn btn-primary btn-lg">⬇ Baixar PDF</button>
            )}
            <button onClick={() => navigate('/painel/historico')} className="btn btn-secondary btn-lg">Meus documentos</button>
            <button onClick={() => navigate(`/painel/documentos/${codigo}`)} className="btn btn-ghost btn-lg">Gerar outro</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="mb-3">
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>← Voltar ao formulário</button>
          <h1 style={{ fontSize: 24 }}>Prévia do documento</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>As imagens abaixo contêm marca d'água. O PDF final será limpo.</p>
        </div>

        {/* Carrossel de páginas */}
        {images.length > 0 ? (
          <div className="card mb-3" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Controles de zoom */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Página {slide + 1} de {images.length}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setZoom(z => Math.max(.5, z - .2))} className="btn btn-secondary btn-sm">−</button>
                <span style={{ lineHeight: '32px', fontSize: 13 }}>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + .2))} className="btn btn-secondary btn-sm">+</button>
              </div>
            </div>

            {/* Imagem */}
            <div style={{ overflow: 'auto', maxHeight: 600, background: '#f1f1f1', display: 'flex', justifyContent: 'center', padding: 24 }}>
              <img src={images[slide]} alt={`Página ${slide + 1}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', maxWidth: '100%', boxShadow: '0 4px 20px rgba(0,0,0,.2)', borderRadius: 4 }} />
            </div>

            {/* Nav */}
            {images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <button disabled={slide === 0} onClick={() => setSlide(s => s - 1)} className="btn btn-secondary btn-sm">‹ Anterior</button>
                {images.map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: slide === i ? 'var(--brand)' : 'transparent', color: slide === i ? '#fff' : 'var(--text-2)', borderColor: slide === i ? 'var(--brand)' : 'var(--border)' }}>{i + 1}</button>
                ))}
                <button disabled={slide === images.length - 1} onClick={() => setSlide(s => s + 1)} className="btn btn-secondary btn-sm">Próxima ›</button>
              </div>
            )}
          </div>
        ) : (
          <div className="card mb-3"><p style={{ color: 'var(--text-2)', textAlign: 'center', padding: 32 }}>Prévia não disponível. Você ainda pode gerar o documento final.</p></div>
        )}

        {/* Confirmação */}
        {erro && <div className="alert alert-error mb-2">{erro}</div>}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Confirmar geração</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
              Custo: <strong>{custo} crédito{custo !== 1 ? 's' : ''}</strong> · Saldo atual: <strong>{user?.creditos || 0}</strong> → Após: <strong style={{ color: saldoApos < 0 ? '#ef4444' : 'inherit' }}>{saldoApos}</strong>
            </div>
          </div>
          <button onClick={generate} disabled={generating || saldoApos < 0} className="btn btn-primary btn-lg">
            {generating ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Gerando documento...</>
            ) : saldoApos < 0 ? 'Créditos insuficientes' : `✅ Gerar documento — ${custo} crédito${custo !== 1 ? 's' : ''}`}
          </button>
        </div>
        {saldoApos < 0 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/painel/creditos" className="btn btn-secondary">Comprar créditos</a>
          </div>
        )}
      </div>
    </div>
  );
}
