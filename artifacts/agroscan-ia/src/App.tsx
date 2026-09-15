import { useCallback, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyzePlant } from '@workspace/api-client-react';
import type { PlantAnalysisInputOrgan, PlantAnalysisResult } from '@workspace/api-client-react';
import { AlertCircle, ArrowUpRight, Camera, Check, ChevronDown, CircleHelp, FileImage, Leaf, LoaderCircle, RotateCcw, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Organ = PlantAnalysisInputOrgan;

const organs: Array<{ value: Organ; label: string; hint: string; icon: string }> = [
  { value: 'auto', label: 'Detección automática', hint: 'Recomendado', icon: '◌' },
  { value: 'leaf', label: 'Hoja', hint: 'Manchas o bordes', icon: '⌁' },
  { value: 'flower', label: 'Flor', hint: 'Pétalos y brotes', icon: '✳' },
  { value: 'fruit', label: 'Fruto', hint: 'Piel y maduración', icon: '◉' },
  { value: 'bark', label: 'Corteza', hint: 'Tronco o tallo', icon: '≋' },
];

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const message = (error as { error?: unknown }).error;
    if (typeof message === 'string') return message;
  }
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string') return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No pudimos completar la lectura. Comprueba tu conexión e inténtalo de nuevo.';
}

function AppMark() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-agroscan">
      <span className="brand-mark" aria-hidden="true"><Leaf size={19} strokeWidth={2.4} /></span>
      <span className="font-display text-[1.1rem] font-semibold tracking-[-0.03em] text-forest">AgroScan <em className="font-sans text-[0.72rem] font-semibold not-italic tracking-[0.08em] text-moss">IA</em></span>
    </div>
  );
}

function Header() {
  return (
    <header className="relative z-10 border-b border-sage/35 bg-cream/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <AppMark />
        <div className="flex items-center gap-2 text-[0.72rem] font-medium tracking-[0.07em] text-muted-olive uppercase sm:gap-3">
          <span className="hidden h-2 w-2 rounded-full bg-leaf sm:inline-block" />
          <span className="hidden sm:inline">Lectura botánica serena</span>
          <span className="flex items-center gap-1.5 rounded-full border border-sage/60 bg-parchment/80 px-3 py-1.5 tracking-[0.04em] normal-case"><ShieldCheck size={13} /> Privado por diseño</span>
        </div>
      </div>
    </header>
  );
}

