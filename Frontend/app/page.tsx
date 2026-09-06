'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Cloud,
  LockKeyhole,
  MapPinned,
  Play,
  Sparkles,
  TimerReset,
  WandSparkles,
} from 'lucide-react';

const typingCopy = 'Own the day before it owns you.';

function useTyping(text: string) {
  const [value, setValue] = useState('');
  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setValue(text.slice(0, index));
      if (index === text.length) window.clearInterval(timer);
    }, 54);
    return () => window.clearInterval(timer);
  }, [text]);
  return value;
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.16 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}>{children}</div>;
}

const screenshots = {
  today: '/images/today_up.jpg',
  plan: '/images/plan.jpg',
  library: '/images/library_routine.jpg',
  reminders: '/images/today_down.jpg',
  settings: '/images/settings.jpg',
};

const workflow = [
  { number: '01', title: 'Build the system', text: 'Shape routines around the work you actually do: study, work, training, recovery, and the resources that make each block real.' },
  { number: '02', title: 'Lock tomorrow', text: 'Turn a reusable routine into a timed plan before the day starts. Clear boundaries replace vague intentions.' },
  { number: '03', title: 'Execute honestly', text: 'Today follows the clock, tracks what happened, and makes missed work visible without turning your day into a guilt loop.' },
];

const productFeatures = [
  { icon: WandSparkles, label: 'Reusable routines', text: 'Create once. Reuse across weekdays, seasons, and different versions of your life.' },
  { icon: LockKeyhole, label: 'A plan with edges', text: 'Tomorrow becomes a real plan with time windows, areas, goals, notes, and selected videos.' },
  { icon: TimerReset, label: 'Live execution', text: 'The active block is based on real time, not on what you last tapped.' },
  { icon: MapPinned, label: 'Place-aware memory', text: 'Attach reminders to places, shops, offices, gyms, or your own home.' },
  { icon: Cloud, label: 'Local-first safety', text: 'Your routine stays usable on the phone, then backs up when the connection is ready.' },
  { icon: BellRing, label: 'Gentle accountability', text: 'Notifications, missed-block handling, and completion history keep the system honest.' },
];

