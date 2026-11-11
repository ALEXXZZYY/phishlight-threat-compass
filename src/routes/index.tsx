import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleAlert,
  Clock3,
  FileSearch,
  Globe2,
  History,
  Info,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Menu,
  Moon,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import kavachphishLogo from "@/assets/kavachphish-logo.png.asset.json";
import { analyzeEmail, analyzeUrl, getAnalyzerHealth } from "@/lib/phishguard-api";
import { downloadScanReport, useScanHistory } from "@/lib/phishguard-history";
import type { AnalyzerHealth, ScanKind, ScanPrediction, ScanRecord } from "@/lib/phishguard.types";

const APP_TITLE = "PhishGuard MLX";
const THEME_STORAGE_KEY = "phishguard.theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhishGuard MLX — Threat Analysis Workspace" },
      { name: "description", content: "Analyze suspicious URLs and email with PhishGuard MLX phishing detection." },
      { property: "og:title", content: "PhishGuard MLX — Threat Analysis Workspace" },
      { property: "og:description", content: "Analyze suspicious URLs and email with PhishGuard MLX phishing detection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhishGuardApp,
});

type View = "dashboard" | "url" | "email" | "history" | "about";

const navigation: { id: View; label: string; icon: typeof Activity }[] = [
  { id: "dashboard", label: "Overview", icon: Activity },
  { id: "url", label: "URL scanner", icon: Globe2 },
  { id: "email", label: "Email scanner", icon: Mail },
  { id: "history", label: "Scan history", icon: History },
  { id: "about", label: "About project", icon: Info },
];

