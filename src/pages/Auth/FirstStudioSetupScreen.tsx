import { useState, type FormEvent } from 'react';
import { ArrowRight, Loader2, LogOut, Sparkles } from 'lucide-react';
import { BrandLockup } from '../../components/layout/BrandLockup';
import { Button } from '../../components/shared/Button';
import { useAuth } from '../../hooks/useAuth';

export function FirstStudioSetupScreen() {
  const { completeStudioSetup, signOut } = useAuth();
  const [name, setName] = useState('Mystic Lore Studio');
  const [units, setUnits] = useState<'mm' | 'cm' | 'in'>('in');
  const [currency, setCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !/^[A-Z]{3}$/.test(currency)) {
      setError('Enter a studio name and a three-letter currency code.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await completeStudioSetup({
        currency,
        name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        units,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The studio could not be created. Retry safely.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-midnight px-5 py-8 text-stardust">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,.2),transparent_24rem),radial-gradient(circle_at_80%_80%,rgba(27,58,99,.28),transparent_28rem)]" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-bronze/30 bg-midnight/78 p-5 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-xl sm:p-8">
        <BrandLockup size="sidebar" subtitle="First studio setup" />
        <div className="mt-7 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-ember/42 bg-ember/12 text-ember"><Sparkles aria-hidden="true" size={20} /></span><div><h1 className="font-display text-3xl text-stardust sm:text-4xl">Name your atelier.</h1><p className="mt-3 text-sm leading-7 text-stardust/60">This creates your private owner workspace, membership, and default measurement policy. Collaboration features are not enabled.</p></div></div>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-xs uppercase tracking-[.12em] text-stardust/48">Studio name<input autoFocus className="field mt-2" maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs uppercase tracking-[.12em] text-stardust/48">Canonical spec unit<select className="field mt-2" onChange={(event) => setUnits(event.target.value as 'mm' | 'cm' | 'in')} value={units}><option value="in">Inches</option><option value="cm">Centimeters</option><option value="mm">Millimeters</option></select></label>
            <label className="block text-xs uppercase tracking-[.12em] text-stardust/48">Currency<input className="field mt-2 uppercase" maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} pattern="[A-Z]{3}" value={currency} /></label>
          </div>
          {error ? <p className="rounded-2xl border border-ember/35 bg-ember/10 px-4 py-3 text-sm leading-6 text-stardust/72" role="alert">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button icon={<LogOut aria-hidden="true" size={16} />} onClick={() => void signOut()} type="button" variant="ghost">Sign out</Button>
            <Button disabled={isSubmitting} icon={isSubmitting ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : <ArrowRight aria-hidden="true" size={16} />} type="submit">{isSubmitting ? 'Creating studio…' : 'Enter Studio'}</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
