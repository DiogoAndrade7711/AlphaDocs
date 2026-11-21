import axios from 'axios';
import { config } from '../config.js';

const http = axios.create({
  baseURL: config.docsApi.baseUrl,
  headers: {
    Authorization: `Bearer ${config.docsApi.key}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// NUNCA logue config.docsApi.key
http.interceptors.request.use((req) => {
  console.log(`[API] ${req.method?.toUpperCase()} ${req.url}`);
  return req;
});

export const docsApi = {
  async getModules() {
    const { data } = await http.get('/modules');
    return data;
  },

  async getModule(codigo) {
    const { data } = await http.get(`/modules/${codigo}`);
    return data;
  },

  async getCatalogVersion() {
    const { data } = await http.get('/catalog/version');
    return data;
  },

  async getCatalog(nome, q = '') {
    const { data } = await http.get(`/catalogos/${nome}`, { params: { q } });
    return data;
  },

  async preview(modulo, dados, formData) {
    // Se tiver imagens, enviar como multipart
    if (formData) {
      const { data } = await http.post('/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await http.post('/preview', { modulo, dados });
    return data;
  },

  async generate(modulo, dados, idempotencyKey, formData) {
    const headers = { 'Idempotency-Key': idempotencyKey };
    if (formData) {
      const { data } = await http.post('/generate', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await http.post('/generate', { modulo, dados }, { headers });
    return data;
  },

  async getAccount() {
    const { data } = await http.get('/account');
    return data;
  },

  async getStatement(params = {}) {
    const { data } = await http.get('/statement', { params });
    return data;
  },

  async getUsage(params = {}) {
    const { data } = await http.get('/usage', { params });
    return data;
  },

  async recharge(payload) {
    const { data } = await http.post('/recharges', payload);
    return data;
  },

  async calcular(modulo, dados) {
    const { data } = await http.post('/calcular', { modulo, dados });
    return data;
  },
};