function PhishGuardApp() {
  const [view, setView] = useState<View>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [health, setHealth] = useState<AnalyzerHealth>({
    status: "checking",
    urlModelReady: false,
    emailModelReady: false,
  });
  const [healthChecked, setHealthChecked] = useState(false);
  const { records, ready, addRecord, clearRecords } = useScanHistory();

  const refreshHealth = async () => {
    const current = await getAnalyzerHealth();
    setHealth(current);
    setHealthChecked(true);
  };

  useEffect(() => {
    let active = true;
    void getAnalyzerHealth().then((current) => {
      if (active) {
        setHealth(current);
        setHealthChecked(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Keep the selected theme active for this page if browser storage is unavailable.
    }
  };

  const goTo = (next: View) => {
    setView(next);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 scan-grid pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_18%_0%,color-mix(in_oklab,var(--color-cyber-cyan)_9%,transparent),transparent_42%)] pointer-events-none" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-[1700px]">
        {mobileNavOpen && <button aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden" />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-border bg-surface-deep/95 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-[84px] items-center gap-3 border-b border-border px-6">
            <img src={kavachphishLogo.url} alt="PhishGuard MLX" className="size-10 shrink-0 rounded-lg border border-cyber-lime/35 object-cover glow-lime" />
            <div><div className="text-[15px] font-semibold">PhishGuard <span className="text-cyber-lime">MLX</span></div><div className="font-mono text-[10px] text-muted-foreground">THREAT ANALYSIS SYSTEM</div></div>
          </div>
          <div className="px-5 pt-7 pb-2 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">WORKSPACE</div>
          <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.id === view;
              return <button key={item.id} onClick={() => goTo(item.id)} className={`group flex h-11 items-center gap-3 rounded-md border px-3 text-left text-sm transition-colors ${active ? "border-cyber-lime/20 bg-cyber-lime/10 text-cyber-lime" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`} aria-current={active ? "page" : undefined}>
                <Icon size={17} className={active ? "text-cyber-lime" : ""} /><span>{item.label}</span>{item.id === "history" && records.length > 0 && <span className="ml-auto font-mono text-[10px] text-muted-foreground">{records.length}</span>}
              </button>;
            })}
          </nav>
          <div className="mx-5 mt-auto mb-5 border-t border-border pt-4">
            <ServiceStatus health={health} />
            <div className="mt-4 flex items-center justify-between font-mono text-[10px] text-muted-foreground"><span>APP VERSION</span><span>1.0.0</span></div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></Button>
              <div className="font-mono text-xs text-muted-foreground"><span className="text-cyber-cyan">SYSTEM</span><span className="mx-2 text-border">/</span><span className="uppercase text-foreground">{navigation.find((item) => item.id === view)?.label}</span></div>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="hidden items-center gap-2 font-mono text-[10px] text-muted-foreground sm:flex"><span className={`size-1.5 rounded-full ${health.status === "online" ? "bg-cyber-lime" : "bg-cyber-red"}`} />MODEL API {health.status === "online" ? "CONNECTED" : "UNAVAILABLE"}</div>
              <Button variant="outline" size="icon" className="size-9 border-border" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</Button>
              <div className="h-5 w-px bg-border" />
              <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><LockKeyhole size={13} /> LOCAL HISTORY</span>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
            {view === "dashboard" && <Dashboard records={records} ready={ready} health={health} onNavigate={goTo} />}
            {view === "url" && <Scanner kind="url" health={health} onScan={addRecord} />}
            {view === "email" && <Scanner kind="email" health={health} onScan={addRecord} />}
            {view === "history" && <HistoryPage records={records} ready={ready} onClear={clearRecords} />}
            {view === "about" && <AboutPage health={health} onNavigate={goTo} onRefreshHealth={refreshHealth} />}
          </main>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 font-mono text-[9px] tracking-[0.12em] text-muted-foreground sm:px-10">
            <span>PhishGuard MLX <span className="text-border">//</span> SECURITY ANALYSIS WORKSPACE</span>
            <span>NO URLS OPENED · NO ATTACHMENTS EXECUTED</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ServiceStatus({ health }: { health: AnalyzerHealth }) {
  const labels: Record<AnalyzerHealth["status"], string> = {
    checking: "Checking model service",
    unconfigured: "Model service not connected",
    online: "Model service online",
    "models-missing": "Trained models unavailable",
    offline: "Model service unreachable",
  };
  const statusColor = health.status === "online" ? "text-cyber-lime" : health.status === "checking" ? "text-cyber-cyan" : "text-cyber-red";
  return <div className="rounded-md border border-border bg-surface-raised p-3">
    <div className="mb-3 flex items-center gap-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground"><Radar size={13} /> ANALYSIS ENGINE</div>
    <div className={`flex items-center gap-2 text-xs ${statusColor}`}><span className={`size-1.5 rounded-full ${health.status === "online" ? "animate-scan-pulse bg-cyber-lime" : health.status === "checking" ? "bg-cyber-cyan" : "bg-cyber-red"}`} />{labels[health.status]}</div>
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 font-mono text-[9px] text-muted-foreground">
      <span>URL MODEL</span><span className="text-right">{health.urlModelReady ? "READY" : "OFFLINE"}</span>
      <span>EMAIL MODEL</span><span className="text-right">{health.emailModelReady ? "READY" : "OFFLINE"}</span>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyber-cyan"><span className="text-cyber-lime">●</span>{eyebrow}</div><h1 className="text-2xl font-semibold tracking-tight sm:text-[30px]">{title}</h1><p className="mt-2 max-w-[680px] text-sm text-muted-foreground">{description}</p></div>
    {children}
  </div>;
}

function Metric({ icon: Icon, label, value, note, tone = "lime" }: { icon: typeof Activity; label: string; value: string; note: string; tone?: "lime" | "cyan" | "red" }) {
  const tint = tone === "red" ? "text-cyber-red" : tone === "cyan" ? "text-cyber-cyan" : "text-cyber-lime";
  const bg = tone === "red" ? "bg-cyber-red/10" : tone === "cyan" ? "bg-cyber-cyan/10" : "bg-cyber-lime/10";
  return <div className="border border-border bg-card/80 p-4 sm:p-5"><div className="mb-5 flex items-start justify-between"><span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">{label}</span><span className={`grid size-8 place-items-center rounded-md ${bg} ${tint}`}><Icon size={16} /></span></div><div className="font-mono text-[25px] tracking-tight sm:text-[30px]">{value}</div><div className="mt-2 text-[11px] text-muted-foreground">{note}</div></div>;
}

function Dashboard({ records, ready, health, onNavigate }: { records: ScanRecord[]; ready: boolean; health: AnalyzerHealth; onNavigate: (view: View) => void }) {
  const total = records.length;
  const safe = records.filter((record) => record.prediction === "SAFE").length;
  const risky = records.filter((record) => record.prediction !== "SAFE").length;
  const urls = records.filter((record) => record.kind === "url").length;
  const emails = records.filter((record) => record.kind === "email").length;
  const riskPercent = total ? Math.round((risky / total) * 100) : 0;
  const safePercent = total ? Math.round((safe / total) * 100) : 0;
  const last24Hours = records.filter((record) => Date.now() - new Date(record.createdAt).getTime() < 24 * 60 * 60 * 1000).length;
  const modelReady = health.urlModelReady && health.emailModelReady;

  return <>
    <PageHeading eyebrow="SECURITY OVERVIEW / 01" title="Threat analysis overview" description="Monitor your scan activity and analyze suspicious URLs or messages.">
      <div className={`inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] ${modelReady ? "border-cyber-lime/30 bg-cyber-lime/5 text-cyber-lime" : "border-cyber-red/30 bg-cyber-red/5 text-cyber-red"}`}><span className={`size-1.5 rounded-full ${modelReady ? "animate-scan-pulse bg-cyber-lime" : "bg-cyber-red"}`} />{modelReady ? "MODEL ENGINE READY" : "MODEL ENGINE NOT READY"}</div>
    </PageHeading>

    {!modelReady && <div className="mb-6 flex flex-col gap-3 border border-cyber-red/25 bg-cyber-red/5 p-4 sm:flex-row sm:items-start">
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-cyber-red" />
      <div className="min-w-0"><div className="text-sm font-medium text-cyber-red">No trained analysis model is available</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{health.status === "checking" ? "Checking the analysis service…" : health.status === "unconfigured" ? "Connect a trained Python model service to enable scans. Until then, this workspace will not generate predictions." : health.status === "models-missing" ? "The API responded, but it reports that one or both trained models are missing. No predictions will be shown." : "The configured analysis service could not be reached. No predictions will be shown."}</p></div>
      <Badge variant="outline" className="w-fit shrink-0 border-cyber-red/30 font-mono text-[9px] text-cyber-red">FAIL-CLOSED</Badge>
    </div>}

    <section aria-label="Scan metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={FileSearch} label="TOTAL ANALYSES" value={ready ? total.toLocaleString() : "—"} note="URLs + email messages" />
      <Metric icon={ShieldCheck} label="SAFE CLASSIFIED" value={ready ? safe.toLocaleString() : "—"} note={total ? `${safePercent}% of your scans` : "No scans recorded"} tone="cyan" />
      <Metric icon={ShieldAlert} label="THREATS FLAGGED" value={ready ? risky.toLocaleString() : "—"} note={total ? `${riskPercent}% suspicious or phishing` : "No scans recorded"} tone="red" />
      <Metric icon={Zap} label="SCANNED · 24H" value={ready ? last24Hours.toLocaleString() : "—"} note="From this browser" />
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="border border-border bg-card/80 p-5 sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3"><div><div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">LOCAL SCAN DATA</div><h2 className="mt-2 text-lg font-medium">Analysis activity</h2></div><BarChart3 size={17} className="text-cyber-cyan" /></div>
        <ActivityChart records={records} />
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4"><TinyStat label="URL SCANS" value={urls} icon={Globe2} /><TinyStat label="EMAIL SCANS" value={emails} icon={Mail} /><TinyStat label="SAFE" value={safe} icon={Check} tone="cyan" /><TinyStat label="FLAGGED" value={risky} icon={ShieldAlert} tone="red" /></div>
        <p className="mt-4 text-[10px] text-muted-foreground">Counts include only completed trained-model predictions from this browser.</p>
      </div>
      <div className="border border-border bg-card/80 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">ENGINE STATUS</div><h2 className="mt-2 text-lg font-medium">Model readiness</h2></div><Activity size={17} className={modelReady ? "text-cyber-lime" : "text-cyber-red"} /></div>
        <div className="space-y-3"><ModelRow name="URL detection" ready={health.urlModelReady} detail="URL feature classifier" /><ModelRow name="Email detection" ready={health.emailModelReady} detail="Email text classifier" /></div>
        <div className="mt-5 border-t border-border pt-4"><div className="mb-3 font-mono text-[9px] tracking-[0.14em] text-muted-foreground">QUICK ACTIONS</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Button variant="outline" className="h-10 justify-between border-border bg-surface-raised text-xs hover:border-cyber-cyan/30 hover:text-cyber-cyan" onClick={() => onNavigate("url")}><span className="flex items-center gap-2"><Globe2 size={15} />Scan a URL</span><ArrowRight size={14} /></Button><Button variant="outline" className="h-10 justify-between border-border bg-surface-raised text-xs hover:border-cyber-cyan/30 hover:text-cyber-cyan" onClick={() => onNavigate("email")}><span className="flex items-center gap-2"><Mail size={15} />Scan an email</span><ArrowRight size={14} /></Button></div></div>
      </div>
    </section>

    <section className="mt-6 border border-border bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><div className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground">RECENT ACTIVITY</div><h2 className="mt-1 text-base font-medium">Latest analyses</h2></div><Button variant="ghost" size="sm" className="text-xs text-cyber-cyan hover:text-cyber-cyan" onClick={() => onNavigate("history")}>View all <ArrowUpRight size={14} /></Button></div>
      <RecentScans records={records.slice(0, 5)} ready={ready} />
    </section>
    <div className="mt-6 flex items-start gap-3 border border-cyber-cyan/15 bg-cyber-cyan/5 p-4"><Info size={16} className="mt-0.5 shrink-0 text-cyber-cyan" /><p className="text-xs leading-5 text-muted-foreground">Model classifications are decision-support signals, not proof that a destination is safe. Scan results here stay in your browser and are not sent to a shared history.</p></div>
  </>;
}

function TinyStat({ label, value, icon: Icon, tone = "lime" }: { label: string; value: number; icon: typeof Activity; tone?: "lime" | "cyan" | "red" }) {
  const toneClass = tone === "red" ? "text-cyber-red" : tone === "cyan" ? "text-cyber-cyan" : "text-cyber-lime";
  return <div className="flex items-center gap-2"><Icon size={13} className={toneClass} /><div><div className="font-mono text-sm">{value}</div><div className="font-mono text-[8px] text-muted-foreground">{label}</div></div></div>;
}

function ModelRow({ name, detail, ready }: { name: string; detail: string; ready: boolean }) {
  return <div className="flex items-center gap-3 border border-border bg-surface-raised p-3"><span className={`grid size-8 place-items-center rounded-md ${ready ? "bg-cyber-lime/10 text-cyber-lime" : "bg-cyber-red/10 text-cyber-red"}`}>{ready ? <Check size={15} /> : <X size={15} />}</span><div className="min-w-0 flex-1"><div className="text-xs font-medium">{name}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{detail}</div></div><span className={`font-mono text-[9px] ${ready ? "text-cyber-lime" : "text-cyber-red"}`}>{ready ? "READY" : "OFFLINE"}</span></div>;
}

function ActivityChart({ records }: { records: ScanRecord[] }) {
  const bars = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const dayRecords = records.filter((record) => {
      const time = new Date(record.createdAt).getTime();
      return time >= date.getTime() && time < next.getTime();
    });
    return { date, all: dayRecords.length, risk: dayRecords.filter((record) => record.prediction !== "SAFE").length };
  }), [records]);
  const max = Math.max(4, ...bars.map((bar) => bar.all));
  return <div className="relative h-[220px] border-b border-l border-border px-3 pb-0 pt-3" aria-label="Analyses per day for the past seven days">
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between px-1"><span className="border-t border-dashed border-border/50" /><span className="border-t border-dashed border-border/50" /><span className="border-t border-dashed border-border/50" /><span className="border-t border-dashed border-border/50" /></div>
    <div className="relative z-10 flex h-full items-end justify-around gap-2">
      {bars.map((bar) => {
        const safeCount = bar.all - bar.risk;
        const safeHeight = bar.all ? Math.max(4, (safeCount / max) * 100) : 2;
        const riskHeight = bar.risk ? Math.max(4, (bar.risk / max) * 100) : 0;
        return <div key={bar.date.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex h-full w-full items-end justify-center gap-1" title={`${bar.all} scans, ${bar.risk} flagged`}><div className="w-3 max-w-[24%] rounded-t-sm bg-cyber-cyan/65 transition-all" style={{ height: `${safeHeight}%` }} /><div className="w-3 max-w-[24%] rounded-t-sm bg-cyber-red/75 transition-all" style={{ height: `${riskHeight}%` }} /></div><span className="pb-2 font-mono text-[9px] text-muted-foreground">{bar.date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}</span></div>;
      })}
    </div>
    <div className="absolute right-2 top-2 flex gap-3 font-mono text-[8px] text-muted-foreground"><span><i className="mr-1 inline-block size-1.5 rounded-full bg-cyber-cyan" />SAFE</span><span><i className="mr-1 inline-block size-1.5 rounded-full bg-cyber-red" />FLAGGED</span></div>
  </div>;
}

