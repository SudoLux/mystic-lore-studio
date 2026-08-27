import { AlertTriangle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { PublicCutPreview as Preview } from '../../domains/portfolio';
import { PublicPortfolioPage } from '../PublicPortfolio';

export function PublicCutPreview({ onClose, preview }: { onClose: () => void; preview: Preview }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return (
    <div aria-labelledby="public-cut-preview-title" aria-modal="true" className="fixed inset-0 z-50 overflow-y-auto bg-midnight" role="dialog">
      <div className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-bronze/22 bg-midnight/95 px-4 py-3 backdrop-blur-xl sm:px-7">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ember">Exact anonymous rendering</p>
          <h2 className="font-display text-xl text-stardust" id="public-cut-preview-title">Public Cut Preview</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:inline-flex ${preview.findings.length ? 'border-red-400/35 text-red-200' : 'border-emerald-400/35 text-emerald-200'}`}>
            {preview.findings.length ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
            {preview.findings.length ? `${preview.findings.length} privacy blockers` : 'Privacy scan passed'}
          </span>
          <button aria-label="Close Public Cut preview" className="flex h-11 w-11 items-center justify-center rounded-full border border-bronze/28 text-stardust hover:border-ember/50 hover:text-ember" onClick={onClose} ref={closeRef} type="button"><X size={19} /></button>
        </div>
      </div>
      {(preview.findings.length || preview.warnings.length || preview.isStale) ? (
        <aside className="border-b border-bronze/18 bg-charcoal px-5 py-4 text-sm text-stardust/70 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {preview.isStale ? <p className="flex items-center gap-2 text-amber-200"><AlertTriangle size={15} /> One or more selections are stale against their latest approved source.</p> : null}
            {preview.warnings.map((warning) => <p className="flex items-center gap-2" key={warning}><AlertTriangle size={15} className="text-amber-300" /> {warning}</p>)}
            {preview.findings.map((finding) => <p className="flex items-center gap-2 text-red-200" key={finding.path}><AlertTriangle size={15} /> {finding.path}: {finding.reason}</p>)}
          </div>
        </aside>
      ) : (
        <aside className="border-b border-emerald-400/18 bg-emerald-950/20 px-5 py-3 text-sm text-emerald-100/80"><p className="mx-auto flex max-w-7xl items-center gap-2"><CheckCircle2 size={15} /> This is the exact payload and component anonymous visitors will receive.</p></aside>
      )}
      <PublicPortfolioPage isPublished snapshot={preview.snapshot} />
    </div>
  );
}