function Dropzone({ preview, fileName, onFile, onClear }: { preview: string | null; fileName: string; onFile: (file: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFile = (file?: File) => {
    if (!file) return;
    onFile(file);
  };

  return (
    <div
      className={`upload-zone relative overflow-hidden rounded-[1.35rem] border-2 border-dashed transition-all duration-300 ${isDragging ? 'is-dragging border-leaf bg-sage/35' : 'border-sage/75 bg-parchment/45'} ${preview ? 'has-preview' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setIsDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files[0]); }}
      data-testid="upload-dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="sr-only"
        onChange={(event) => { acceptFile(event.target.files?.[0]); event.currentTarget.value = ''; }}
        data-testid="input-plant-image"
      />
      {preview ? (
        <div className="group relative aspect-[1.52/1] min-h-[240px] w-full sm:min-h-[290px]">
          <img src={preview} alt={`Vista previa de ${fileName || 'la planta seleccionada'}`} className="absolute inset-0 h-full w-full object-cover" data-testid="img-plant-preview" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/75 via-transparent to-forest/10" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-cream sm:p-5">
            <div className="min-w-0">
              <p className="mb-1 text-[0.67rem] font-semibold uppercase tracking-[0.13em] text-sage">Imagen lista para leer</p>
              <p className="truncate text-sm font-medium">{fileName || 'Fotografía de la planta'}</p>
            </div>
            <button type="button" onClick={onClear} className="icon-button shrink-0 border border-cream/30 bg-forest/55 text-cream hover:bg-forest" aria-label="Quitar imagen" data-testid="button-remove-image">
              <X size={17} />
            </button>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-cream/45 bg-forest/55 px-3 py-2 text-xs font-semibold text-cream opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100" data-testid="button-change-image">
            <Upload size={13} /> Cambiar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[240px] w-full flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[290px]" data-testid="button-select-image">
          <span className="upload-icon mb-5 flex h-14 w-14 items-center justify-center rounded-[1.1rem] bg-sage/55 text-forest transition-transform duration-300"><FileImage size={26} strokeWidth={1.7} /></span>
          <span className="font-display text-[1.2rem] font-medium tracking-[-0.02em] text-forest">Suelta una foto aquí</span>
          <span className="mt-2 max-w-[250px] text-sm leading-6 text-muted-olive">o selecciónala desde tu dispositivo para comenzar</span>
          <span className="mt-5 flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-sage/75 bg-cream/70 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-muted-olive uppercase">JPG</span>
            <span className="rounded-full border border-sage/75 bg-cream/70 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-muted-olive uppercase">PNG</span>
            <span className="flex items-center gap-1 rounded-full border border-sage/75 bg-cream/70 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-muted-olive uppercase"><Camera size={11} /> Cámara</span>
          </span>
        </button>
      )}
    </div>
  );
}

function OrganPicker({ value, onChange }: { value: Organ; onChange: (value: Organ) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest">¿Qué parte vemos? <span className="font-normal text-muted-olive">(opcional)</span><span className="ml-auto hidden items-center gap-1 text-[0.68rem] font-normal text-muted-olive sm:flex"><CircleHelp size={13} /> Ayuda a afinar la lectura</span></legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {organs.map((organ) => {
          const selected = value === organ.value;
          return (
            <button type="button" key={organ.value} onClick={() => onChange(organ.value)} className={`organ-option relative flex min-h-[73px] flex-col items-start justify-between rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${selected ? 'border-leaf bg-sage/60 text-forest shadow-[inset_0_0_0_1px_hsl(var(--leaf))]' : 'border-sage/55 bg-parchment/35 text-muted-olive hover:-translate-y-0.5 hover:border-moss/60 hover:bg-sage/25'}`} aria-pressed={selected} data-testid={`button-organ-${organ.value}`}>
              <span className="flex w-full items-center justify-between"><span className={`font-display text-lg leading-none ${selected ? 'text-leaf' : 'text-moss/75'}`}>{organ.icon}</span>{selected && <Check size={14} className="text-leaf" />}</span>
              <span className="text-[0.74rem] font-semibold leading-tight">{organ.label}</span>
              <span className="text-[0.61rem] leading-tight opacity-75">{organ.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function LoadingResults() {
  return (
    <div className="space-y-3" aria-label="Analizando la imagen" data-testid="status-loading">
      {[0, 1, 2].map((item) => <div key={item} className="result-skeleton flex items-center gap-4 rounded-2xl border border-sage/40 bg-parchment/60 p-4"><div className="skeleton-pulse h-14 w-14 shrink-0 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton-pulse h-3 w-2/5 rounded-full" /><div className="skeleton-pulse h-3 w-4/5 rounded-full" /></div><div className="skeleton-pulse h-9 w-12 rounded-lg" /></div>)}
    </div>
  );
}

function ResultCard({ result, index }: { result: PlantAnalysisResult; index: number }) {
  const percentage = Math.max(0, Math.min(100, result.matchPercentage));
  return (
    <article className="result-card group flex gap-4 rounded-2xl border border-sage/50 bg-parchment/55 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-moss/55 hover:bg-parchment sm:p-5" data-testid={`card-result-${index}`}>
      <div className="result-thumb relative h-[4.35rem] w-[4.35rem] shrink-0 overflow-hidden rounded-xl bg-sage/55">
        {result.imageUrl ? <img src={result.imageUrl} alt="" className="h-full w-full object-cover" data-testid={`img-result-${index}`} /> : <Leaf size={24} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-moss/55" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-display text-[1.1rem] font-medium leading-tight tracking-[-0.025em] text-forest" data-testid={`text-result-name-${index}`}>{result.name}</p>{result.eppoCode && <p className="mt-1 text-[0.67rem] font-semibold tracking-[0.1em] text-muted-olive uppercase">Código EPPO · {result.eppoCode}</p>}</div>
          <span className="shrink-0 rounded-full bg-sage/70 px-2.5 py-1 text-sm font-semibold text-leaf" data-testid={`text-result-match-${index}`}>{percentage.toFixed(1)}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sage/55"><div className="h-full rounded-full bg-leaf transition-all duration-700" style={{ width: `${percentage}%` }} /></div>
        {(result.imageAuthor || result.imageLicense) && <p className="mt-2 truncate text-[0.67rem] text-muted-olive">{result.imageAuthor ? `Imagen: ${result.imageAuthor}` : ''}{result.imageAuthor && result.imageLicense ? ' · ' : ''}{result.imageLicense || ''}</p>}
      </div>
    </article>
  );
}

function ResultsPanel({ results, isPending, error, onRetry }: { results: PlantAnalysisResult[]; isPending: boolean; error: unknown; onRetry: () => void }) {
  if (isPending) return <LoadingResults />;
  if (error) {
    const message = errorMessage(error);
    const isKeyError = message.toLowerCase().includes('plantnet') || message.toLowerCase().includes('api_key') || message.toLowerCase().includes('configur');
    return (
      <div className="rounded-2xl border border-terracotta/30 bg-terracotta/8 p-5 sm:p-6" role="alert" data-testid="status-analysis-error">
        <div className="flex gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta/12 text-terracotta"><AlertCircle size={18} /></span><div><h3 className="font-display text-lg font-medium text-forest">{isKeyError ? 'La conexión botánica no está configurada' : 'La lectura se interrumpió'}</h3><p className="mt-1 text-sm leading-6 text-muted-olive">{isKeyError ? 'Falta PLANTNET_API_KEY en el entorno del servidor. Pide al administrador que la configure para activar el análisis.' : message}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-full border border-terracotta/35 px-4 py-2 text-xs font-semibold text-terracotta transition-colors hover:bg-terracotta/10" data-testid="button-retry-analysis"><RotateCcw size={13} /> Intentar de nuevo</button></div></div>
      </div>
    );
  }
  if (!results.length) {
    return <div className="empty-results flex min-h-[274px] flex-col items-center justify-center rounded-2xl border border-dashed border-sage/70 bg-parchment/25 px-6 text-center" data-testid="status-empty-results"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/45 text-moss"><Sparkles size={20} strokeWidth={1.6} /></span><h3 className="font-display text-xl tracking-[-0.02em] text-forest">Tu lectura aparecerá aquí</h3><p className="mt-2 max-w-[270px] text-sm leading-6 text-muted-olive">Sube una fotografía nítida de la planta para recibir hasta cinco posibilidades.</p></div>;
  }
  return <div className="space-y-3" data-testid="list-analysis-results">{results.map((result, index) => <ResultCard key={`${result.name}-${index}`} result={result} index={index} />)}<p className="pt-2 text-center text-xs text-muted-olive" data-testid="text-result-count">{results.length === 1 ? '1 posibilidad encontrada' : `${results.length} posibilidades encontradas`}{results.length < 5 ? ' · La respuesta disponible es parcial.' : ''}</p></div>;
}

function Home() {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [organ, setOrgan] = useState<Organ>('auto');
  const [results, setResults] = useState<PlantAnalysisResult[]>([]);
  const analyzePlant = useAnalyzePlant();
  const selectedFileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    setFileError('');
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setFileError('Elige una imagen JPG o PNG para continuar.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFileError('La imagen es demasiado grande. Elige un archivo de hasta 12 MB.');
      return;
    }
    selectedFileRef.current = file;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => setFileError('No pudimos leer esa imagen. Prueba con otro archivo.');
    reader.readAsDataURL(file);
    setResults([]);
  }, []);

  const clearFile = () => {
    selectedFileRef.current = null;
    setPreview(null);
    setFileName('');
    setResults([]);
    setFileError('');
    analyzePlant.reset();
  };

  const runAnalysis = () => {
    if (!preview || analyzePlant.isPending) return;
    analyzePlant.mutate({ data: { imageData: preview, fileName: fileName || undefined, organ } }, {
      onSuccess: (data) => setResults(data),
    });
  };

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-cream text-forest">
      <div className="ambient-leaf ambient-leaf-one" aria-hidden="true" />
      <div className="ambient-leaf ambient-leaf-two" aria-hidden="true" />
      <Header />
      <main className="relative mx-auto max-w-[1180px] px-5 pb-16 pt-10 sm:px-8 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-20">
        <section className="mb-10 max-w-3xl animate-rise sm:mb-14">
          <div className="mb-5 flex items-center gap-3 text-[0.7rem] font-semibold tracking-[0.16em] text-leaf uppercase"><span className="h-px w-7 bg-leaf" /> Herramienta para cuidar mejor</div>
          <h1 className="font-display max-w-2xl text-[clamp(2.75rem,7vw,5.55rem)] font-medium leading-[0.94] tracking-[-0.06em] text-forest">Mira tu planta.<br /><span className="text-moss">Entiende lo que necesita.</span></h1>
          <p className="mt-6 max-w-[570px] text-base leading-7 text-muted-olive sm:text-lg sm:leading-8">Una fotografía puede ser el primer paso para cuidarla con calma. AgroScan compara sus señales visibles y te muestra las posibilidades más cercanas.</p>
        </section>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)] lg:gap-10">
          <section className="animate-rise animation-delay-1 rounded-[1.6rem] border border-sage/50 bg-white-soft/55 p-5 shadow-[0_18px_55px_hsl(var(--forest)/0.06)] sm:p-7" aria-labelledby="upload-title">
            <div className="mb-6 flex items-start justify-between gap-5"><div><p className="mb-2 text-[0.68rem] font-bold tracking-[0.14em] text-leaf uppercase">01 · Fotografía</p><h2 id="upload-title" className="font-display text-[1.6rem] font-medium tracking-[-0.035em]">Comencemos por verla</h2></div><span className="rounded-full border border-sage/60 bg-sage/30 px-3 py-1.5 text-[0.66rem] font-semibold text-muted-olive">1 de 2</span></div>
            <Dropzone preview={preview} fileName={fileName} onFile={handleFile} onClear={clearFile} />
            {fileError && <p className="mt-3 flex items-center gap-2 text-sm text-terracotta" role="alert" data-testid="status-file-error"><AlertCircle size={15} /> {fileError}</p>}
            <div className="my-7 h-px bg-sage/45" />
            <div className="mb-6"><p className="mb-2 text-[0.68rem] font-bold tracking-[0.14em] text-leaf uppercase">02 · Enfoque</p><h2 className="font-display text-[1.6rem] font-medium tracking-[-0.035em]">Señala dónde mirar</h2></div>
            <OrganPicker value={organ} onChange={setOrgan} />
            <button type="button" onClick={runAnalysis} disabled={!preview || analyzePlant.isPending} className="primary-action mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl bg-leaf px-5 py-4 text-sm font-bold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-forest disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0" data-testid="button-analyze-plant">
              {analyzePlant.isPending ? <><LoaderCircle size={17} className="animate-spin" /> Analizando planta…</> : <><Sparkles size={17} /> Analizar planta <ArrowUpRight size={16} /></>}
            </button>
            <p className="mt-3 text-center text-[0.69rem] leading-5 text-muted-olive">Solo se envía la imagen necesaria para esta lectura.</p>
          </section>

          <section className="animate-rise animation-delay-2" aria-labelledby="results-title">
            <div className="mb-5 flex items-end justify-between gap-4"><div><p className="mb-2 text-[0.68rem] font-bold tracking-[0.14em] text-leaf uppercase">Lectura</p><h2 id="results-title" className="font-display text-[1.8rem] font-medium tracking-[-0.04em]">Posibilidades cercanas</h2></div>{results.length > 0 && <span className="mb-1 text-sm text-muted-olive">{results.length}/5</span>}</div>
            <ResultsPanel results={results} isPending={analyzePlant.isPending} error={analyzePlant.error} onRetry={runAnalysis} />
            <div className="mt-6 flex gap-3 rounded-2xl border border-sage/45 bg-sage/18 p-4 text-muted-olive"><span className="mt-0.5 shrink-0 text-moss"><ShieldCheck size={16} /></span><p className="text-[0.73rem] leading-5"><strong className="font-semibold text-forest">Una guía, no un diagnóstico.</strong> Los resultados son orientativos y no sustituyen la evaluación de un especialista.</p></div>
          </section>
        </div>

        <footer className="mt-14 flex flex-col gap-4 border-t border-sage/45 pt-5 text-[0.7rem] text-muted-olive sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <p>Identificación mediante la API de Pl@ntNet</p>
          <p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-leaf" /> Hecho para observar con más atención</p>
        </footer>
      </main>
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;