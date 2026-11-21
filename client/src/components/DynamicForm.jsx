import { useState, useEffect, useRef } from 'react';
import api from '../api.js';

// Renders a full dynamic form from the API's field schema
export default function DynamicForm({ schema, modulo, onChange, initialValues = {} }) {
  const [values, setValues] = useState(initialValues);
  const [varianteEscolhida, setVarianteEscolhida] = useState(null);
  const [medicoManual, setMedicoManual] = useState(false);
  const [calculados, setCalculados] = useState({});
  const [catalogResults, setCatalogResults] = useState({});
  const [catalogOpen, setCatalogOpen] = useState({});
  const catalogTimers = useRef({});

  const { campos = [], variantes, medicos } = schema;

  // Variante selecionada muda os campos
  const activeCampos = variantes && varianteEscolhida !== null
    ? (variantes[varianteEscolhida]?.campos || campos)
    : campos;

  useEffect(() => {
    onChange?.(values);
  }, [values]);

  // Recalcular campos automáticos com debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      const camposCalculados = activeCampos.filter(c => c.calculado);
      if (camposCalculados.length === 0) return;
      try {
        const { data } = await api.post('/documents/calcular', { modulo, dados: values });
        const result = {};
        for (const c of camposCalculados) {
          if (data[c.campo] !== undefined) result[c.campo] = data[c.campo];
        }
        setCalculados(result);
        setValues(v => ({ ...v, ...result }));
      } catch {}
    }, 800);
    return () => clearTimeout(timer);
  }, [values, modulo]);

  function set(campo, value) {
    setValues(v => ({ ...v, [campo]: value }));
  }

  async function searchCatalog(nome, q) {
    clearTimeout(catalogTimers.current[nome]);
    catalogTimers.current[nome] = setTimeout(async () => {
      try {
        const { data } = await api.get(`/documents/catalogos/${nome}`, { params: { q } });
        setCatalogResults(r => ({ ...r, [nome]: Array.isArray(data) ? data : (data.resultados || []) }));
        setCatalogOpen(o => ({ ...o, [nome]: true }));
      } catch {}
    }, 300);
  }

  async function gerarCampo(campo) {
    try {
      const { data } = await api.post('/documents/calcular', { modulo, dados: { ...values, _gerar: campo } });
      if (data[campo]) set(campo, data[campo]);
    } catch {}
  }

  function renderCampo(c) {
    const { campo, titulo, tipo, obrigatorio, calculado, gerador, catalogo, exemplo, descricao, opcoes } = c;
    const isAuto = calculado || gerador;
    const val = values[campo] || '';

    return (
      <div key={campo} style={{ marginBottom: 20 }}>
        <label className="field-label">
          {titulo}{obrigatorio && <span className="required">*</span>}
          {isAuto && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--brand-light)', color: 'var(--brand)', padding: '1px 7px', borderRadius: 999, fontWeight: 600 }}>automático</span>}
        </label>

        {/* Catálogo com busca */}
        {catalogo ? (
          <div style={{ position: 'relative' }}>
            <input className="input" value={val} placeholder={exemplo || `Buscar ${titulo}...`}
              readOnly={calculado}
              onChange={e => { set(campo, e.target.value); searchCatalog(catalogo, e.target.value); }}
              onFocus={() => { if (val.length >= 1) searchCatalog(catalogo, val); }}
            />
            {catalogOpen[catalogo] && catalogResults[catalogo]?.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: 200, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
                {catalogResults[catalogo].map((item, i) => (
                  <div key={i} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}
                    onMouseDown={() => { set(campo, typeof item === 'string' ? item : (item.nome || item.descricao || JSON.stringify(item))); setCatalogOpen(o => ({ ...o, [catalogo]: false })); }}>
                    {typeof item === 'string' ? item : (item.nome || item.codigo || JSON.stringify(item))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tipo === 'textarea' ? (
          <textarea className="input" rows={4} readOnly={calculado} value={val} placeholder={exemplo || ''} onChange={e => set(campo, e.target.value)} style={{ resize: 'vertical' }} />
        ) : tipo === 'select' ? (
          <select className="input" value={val} disabled={calculado} onChange={e => set(campo, e.target.value)}>
            <option value="">Selecione...</option>
            {(opcoes || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : tipo === 'multiselect' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(opcoes || []).map(o => {
              const selected = (values[campo] || []).includes(o);
              return (
                <button key={o} type="button"
                  onClick={() => set(campo, selected ? (values[campo] || []).filter(x => x !== o) : [...(values[campo] || []), o])}
                  style={{ padding: '5px 12px', borderRadius: 999, fontSize: 13, border: '1px solid', cursor: 'pointer',
                    background: selected ? 'var(--brand)' : 'var(--surface)', color: selected ? '#fff' : 'var(--text)',
                    borderColor: selected ? 'var(--brand)' : 'var(--border)' }}>
                  {o}
                </button>
              );
            })}
          </div>
        ) : tipo === 'image' ? (
          <input type="file" accept="image/*" className="input" style={{ padding: 8 }}
            onChange={e => { const f = e.target.files[0]; if (f) set(campo, f); }} />
        ) : tipo === 'date' ? (
          <input className="input" type="text" readOnly={calculado} value={val}
            placeholder="DD/MM/AAAA"
            maxLength={10}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '');
              if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
              if (v.length >= 6) v = v.slice(0,5) + '/' + v.slice(5,9);
              set(campo, v);
            }}
          />
        ) : tipo === 'cpf' ? (
          <input className="input" type="text" readOnly={calculado} value={val}
            placeholder="000.000.000-00" maxLength={14}
            onChange={e => {
              let v = e.target.value.replace(/\D/g, '');
              v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
              set(campo, v);
            }}
          />
        ) : tipo === 'uppercase' ? (
          <input className="input" readOnly={calculado} value={val} placeholder={exemplo || ''} onChange={e => set(campo, e.target.value.toUpperCase())} />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" readOnly={calculado} value={typeof val === 'object' ? '' : val}
              placeholder={calculado ? 'Preenchido automaticamente' : (exemplo || '')}
              onChange={e => set(campo, e.target.value)} />
            {gerador && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => gerarCampo(campo)} style={{ whiteSpace: 'nowrap' }}>
                Gerar
              </button>
            )}
          </div>
        )}

        {descricao && <p className="field-hint">{descricao}</p>}
      </div>
    );
  }

  return (
    <div>
      {/* Variantes — primeira pergunta */}
      {variantes && variantes.length > 1 && (
        <div style={{ marginBottom: 28 }}>
          <label className="field-label" style={{ marginBottom: 10, fontSize: 15 }}>Qual tipo de documento?<span className="required">*</span></label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {variantes.map((v, i) => (
              <button key={i} type="button"
                onClick={() => setVarianteEscolhida(i)}
                style={{ padding: '12px 24px', borderRadius: 'var(--radius)', border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: 'all var(--transition)',
                  background: varianteEscolhida === i ? 'var(--brand)' : 'var(--surface)',
                  color: varianteEscolhida === i ? '#fff' : 'var(--text)',
                  borderColor: varianteEscolhida === i ? 'var(--brand)' : 'var(--border)' }}>
                {v.nome || v.label || `Opção ${i + 1}`}
              </button>
            ))}
          </div>
          <hr className="sep" />
        </div>
      )}

      {/* Campos */}
      {activeCampos.map(renderCampo)}

      {/* Seção do médico */}
      {medicos && (
        <div style={{ marginTop: 24, padding: 20, background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h4 style={{ marginBottom: 12, fontSize: 15 }}>Médico que assina</h4>
          {medicos.lista && medicos.lista.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <select className="input" value={values['_medico_id'] || ''} onChange={e => set('_medico_id', e.target.value)}>
                <option value="">Selecionar médico cadastrado...</option>
                {medicos.lista.map(m => (
                  <option key={m.id || m.crm} value={m.id || m.crm}>{m.nome} — CRM {m.crm}/{m.uf}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => setMedicoManual(!medicoManual)}
              style={{ background: medicoManual ? 'var(--brand)' : 'var(--border)', width: 36, height: 20, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--transition)' }}>
              <span style={{ position: 'absolute', top: 2, left: medicoManual ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left var(--transition)' }} />
            </button>
            <span style={{ fontSize: 13 }}>Usar outro médico (manual)</span>
          </div>
          {medicoManual && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { campo: '_medico_nome', titulo: 'Nome', tipo: 'uppercase' },
                { campo: '_medico_crm', titulo: 'CRM', tipo: 'text' },
                { campo: '_medico_uf', titulo: 'UF', tipo: 'text' },
                { campo: '_medico_especialidade', titulo: 'Especialidade', tipo: 'text' },
              ].map(c => <div key={c.campo}>{renderCampo({ ...c, obrigatorio: true, opcoes: [] })}</div>)}
              {medicos.interface?.pede_assinatura && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="field-label">Assinatura (imagem)</label>
                  <input type="file" accept="image/*" className="input" style={{ padding: 8 }} onChange={e => set('_medico_assinatura', e.target.files[0])} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