function RecentScans({ records, ready }: { records: ScanRecord[]; ready: boolean }) {
  if (!ready) return <div className="px-5 py-8 text-sm text-muted-foreground">Loading local scan history…</div>;
  if (records.length === 0) return <div className="flex flex-col items-center px-5 py-9 text-center"><Clock3 size={20} className="mb-2 text-muted-foreground" /><p className="text-sm text-muted-foreground">Completed analyses will appear here.</p></div>;
  return <div className="divide-y divide-border">{records.map((record) => <ScanListRow key={record.id} record={record} />)}</div>;
}

function Scanner({ kind, health, onScan }: { kind: ScanKind; health: AnalyzerHealth; onScan: (record: ScanRecord) => void }) {
  const [url, setUrl] = useState("");
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanRecord | null>(null);
  const emailContent = `${sender ? `From: ${sender}\n` : ""}${subject ? `Subject: ${subject}\n` : ""}${body}`.trim();
  const input = kind === "url" ? url.trim() : emailContent;

  const clear = () => {
    setUrl(""); setSender(""); setSubject(""); setBody(""); setError(""); setResult(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setResult(null);
    if (kind === "url") {
      if (!url.trim()) { setError("Enter a website address to analyze."); return; }
      let parsed: URL;
      try { parsed = new URL(url.trim()); } catch { setError("Enter a complete URL, such as https://example.com."); return; }
      if (!(parsed.protocol === "http:" || parsed.protocol === "https:") || !parsed.hostname.includes(".")) { setError("Only valid HTTP or HTTPS website URLs can be analyzed."); return; }
    } else if (!emailContent) { setError("Enter a sender, subject, or message body to analyze."); return; }
    setBusy(true);
    try {
      const prediction = kind === "url" ? await analyzeUrl(url.trim()) : await analyzeEmail(sender.trim(), subject.trim(), body.trim());
      const record: ScanRecord = { ...prediction, id: crypto.randomUUID(), kind, input, createdAt: new Date().toISOString() };
      setResult(record);
      onScan(record);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed. No prediction was produced.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <PageHeading eyebrow={`THREAT ANALYSIS / ${kind === "url" ? "02" : "03"}`} title={kind === "url" ? "URL threat scanner" : "Email threat scanner"} description={kind === "url" ? "Submit a web address for model-based analysis. The destination will not be opened." : "Analyze email text and sender context. Links and attachments will not be opened or executed."} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="border border-border bg-card/80">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center border border-cyber-cyan/25 bg-cyber-cyan/10 text-cyber-cyan">{kind === "url" ? <Globe2 size={17} /> : <Mail size={17} />}</span><div><h2 className="text-sm font-medium">{kind === "url" ? "Website address" : "Message details"}</h2><div className="font-mono text-[9px] text-muted-foreground">{kind === "url" ? "HTTP / HTTPS ONLY" : "TEXT ANALYSIS ONLY"}</div></div></div><Badge variant="outline" className="border-border font-mono text-[9px] text-muted-foreground">NO LIVE FETCH</Badge></div>
        <form onSubmit={submit} className="space-y-4 p-5">
          {kind === "url" ? <div><label htmlFor="scan-url" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground">URL TO INSPECT</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-cyber-cyan">https://</span><Input id="scan-url" type="text" inputMode="url" autoComplete="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="suspicious-domain.example/path" className="h-12 border-border bg-surface-deep pl-[68px] font-mono text-sm" maxLength={2048} /></div><div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground"><span>Up to 2,048 characters</span><span>{url.length}/2048</span></div></div> : <>
            <div><label htmlFor="email-sender" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground">SENDER ADDRESS <span className="text-muted-foreground/60">· OPTIONAL</span></label><Input id="email-sender" type="text" autoComplete="off" value={sender} onChange={(event) => setSender(event.target.value)} placeholder="sender@example.com" maxLength={512} className="h-11 border-border bg-surface-deep font-mono text-xs" /></div>
            <div><label htmlFor="email-subject" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground">SUBJECT <span className="text-muted-foreground/60">· OPTIONAL</span></label><Input id="email-subject" type="text" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Message subject" maxLength={2048} className="h-11 border-border bg-surface-deep text-sm" /></div>
            <div><label htmlFor="email-body" className="mb-2 block font-mono text-[10px] tracking-[0.12em] text-muted-foreground">EMAIL BODY <span className="text-muted-foreground/60">· OPTIONAL</span></label><Textarea id="email-body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Paste the message text here…" maxLength={30000} className="min-h-[210px] resize-y border-border bg-surface-deep text-sm leading-6" /><div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground"><span>Text only · attachments are ignored</span><span>{body.length.toLocaleString()}/30,000</span></div></div>
          </>}
          {error && <div role="alert" className="flex items-start gap-2 border border-cyber-red/30 bg-cyber-red/5 p-3 text-xs leading-5 text-cyber-red"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}
          {result && <ResultPanel record={result} />}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="ghost" className="h-10 justify-center text-xs text-muted-foreground" onClick={clear} disabled={busy}><X size={14} />Clear input</Button><Button type="submit" className="h-10 gap-2 bg-cyber-lime px-5 text-xs font-semibold text-primary-foreground hover:bg-cyber-lime/90" disabled={busy}><span className="relative flex size-4 items-center justify-center">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={15} />}</span>{busy ? "Analyzing…" : "Analyze now"}</Button></div>
        </form>
      </section>
      <aside className="space-y-4">
        <div className="border border-border bg-card/80 p-5"><div className="mb-4 flex items-center gap-2"><Radar size={16} className="text-cyber-cyan" /><h2 className="text-sm font-medium">Model availability</h2></div><div className="space-y-3"><ModelRow name="URL model" detail="Trained classifier" ready={health.urlModelReady} /><ModelRow name="Email model" detail="Trained classifier" ready={health.emailModelReady} /></div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">A result appears only after the analysis engine responds successfully.</p></div>
        <div className="border border-border bg-card/80 p-5"><div className="mb-3 flex items-center gap-2"><LockKeyhole size={15} className="text-cyber-lime" /><h2 className="text-sm font-medium">Private by design</h2></div><ul className="space-y-2 text-xs leading-5 text-muted-foreground"><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-cyber-lime" />Submitted destinations are never fetched</li><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-cyber-lime" />Email attachments are never opened</li><li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-cyber-lime" />History stays in this browser</li></ul></div>
        <div className="border border-cyber-cyan/20 bg-cyber-cyan/5 p-4"><div className="font-mono text-[9px] tracking-[0.14em] text-cyber-cyan">MODEL DISCLAIMER</div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">A SAFE label is not a guarantee. Verify important messages through a trusted channel.</p></div>
      </aside>
    </div>
  </>;
}

function ResultPanel({ record }: { record: ScanRecord }) {
  const tone = record.prediction === "SAFE" ? "lime" : record.prediction === "SUSPICIOUS" ? "cyan" : "red";
  const icon = record.prediction === "SAFE" ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />;
  const tint = tone === "lime" ? "text-cyber-lime" : tone === "cyan" ? "text-cyber-cyan" : "text-cyber-red";
  const border = tone === "lime" ? "border-cyber-lime/25 bg-cyber-lime/5" : tone === "cyan" ? "border-cyber-cyan/25 bg-cyber-cyan/5" : "border-cyber-red/25 bg-cyber-red/5";
  return <section aria-live="polite" aria-label="Model analysis result" className={`border p-4 ${border}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className={`flex items-center gap-2 ${tint}`}>{icon}<div><div className="font-mono text-sm font-medium">{record.prediction}</div><div className="font-mono text-[9px] text-muted-foreground">AI MODEL CLASSIFICATION</div></div></div><div className="text-right"><div className={`font-mono text-lg ${tint}`}>{Math.round(record.confidence * 100)}%</div><div className="font-mono text-[8px] text-muted-foreground">MODEL CONFIDENCE</div></div></div>
    <div className="mt-4 border-t border-border/70 pt-3"><div className="mb-2 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">OBSERVED INDICATORS</div><ul className="space-y-1.5">{record.indicators.map((indicator, index) => <li key={`${indicator}-${index}`} className="flex items-start gap-2 text-xs leading-5"><span className={`mt-1.5 size-1 shrink-0 rounded-full ${tint.replace("text-", "bg-")}`} />{indicator}</li>)}</ul></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[8px] text-muted-foreground"><span>MODEL {record.modelVersion}</span><span>{new Date(record.createdAt).toLocaleString()}</span></div>
  </section>;
}

function PredictionBadge({ prediction }: { prediction: ScanPrediction }) {
  const className = prediction === "SAFE" ? "border-cyber-lime/30 bg-cyber-lime/10 text-cyber-lime" : prediction === "PHISHING" ? "border-cyber-red/30 bg-cyber-red/10 text-cyber-red" : "border-cyber-cyan/30 bg-cyber-cyan/10 text-cyber-cyan";
  return <Badge variant="outline" className={`whitespace-nowrap font-mono text-[9px] ${className}`}>{prediction}</Badge>;
}

function ScanListRow({ record, onClick }: { record: ScanRecord; onClick?: () => void }) {
  const Icon = record.kind === "url" ? Globe2 : Mail;
  return <button type="button" onClick={onClick} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-secondary/40 sm:grid-cols-[minmax(0,1fr)_130px_105px_125px] ${onClick ? "cursor-pointer" : "cursor-default"}`}>
    <span className="flex min-w-0 items-center gap-3"><Icon size={15} className="shrink-0 text-cyber-cyan" /><span className="min-w-0"><span className="block truncate font-mono text-[11px] text-foreground">{record.kind === "url" ? record.input : record.input.replace(/\s+/g, " · ")}</span><span className="mt-1 block font-mono text-[8px] text-muted-foreground">{record.kind.toUpperCase()} · MODEL {record.modelVersion}</span></span></span>
    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{new Date(record.createdAt).toLocaleString()}</span>
    <span className="justify-self-end sm:justify-self-start"><PredictionBadge prediction={record.prediction} /></span>
    <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">{Math.round(record.confidence * 100)}% confidence</span>
  </button>;
}

function HistoryPage({ records, ready, onClear }: { records: ScanRecord[]; ready: boolean; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ScanKind>("all");
  const [selected, setSelected] = useState<ScanRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const filtered = useMemo(() => records.filter((record) => (filter === "all" || record.kind === filter) && record.input.toLowerCase().includes(query.toLowerCase())), [records, filter, query]);
  const exportAll = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = "phishguard-scan-history.json"; anchor.click(); URL.revokeObjectURL(objectUrl);
  };
  return <>
    <PageHeading eyebrow="INVESTIGATION RECORDS / 04" title="Scan history" description="Search, filter and download completed model-based analyses.">
      <div className="flex gap-2">{records.length > 0 && <Button variant="outline" size="sm" className="gap-2 border-border text-xs" onClick={exportAll}><ArrowDownToLine size={14} />Export all</Button>}{records.length > 0 && <Button variant="outline" size="sm" className="gap-2 border-border text-xs text-cyber-red hover:bg-cyber-red/10 hover:text-cyber-red" onClick={() => setConfirmClear(true)}><Trash2 size={14} />Clear</Button>}</div>
    </PageHeading>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search history" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search analyzed input…" className="h-10 border-border bg-card pl-9 text-sm" /></div><div className="flex gap-1 border border-border bg-card p-1">{(["all", "url", "email"] as const).map((value) => <Button key={value} variant={filter === value ? "secondary" : "ghost"} size="sm" className={`h-8 px-3 text-[10px] uppercase ${filter === value ? "text-cyber-cyan" : "text-muted-foreground"}`} onClick={() => setFilter(value)}>{value === "all" ? "All scans" : value}</Button>)}</div></div>
    <div className="border border-border bg-card/80"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border bg-surface-raised px-5 py-3 font-mono text-[9px] tracking-[0.12em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_130px_105px_125px]"><span>ANALYZED INPUT</span><span className="hidden sm:block">DATE</span><span className="justify-self-end sm:justify-self-start">RESULT</span><span className="hidden sm:block">CONFIDENCE</span></div>
      {!ready ? <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading local history…</div> : filtered.length ? <div className="divide-y divide-border">{filtered.map((record) => <ScanListRow key={record.id} record={record} onClick={() => setSelected(record)} />)}</div> : <div className="flex flex-col items-center px-5 py-14 text-center"><FileSearch size={23} className="mb-3 text-muted-foreground" /><h2 className="text-sm font-medium">{records.length ? "No matching scans" : "No scan history yet"}</h2><p className="mt-1 max-w-md text-xs text-muted-foreground">{records.length ? "Try another search or change the type filter." : "Completed trained-model analyses will appear here."}</p></div>}
    </div>
    {selected && <ScanDetail record={selected} onClose={() => setSelected(null)} />}
    {confirmClear && <div role="dialog" aria-modal="true" aria-labelledby="clear-history-title" className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm"><div className="w-full max-w-[420px] border border-border bg-card p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="clear-history-title" className="text-base font-semibold">Clear local scan history?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This removes {records.length} saved scan{records.length === 1 ? "" : "s"} from this browser. This cannot be undone.</p></div><Button size="icon" variant="ghost" aria-label="Close dialog" onClick={() => setConfirmClear(false)}><X size={17} /></Button></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmClear(false)}>Cancel</Button><Button variant="destructive" onClick={() => { onClear(); setConfirmClear(false); }}>Clear history</Button></div></div></div>}
  </>;
}

function ScanDetail({ record, onClose }: { record: ScanRecord; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="scan-detail-title" className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-sm"><div className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto border border-border bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><div className="font-mono text-[9px] tracking-[0.15em] text-cyber-cyan">ANALYSIS REPORT</div><h2 id="scan-detail-title" className="mt-1 text-base font-medium">{record.kind === "url" ? "URL" : "Email"} scan details</h2></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" className="gap-2 text-[10px]" onClick={() => downloadScanReport(record)}><ArrowDownToLine size={13} />Download</Button><Button size="icon" variant="ghost" aria-label="Close details" onClick={onClose}><X size={17} /></Button></div></div><div className="space-y-4 p-5"><div><div className="mb-1 font-mono text-[9px] tracking-[0.12em] text-muted-foreground">ANALYZED INPUT</div><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words border border-border bg-surface-deep p-3 font-mono text-xs leading-5 text-foreground">{record.input}</pre></div><ResultPanel record={record} /><div className="grid grid-cols-2 gap-3 font-mono text-[9px] text-muted-foreground"><span>TIME: {new Date(record.createdAt).toLocaleString()}</span><span className="text-right">MODEL: {record.modelVersion}</span></div></div></div></div>;
}

function AboutPage({ health, onNavigate, onRefreshHealth }: { health: AnalyzerHealth; onNavigate: (view: View) => void; onRefreshHealth: () => void }) {
  return <>
    <PageHeading eyebrow="SYSTEM INFORMATION / 05" title="About PhishGuard MLX" description="A phishing analysis workspace designed to make every prediction traceable and transparent." />
    <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <div className="border border-border bg-card/80 p-6 sm:p-8"><img src={kavachphishLogo.url} alt="PhishGuard MLX" className="mb-5 size-12 rounded-md border border-cyber-lime/30 object-cover" /><div className="font-mono text-[10px] tracking-[0.16em] text-cyber-cyan">PROJECT OVERVIEW</div><h2 className="mt-2 text-xl font-semibold">{APP_TITLE}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">This interface supports model-backed phishing analysis for URLs and email text. Classification results come only from a separately deployed, trained model service. The app does not infer a verdict when the service is disconnected or its model files are unavailable.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><TechItem icon={Globe2} title="URL analysis" text="Model classification with observable structure indicators." /><TechItem icon={Mail} title="Email analysis" text="Text-only model analysis with clear inspection notes." /><TechItem icon={BarChart3} title="Transparent results" text="Confidence, model version, and observed indicators." /><TechItem icon={LockKeyhole} title="Local history" text="Saved only in the current browser, with report export." /></div></div>
      <div className="space-y-5"><div className="border border-border bg-card/80 p-5"><div className="flex items-center justify-between"><div><div className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground">SERVICE CONNECTION</div><h2 className="mt-2 text-base font-medium">Analysis engine</h2></div><Button variant="outline" size="sm" className="gap-2 text-[10px]" onClick={onRefreshHealth}><Activity size={13} />Refresh</Button></div><div className="mt-4"><ServiceStatus health={health} /></div><p className="mt-3 text-[10px] leading-5 text-muted-foreground">Connect your separately hosted model API with the app's <code className="font-mono text-cyber-cyan">VITE_PHISHGUARD_API_URL</code> setting.</p></div>
      <div className="border border-cyber-red/20 bg-cyber-red/5 p-5"><div className="mb-3 flex items-center gap-2 text-cyber-red"><CircleAlert size={16} /><h2 className="text-sm font-medium">Limitations and safe use</h2></div><ul className="space-y-2 text-xs leading-5 text-muted-foreground"><li>Classifier output is not a guarantee of safety or a substitute for security review.</li><li>Confidence scores are model outputs and may not be calibrated.</li><li>Submitted URLs are passed as text only; the app never navigates to them.</li><li>Email attachments are not accepted or opened.</li></ul></div>
      <div className="flex flex-wrap gap-2"><Button className="gap-2 bg-cyber-lime text-primary-foreground hover:bg-cyber-lime/90" onClick={() => onNavigate("url")}><Globe2 size={15} />Open URL scanner</Button><Button variant="outline" className="gap-2" onClick={() => onNavigate("email")}><Mail size={15} />Open email scanner</Button></div></div>
    </section>
  </>;
}

function TechItem({ icon: Icon, title, text }: { icon: typeof Activity; title: string; text: string }) {
  return <div className="border border-border bg-surface-raised p-4"><Icon size={16} className="mb-3 text-cyber-lime" /><h3 className="text-xs font-medium">{title}</h3><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p></div>;
}