export default function HomePage() {
  const typedText = useTyping(typingCopy);

  return (
    <main className="overflow-hidden bg-ink text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl">
        <div className="container-shell flex h-[76px] items-center justify-between">
          <a href="#top" className="flex items-center gap-3"><span className="brand-mark"><span /></span><span className="font-heading text-lg font-bold tracking-tight text-white">Routine<span className="text-cyan">OS</span></span></a>
          <nav className="hidden items-center gap-8 text-[13px] font-semibold text-muted md:flex"><a href="#system" className="transition hover:text-white">The system</a><a href="#screens" className="transition hover:text-white">Inside the app</a><a href="#difference" className="transition hover:text-white">Why RoutineOS</a></nav>
          <a href="#start" className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2.5 text-xs font-black text-ink transition hover:-translate-y-0.5 hover:bg-white">See the system <ArrowRight className="h-3.5 w-3.5" /></a>
        </div>
      </header>

      <section id="top" className="relative isolate min-h-[780px] overflow-hidden border-b border-white/[0.07] pt-[76px]">
        <div className="hero-wash" />
        <div className="container-shell relative z-10 grid min-h-[704px] items-center gap-14 py-20 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="max-w-2xl"><div className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> A routine execution OS</div><h1 className="mt-6 font-heading text-[clamp(3.2rem,7vw,6.8rem)] font-bold leading-[0.94] tracking-[-0.055em] text-white">Structure for the days that matter.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-muted md:text-xl">RoutineOS turns your intentions into a repeatable system: build your routine, lock tomorrow, and follow what is actually happening now.</p><div className="mt-8 flex flex-wrap items-center gap-3"><a href="#screens" className="inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-black text-ink transition hover:-translate-y-1 hover:bg-white">Explore the app <ArrowRight className="h-4 w-4" /></a><a href="#system" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-white transition hover:border-cyan/50 hover:bg-white/[0.08]"><Play className="h-4 w-4 fill-cyan text-cyan" /> How it works</a></div><div className="mt-12 flex items-center gap-3 font-mono text-sm text-cyan/90"><span className="h-4 w-px bg-cyan" /><span>{typedText}<span className="typing-cursor" /></span></div></div>
          <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto"><div className="phone-shadow" /><div className="screenshot-frame hero-phone rotate-[2deg]"><div className="screenshot-topbar"><span>ROUTINEOS / TODAY</span><span>LIVE</span></div><Image src={screenshots.today} alt="RoutineOS Today screen showing active execution and progress" width={720} height={1280} priority className="h-auto w-full" /></div><div className="absolute -bottom-8 -left-8 hidden w-44 rotate-[-6deg] overflow-hidden rounded-2xl border border-white/15 bg-panel p-1 shadow-2xl sm:block"><Image src={screenshots.plan} alt="RoutineOS planning screen" width={720} height={1280} className="w-full rounded-xl" /></div><div className="absolute -right-8 top-20 hidden rounded-full border border-cyan/25 bg-ink/80 px-4 py-2 font-mono text-[10px] font-bold tracking-[0.18em] text-cyan shadow-xl sm:block">REAL TIME / REAL LIFE</div></div>
        </div>
      </section>

      <section className="border-b border-white/[0.07] bg-panel py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.18em] text-muted"><span>Study systems</span><span className="text-cyan">•</span><span>Work blocks</span><span className="text-cyan">•</span><span>Fitness loops</span><span className="text-cyan">•</span><span>Recovery time</span><span className="text-cyan">•</span><span>Place-aware reminders</span></div></section>

      <section id="system" className="container-shell py-28"><Reveal className="max-w-3xl"><p className="eyebrow">A calmer operating system</p><h2 className="mt-5 font-heading text-4xl font-bold leading-tight tracking-[-0.04em] text-white md:text-6xl">Most todo apps collect tasks. RoutineOS gives the day a shape.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-muted">The difference is not another list. It is the loop between a reusable routine, a committed plan, and an honest record of execution.</p></Reveal><div className="mt-20 grid gap-6 md:grid-cols-3">{workflow.map((item, index) => <Reveal key={item.number} className="workflow-item"><span className="font-mono text-sm text-cyan">{item.number}</span><div className="mt-10 h-px w-full bg-white/10" /><h3 className="mt-6 font-heading text-2xl font-bold text-white">{item.title}</h3><p className="mt-4 text-sm leading-7 text-muted">{item.text}</p>{index < workflow.length - 1 && <ArrowRight className="mt-8 hidden h-5 w-5 text-cyan/60 md:block" />}</Reveal>)}</div></section>

      <section id="screens" className="border-y border-white/[0.07] bg-panel py-28"><div className="container-shell"><Reveal className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div className="max-w-2xl"><p className="eyebrow">Inside the product</p><h2 className="mt-5 font-heading text-4xl font-bold tracking-[-0.04em] text-white md:text-6xl">Every screen has a job.</h2></div><p className="max-w-sm text-sm leading-7 text-muted">No decorative dashboard theater. These are the actual surfaces where the system gets built, scheduled, executed, and remembered.</p></Reveal>
          <Reveal className="showcase-grid mt-16"><div className="showcase-copy"><span className="section-number">01 / TODAY</span><h3>Execution, not intention</h3><p>Today follows the clock. The active block, timeline, progress, and completion state stay grounded in the real day.</p><div className="showcase-points"><span><CheckCircle2 /> Done and skipped states</span><span><TimerReset /> Automatic missed-block handling</span></div></div><div className="showcase-image"><Image src={screenshots.today} alt="RoutineOS Today screen" width={720} height={1280} /></div></Reveal>
          <Reveal className="showcase-grid showcase-reverse mt-24"><div className="showcase-copy"><span className="section-number">02 / PLAN</span><h3>Tomorrow gets edges</h3><p>Reusable routines become a draft plan with time, area, videos, goals, and notes. Review it, finish it, then lock it.</p><div className="showcase-points"><span><LockKeyhole /> Fixed structure before the day</span><span><WandSparkles /> Resources attached to the right area</span></div></div><div className="showcase-image"><Image src={screenshots.plan} alt="RoutineOS Plan screen" width={720} height={1280} /></div></Reveal>
          <div className="mt-24 grid gap-6 md:grid-cols-3">{[['03 / LIBRARY', 'Build once, reuse often.', screenshots.library, 'Routines and areas live in one place.'], ['04 / REMINDERS', 'Remember in context.', screenshots.reminders, 'Place-aware reminders meet real life.'], ['05 / SETTINGS', 'Your system, your rules.', screenshots.settings, 'Permissions, backup, notifications, and preferences.']].map(([label, title, src, text]) => <div key={label} className="mini-showcase"><div className="mini-showcase-image"><Image src={src} alt={title} width={720} height={1280} /></div><span className="section-number">{label}</span><h3>{title}</h3><p>{text}</p></div>)}</div>
        </div></section>

      <section id="difference" className="container-shell py-28"><Reveal className="max-w-3xl"><p className="eyebrow">What makes it different</p><h2 className="mt-5 font-heading text-4xl font-bold tracking-[-0.04em] text-white md:text-6xl">Less noise. More continuity.</h2><p className="mt-6 text-lg leading-8 text-muted">RoutineOS is for people who do not need another inbox. It is for building a rhythm that survives busy weeks, missed blocks, changing priorities, and imperfect motivation.</p></Reveal><div className="feature-list mt-16 grid gap-x-12 gap-y-0 md:grid-cols-2">{productFeatures.map(({ icon: Icon, label, text }) => <Reveal key={label} className="feature-line"><Icon className="h-5 w-5 shrink-0 text-cyan" /><div><h3>{label}</h3><p>{text}</p></div></Reveal>)}</div></section>

      <section id="start" className="border-t border-white/[0.07] bg-ink py-28"><div className="container-shell"><Reveal className="relative overflow-hidden rounded-[2rem] border border-cyan/20 bg-[#10181d] px-6 py-16 text-center md:px-16"><div className="cta-grid" /><div className="relative z-10 mx-auto max-w-3xl"><span className="brand-mark mx-auto"><span /></span><h2 className="mt-7 font-heading text-4xl font-bold tracking-[-0.04em] text-white md:text-6xl">Your day deserves a system.</h2><p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted">Build the routine once. Make tomorrow clear. Show up for today.</p><a href="#top" className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-7 py-4 text-sm font-black text-ink transition hover:-translate-y-1 hover:bg-white">Back to the beginning <ArrowRight className="h-4 w-4" /></a></div></Reveal></div></section>
      <footer className="border-t border-white/[0.07] py-8"><div className="container-shell flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row"><span className="font-heading text-sm font-bold text-white">Routine<span className="text-cyan">OS</span></span><span>Built for days with intention.</span></div></footer>
    </main>
  );
}
