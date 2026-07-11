import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, QrCode, Send } from 'lucide-react';
import { cn } from '../../lib/classes';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

type PortfolioShareCardProps = {
  copiedValue: string | null;
  displayName: string;
  headline: string;
  isPublished: boolean;
  onCopy: (value: string) => void;
  portfolioUrl: string;
};

export function PortfolioShareCard({
  copiedValue,
  displayName,
  headline,
  isPublished,
  onCopy,
  portfolioUrl,
}: PortfolioShareCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const recruiterMessage = `Hi, here’s a link to my selected apparel design and technical development work: ${portfolioUrl}`;
  const copiedLink = copiedValue === portfolioUrl;
  const copiedMessage = copiedValue === recruiterMessage;

  useEffect(() => {
    let active = true;
    const qrTarget = toQrTarget(portfolioUrl);
    void QRCode.toDataURL(qrTarget, {
      color: { dark: '#0b0d0e', light: '#f0e7d7' },
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 216,
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (active) setQrDataUrl(null);
    });

    return () => {
      active = false;
    };
  }, [portfolioUrl]);

  return (
    <Card className="relative overflow-hidden border-teal/24 bg-[linear-gradient(135deg,rgba(45,92,107,0.14),rgba(9,12,13,0.92)_48%,rgba(154,108,60,0.12))] p-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(74,156,170,0.2),transparent_26%),radial-gradient(circle_at_92%_84%,rgba(200,155,60,0.18),transparent_24%)]" />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10 lg:p-8">
        <div className="mx-auto w-full max-w-sm rounded-[1.35rem] border border-stardust/14 bg-[#0a0d0e]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ember">Mystic Lore Studio</span>
            <span className={cn(
              'rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.14em]',
              isPublished ? 'border-teal/35 bg-teal/10 text-teal' : 'border-bronze/28 bg-bronze/10 text-stardust/45',
            )}>
              {isPublished ? 'Live portfolio' : 'Preview link'}
            </span>
          </div>
          <div className="mt-12 border-l border-ember/65 pl-4">
            <p className="font-display text-3xl leading-tight text-stardust">{displayName || 'Your Name'}</p>
            <p className="mt-3 text-sm leading-6 text-stardust/62">{headline || 'Independent apparel design and technical development.'}</p>
          </div>
          <div className="mt-10 border-t border-bronze/18 pt-4">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-stardust/36">Portfolio</p>
            <p className="mt-2 truncate text-xs text-stardust/68">{portfolioUrl}</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ember/30 bg-ember/10 text-ember">
              <QrCode aria-hidden="true" size={20} />
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">Share Card</p>
              <h2 className="mt-1 text-xl font-semibold text-stardust">A clean link for the next conversation</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-stardust/54">Use this card on a resume, in a PDF, or wherever a recruiter needs a quick way into your selected work.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-bronze/30 bg-stardust p-2 shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
              {qrDataUrl ? (
                <img alt={`QR code for ${portfolioUrl}`} className="h-full w-full" src={qrDataUrl} />
              ) : (
                <QrCode aria-hidden="true" className="text-midnight/55" size={44} />
              )}
            </div>
            <div className="min-w-0 rounded-xl border border-bronze/20 bg-midnight/34 p-4">
              <p className="text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-stardust/38">Main portfolio link</p>
              <p className="mt-2 break-all text-sm text-stardust/78">{portfolioUrl}</p>
              {!isPublished ? <p className="mt-3 text-xs leading-5 text-ember/88">Publish the profile before sharing this link outside the studio.</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              icon={copiedLink ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
              onClick={() => onCopy(portfolioUrl)}
              variant="secondary"
            >
              {copiedLink ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              icon={copiedMessage ? <Check aria-hidden="true" size={16} /> : <Send aria-hidden="true" size={16} />}
              onClick={() => onCopy(recruiterMessage)}
              variant="primary"
            >
              {copiedMessage ? 'Copied' : 'Copy Recruiter Message'}
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-stardust/42">{recruiterMessage}</p>
        </div>
      </div>
    </Card>
  );
}

function toQrTarget(portfolioUrl: string) {
  if (/^https?:\/\//.test(portfolioUrl)) return portfolioUrl;
  if (typeof window === 'undefined') return portfolioUrl;
  return new URL(portfolioUrl, window.location.origin).toString();
}
