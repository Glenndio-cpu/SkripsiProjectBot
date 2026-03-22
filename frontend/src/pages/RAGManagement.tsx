import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../lib/api';
import {
  Database, Brain, Cpu, FileText, Upload, Trash2, RefreshCw, Search,
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Zap, Box,
  HardDrive, Layers, ArrowRight, Info, Globe, Shield, Sparkles, Hash
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────

function getAdminEmail(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'nurse') return u.email;
    }
  } catch { /* */ }
  return '';
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
      ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label || (ok ? 'Aktif' : 'Tidak Aktif')}
    </span>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-0 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-medium text-slate-500 sm:w-44 flex-shrink-0">{label}</span>
      <span className={`text-sm text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

const RAGManagement = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [ragStatus, setRagStatus] = useState<any>(null);
  const [error, setError] = useState('');

  // Actions
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [deleting, setDeleting] = useState('');

  // Test query
  const [testQuery, setTestQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any>(null);
  const [querying, setQuerying] = useState(false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    vectordb: true,
    embedding: true,
    llm: true,
    pipeline: false,
    documents: true,
    testQuery: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Auth check
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const user = JSON.parse(userData);
    if (user.role !== 'nurse') { navigate('/'); return; }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const email = getAdminEmail();
      const [sysInfo, status] = await Promise.all([
        api.ragSystemInfo(email),
        api.ragStatus(),
      ]);
      setSystemInfo(sysInfo);
      setRagStatus(status);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const result = await api.ragUpload(file, getAdminEmail());
      alert(`Berhasil: ${result.message}\n\nChunks: ${result.chunks}`);
      loadData();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Hapus dokumen "${filename}"? Data akan dihapus dari vector database.`)) return;
    setDeleting(filename);
    try {
      await api.ragDelete(filename, getAdminEmail());
      alert(`Berhasil: Dokumen "${filename}" berhasil dihapus`);
      loadData();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setDeleting('');
    }
  };

  const handleReindex = async () => {
    if (!confirm('Reindex semua dokumen? Proses ini akan memakan waktu.')) return;
    setReindexing(true);
    try {
      const result = await api.ragReindex(getAdminEmail());
      alert(`Berhasil: ${result.message}\n\nTotal Dokumen: ${result.totalDocuments}\nTotal Chunks: ${result.totalChunks}`);
      loadData();
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setQuerying(true);
    setQueryResults(null);
    try {
      const result = await api.ragQuery(testQuery, 5);
      setQueryResults(result);
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setQuerying(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────

  const SectionHeader = ({ id, icon: Icon, title, subtitle, color }: {
    id: string; icon: any; title: string; subtitle?: string; color: string;
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors rounded-t-xl ${
        expandedSections[id] ? '' : 'rounded-b-xl'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <h3 className="text-base font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {expandedSections[id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  );

  // ── Loading / Error ────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          <span className="ml-3 text-slate-500">Memuat informasi sistem...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={loadData} className="mt-4 text-sm text-red-600 underline">Coba lagi</button>
          </div>
        </div>
      </Layout>
    );
  }

  const vdb = systemInfo?.vectorDatabase || {};
  const emb = systemInfo?.embedding || {};
  const llm = systemInfo?.llm || {};
  const rag = systemInfo?.rag || {};

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-700 mb-2">Manajemen RAG & AI</h1>
          <p className="text-slate-500 text-sm">Vector Database, Embedding Model, LLM, dan manajemen dokumen</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { icon: Database, label: 'Vector Points', value: vdb.pointsCount ?? 0, color: 'text-violet-500 bg-violet-50' },
            { icon: FileText, label: 'Dokumen', value: rag.totalDocuments ?? 0, color: 'text-sky-500 bg-sky-50' },
            { icon: Brain, label: 'Embedding Dim', value: `${emb.dimensions ?? 0}D`, color: 'text-amber-500 bg-amber-50' },
            { icon: Sparkles, label: 'LLM Status', value: llm.status === 'connected' ? 'Online' : 'Offline', color: 'text-emerald-500 bg-emerald-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 text-center">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-700">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ══════════════ VECTOR DATABASE ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="vectordb" icon={Database} title="Vector Database — Qdrant" subtitle="Cloud-hosted vector search engine" color="bg-violet-50 text-violet-600" />
          {expandedSections.vectordb && (
            <div className="px-4 sm:px-5 pb-5 space-y-0">
              <InfoRow label="Database" value={<span className="font-semibold">{vdb.name || 'Qdrant'}</span>} />
              <InfoRow label="Deployment" value={`${vdb.type || 'Cloud'} — ${vdb.provider || ''}`} />
              <InfoRow label="Host" value={vdb.url || '-'} mono />
              <InfoRow label="Port" value={vdb.port || 6333} mono />
              <InfoRow label="Protokol" value={vdb.protocol || 'HTTPS + gRPC'} />
              <InfoRow label="Autentikasi" value={vdb.authenticated ? 'Ya (API Key)' : 'Tidak'} />
              <InfoRow label="Status" value={<StatusBadge ok={vdb.status === 'connected'} label={vdb.status === 'connected' ? 'Connected' : vdb.status} />} />
              <InfoRow label="Collection" value={vdb.collection || '-'} mono />
              <InfoRow label="Total Vectors" value={<span className="font-semibold text-violet-600">{vdb.pointsCount ?? 0}</span>} />
              <InfoRow label="Segments" value={vdb.segmentsCount ?? '-'} />
              <InfoRow label="Vector Size" value={vdb.vectorSize ? `${vdb.vectorSize} dimensi` : '-'} />
              <InfoRow label="Distance Function" value={vdb.distance || 'Cosine'} />
            </div>
          )}
        </div>

        {/* ══════════════ EMBEDDING MODEL ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="embedding" icon={Brain} title="Embedding Model — BERT" subtitle={emb.fullName || 'all-MiniLM-L6-v2'} color="bg-amber-50 text-amber-600" />
          {expandedSections.embedding && (
            <div className="px-4 sm:px-5 pb-5 space-y-0">
              <InfoRow label="Model" value={<span className="font-semibold">{emb.fullName || emb.name}</span>} />
              <InfoRow label="Arsitektur" value={emb.family || 'BERT'} />
              <InfoRow label="Varian" value={emb.architecture || '-'} />
              <InfoRow label="Framework" value={emb.framework || 'sentence-transformers'} />
              <InfoRow label="Dimensi Output" value={<span className="font-mono font-semibold text-amber-600">{emb.dimensions || 384}</span>} />
              <InfoRow label="Max Sequence Length" value={`${emb.maxSequenceLength || 256} tokens`} />
              <InfoRow label="Pooling" value={emb.poolingStrategy || 'Mean Pooling'} />
              <InfoRow label="Normalisasi" value={emb.normalization ? 'Ya (unit vectors)' : 'Tidak'} />
              <InfoRow label="Total Parameter" value={emb.parameters || '22.7M'} />
              <InfoRow label="Ukuran Model" value={emb.modelSize || '~80 MB'} />
              <InfoRow label="Similarity" value={emb.similarityFunction || 'Cosine'} />
              <InfoRow label="Bahasa" value={emb.language || 'Multilingual'} />
              <InfoRow label="Training Data" value={emb.pretrainedOn || '-'} />
              <InfoRow label="Status" value={<StatusBadge ok={emb.loaded === true} label={emb.loaded ? 'Loaded' : 'Not Loaded'} />} />
              {emb.performance && (
                <>
                  <InfoRow label="STS Benchmark" value={`Spearman: ${emb.performance.stsb_spearman || '-'}`} />
                  <InfoRow label="Kecepatan" value={emb.performance.speed || '-'} />
                </>
              )}
              {emb.useCases && (
                <InfoRow label="Use Cases" value={
                  <div className="flex flex-wrap gap-1.5">
                    {emb.useCases.map((uc: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">{uc}</span>
                    ))}
                  </div>
                } />
              )}
              <InfoRow label="Source" value={
                emb.source ? <a href={emb.source} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline text-xs break-all">{emb.source}</a> : '-'
              } />
            </div>
          )}
        </div>

        {/* ══════════════ LLM ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="llm" icon={Sparkles} title={`LLM — ${llm.model || 'Gemini'}`} subtitle={llm.description || 'Google Generative AI'} color="bg-emerald-50 text-emerald-600" />
          {expandedSections.llm && (
            <div className="px-4 sm:px-5 pb-5 space-y-0">
              <InfoRow label="Provider" value={<span className="font-semibold">{llm.provider || 'Google AI'}</span>} />
              <InfoRow label="Model" value={<span className="font-mono font-semibold text-emerald-600">{llm.model}</span>} />
              <InfoRow label="Family" value={`${llm.family || 'Gemini'} ${llm.generation || ''}`} />
              <InfoRow label="Variant" value={llm.variant || '-'} />
              <InfoRow label="Context Window" value={llm.contextWindow || '-'} />
              <InfoRow label="API Key" value={<span className="font-mono text-xs">{llm.apiKeyMasked || '***'}</span>} />
              <InfoRow label="Status" value={<StatusBadge ok={llm.status === 'connected'} label={llm.status === 'connected' ? 'Connected' : llm.status} />} />
              <InfoRow label="Pricing" value={llm.pricing || '-'} />
              {llm.generationConfig && (
                <>
                  <InfoRow label="Temperature" value={llm.generationConfig.temperature} />
                  <InfoRow label="Top P" value={llm.generationConfig.topP} />
                  <InfoRow label="Top K" value={llm.generationConfig.topK} />
                  <InfoRow label="Max Output Tokens" value={llm.generationConfig.maxOutputTokens} />
                </>
              )}
              {llm.capabilities && (
                <InfoRow label="Capabilities" value={
                  <div className="flex flex-wrap gap-1.5">
                    {llm.capabilities.map((c: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{c}</span>
                    ))}
                  </div>
                } />
              )}
              <InfoRow label="Source" value={
                llm.source ? <a href={llm.source} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline text-xs break-all">{llm.source}</a> : '-'
              } />
            </div>
          )}
        </div>

        {/* ══════════════ RAG PIPELINE ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="pipeline" icon={Layers} title="RAG Pipeline" subtitle="Retrieval Augmented Generation flow" color="bg-sky-50 text-sky-600" />
          {expandedSections.pipeline && (
            <div className="px-4 sm:px-5 pb-5">
              <p className="text-sm text-slate-500 mb-4">{rag.description}</p>

              {/* Pipeline steps */}
              <div className="space-y-2">
                {(rag.steps || []).map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{step.name}</p>
                      <p className="text-xs text-slate-500">{step.detail}</p>
                    </div>
                    {i < (rag.steps?.length || 0) - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-300 ml-auto mt-1.5 flex-shrink-0 hidden sm:block" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{rag.chunkSize}</p>
                  <p className="text-xs text-slate-400">Chunk Size</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{rag.chunkOverlap}</p>
                  <p className="text-xs text-slate-400">Overlap</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{rag.topK}</p>
                  <p className="text-xs text-slate-400">Top K</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{rag.minScore}</p>
                  <p className="text-xs text-slate-400">Min Score</p>
                </div>
              </div>

              <div className="mt-3">
                <InfoRow label="Format Didukung" value={
                  <div className="flex flex-wrap gap-1.5">
                    {(rag.supportedFormats || []).map((f: string) => (
                      <span key={f} className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-xs font-mono">{f}</span>
                    ))}
                  </div>
                } />
                <InfoRow label="Max File Size" value={rag.maxFileSize || '10 MB'} />
              </div>
            </div>
          )}
        </div>

        {/* ══════════════ DOCUMENT MANAGEMENT ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="documents" icon={FileText} title="Manajemen Dokumen" subtitle={`${rag.totalDocuments || 0} dokumen (${rag.totalDocumentsSize || '0 B'})`} color="bg-rose-50 text-rose-600" />
          {expandedSections.documents && (
            <div className="px-4 sm:px-5 pb-5">
              {/* Action bar */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Mengupload...' : 'Upload Dokumen'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.json,.md,.csv,.docx"
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {reindexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {reindexing ? 'Reindexing...' : 'Reindex Semua'}
                </button>
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {/* Document list */}
              {(rag.documents || []).length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada dokumen. Upload dokumen pertama Anda.</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Nama File</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Tipe</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Ukuran</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Terakhir Diubah</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(rag.documents || []).map((doc: any) => (
                        <tr key={doc.name} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-medium text-slate-700 truncate max-w-[200px]">{doc.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{doc.extension}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{doc.sizeFormatted}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                            {doc.lastModified ? new Date(doc.lastModified).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDelete(doc.name)}
                              disabled={deleting === doc.name}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deleting === doc.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════ TEST QUERY ══════════════ */}
        <div className="bg-white border border-slate-100 rounded-xl mb-4 overflow-hidden">
          <SectionHeader id="testQuery" icon={Search} title="Test Retrieval" subtitle="Uji pencarian similarity di vector database" color="bg-indigo-50 text-indigo-600" />
          {expandedSections.testQuery && (
            <div className="px-4 sm:px-5 pb-5">
              <form onSubmit={handleTestQuery} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={testQuery}
                  onChange={e => setTestQuery(e.target.value)}
                  placeholder='Contoh: "jam buka puskesmas" atau "gejala demam berdarah"'
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={querying || !testQuery.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Cari
                </button>
              </form>

              {queryResults && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Query: <span className="font-medium text-slate-700">"{queryResults.query}"</span> — {queryResults.count} hasil
                  </p>
                  {(queryResults.results || []).length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Tidak ada hasil yang ditemukan.</p>
                  ) : (
                    queryResults.results.map((r: any, i: number) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-500">
                            <FileText className="w-3 h-3 inline mr-1" />
                            {r.source}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.score >= 0.4 ? 'bg-emerald-100 text-emerald-700' :
                            r.score >= 0.25 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            Score: {r.score}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default RAGManagement;
