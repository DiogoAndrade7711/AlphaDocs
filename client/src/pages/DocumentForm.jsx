import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import DynamicForm from '../components/DynamicForm.jsx';
import api from '../api.js';

const STEPS_PER_GROUP = 5;

function groupFields(campos) {
  const groups = [];
  for (let i = 0; i < campos.length; i += STEPS_PER_GROUP) {
    groups.push(campos.slice(i, i + STEPS_PER_GROUP));
  }
  return groups.length ? groups : [[]];
}

export default function DocumentForm() {
  const { codigo } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [schema, setSchema] = useState(null);
  const [moduleInfo, setModuleInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/documents/modules/${codigo}`),
      api.get('/documents/modules'),
    ]).then(([schemaRes, listRes]) => {
      setSchema(schemaRes.data);
      const info = listRes.data.find(m => m.codigo === codigo);
      setModuleInfo(info);
    }).catch(() => setErro('Documento não encontrado.')).finally(() => setLoading(false));
  }, [codigo]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner spinner-lg" /></div>;
  if (erro || !schema) return <div className="page"><div className="container"><div className="alert alert-error">{erro || 'Erro ao carregar formulário.'}</div></div></div>;

  const campos = schema.campos || [];
  const groups = groupFields(campos);
  const totalSteps = groups.length;
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100);

  async function handlePreview() {
    setErro(''); setPreviewLoading(true);
    try {
      // Verificar campos obrigatórios
      const missing = campos.filter(c => c.obrigatorio && !values[c.campo] && !c.calculado);
      if (missing.length > 0) {
        setErro(`Preencha os campos obrigatórios: ${missing.map(c => c.titulo).join(', ')}`);
        setPreviewLoading(false);
        return;
      }

      const hasImages = Object.values(values).some(v => v instanceof File);
      let previewData;

      if (hasImages) {
        const form = new FormData();
        form.append('modulo', codigo);
        const dados = {};
        for (const [k, v] of Object.entries(values)) {
          if (v instanceof File) form.append(k, v);
          else dados[k] = v;
        }
        form.append('dados', JSON.stringify(dados));
        const { data } = await api.post('/documents/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        previewData = data;
      } else {
        const { data } = await api.post('/documents/preview', { modulo: codigo, dados: values });
        previewData = data;
      }

      // Navegar para preview com dados
      navigate(`/painel/documentos/${codigo}/preview`, {
        state: { previewData, values, moduleInfo, schema },
      });
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar prévia.');
    } finally { setPreviewLoading(false); }
  }

  const isLastStep = step === totalSteps - 1;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        {/* Header */}
        <div className="mb-3">
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, marginBottom: 12 }}>← Voltar</button>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{moduleInfo?.nome_exibicao || `Documento ${codigo}`}</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{moduleInfo?.descricao}</p>
        </div>

        {/* Barra de progresso */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
            <span>Etapa {step + 1} de {totalSteps}</span>
            <span>{progress}% concluído</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Formulário da etapa atual */}
        {erro && <div className="alert alert-error mb-2">{erro}</div>}
        <div className="card mb-2 fade-in">
          <DynamicForm
            schema={{ campos: groups[step], variantes: step === 0 ? schema.variantes : undefined, medicos: step === totalSteps - 1 ? schema.medicos : undefined }}
            modulo={codigo}
            onChange={setValues}
            initialValues={values}
          />
        </div>

        {/* Créditos info */}
        {isLastStep && (
          <div className="alert alert-info mb-2">
            Custo: <strong>{moduleInfo?.preco_creditos || 1} crédito{(moduleInfo?.preco_creditos || 1) !== 1 ? 's' : ''}</strong> · Saldo atual: <strong>{user?.creditos || 0}</strong>
          </div>
        )}

        {/* Navegação */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-secondary">
            ← Anterior
          </button>
          {isLastStep ? (
            <button onClick={handlePreview} disabled={previewLoading} className="btn btn-primary btn-lg">
              {previewLoading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Gerando prévia...</> : '👁 Ver prévia →'}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="btn btn-primary">
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
