import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { gsap } from 'gsap';
import logo from './assets/mnemix-logo.jpg';

const AUDIT_LOCK_PREFIX = 'mnemix-audit-lock:';
const PHONE_RULES = {
  IN: { dial: '91', minDigits: 10, maxDigits: 10, label: 'India +91' },
  US: { dial: '1', minDigits: 10, maxDigits: 10, label: 'United States +1' },
  CA: { dial: '1', minDigits: 10, maxDigits: 10, label: 'Canada +1' },
  GB: { dial: '44', minDigits: 10, maxDigits: 10, label: 'United Kingdom +44' },
  AU: { dial: '61', minDigits: 9, maxDigits: 9, label: 'Australia +61' },
  SG: { dial: '65', minDigits: 8, maxDigits: 8, label: 'Singapore +65' },
  AE: { dial: '971', minDigits: 9, maxDigits: 9, label: 'UAE +971' },
  SA: { dial: '966', minDigits: 9, maxDigits: 9, label: 'Saudi Arabia +966' },
  ZA: { dial: '27', minDigits: 9, maxDigits: 9, label: 'South Africa +27' },
  PH: { dial: '63', minDigits: 10, maxDigits: 10, label: 'Philippines +63' },
  BR: { dial: '55', minDigits: 10, maxDigits: 11, label: 'Brazil +55' },
  DE: { dial: '49', minDigits: 10, maxDigits: 11, label: 'Germany +49' },
  FR: { dial: '33', minDigits: 9, maxDigits: 9, label: 'France +33' },
  MX: { dial: '52', minDigits: 10, maxDigits: 10, label: 'Mexico +52' },
  ID: { dial: '62', minDigits: 9, maxDigits: 10, label: 'Indonesia +62' },
  NZ: { dial: '64', minDigits: 8, maxDigits: 9, label: 'New Zealand +64' },
  PK: { dial: '92', minDigits: 10, maxDigits: 10, label: 'Pakistan +92' },
  BD: { dial: '880', minDigits: 10, maxDigits: 10, label: 'Bangladesh +880' },
  NG: { dial: '234', minDigits: 10, maxDigits: 10, label: 'Nigeria +234' },
  KE: { dial: '254', minDigits: 9, maxDigits: 9, label: 'Kenya +254' },
  MY: { dial: '60', minDigits: 9, maxDigits: 10, label: 'Malaysia +60' },
  TH: { dial: '66', minDigits: 9, maxDigits: 9, label: 'Thailand +66' }
};

const ROUTES = [
  { to: '/', label: 'Home' },
  { to: '/audit', label: 'Audit' },
  { to: '/chatgpt-ads', label: 'ChatGPT Ads' },
  { to: '/services', label: 'Services' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' }
];

const SERVICE_ITEMS = [
  {
    title: '01 — Free GEO Audit',
    description:
      'A fast, honest snapshot of how visible your brand is inside AI answers. We score your entity clarity, category ownership, website signals, and third-party authority across platforms like ChatGPT and Perplexity.',
    bullets: [
      'GEO visibility score (0–100)',
      'Breakdown across 3 signal pillars',
      'One priority fix to act on immediately',
      'Optional path to the full paid report'
    ],
    bestFor: 'Any brand that runs digital marketing and has not checked AI visibility yet',
    timeline: 'Delivered in 48 hours'
  },
  {
    title: '02 — GEO Strategy',
    description:
      'We build the content system, schema, comparison pages, and authority signals that make AI answers about your brand accurate, favorable, and consistent. This is the execution layer after the audit.',
    bullets: [
      'Entity and brand story framework',
      'GEO content plan with pillar pages and comparison content',
      'Schema implementation',
      'External signal recommendations'
    ],
    bestFor: 'D2C brands scaling paid acquisition and B2B SaaS with competitive category positioning',
    timeline: '3–4 week engagement'
  },
  {
    title: '03 — ChatGPT Ads Readiness',
    description:
      'We position your brand to move first when paid placements inside AI conversations go live. That means clean entity signals, conversion-ready landing infrastructure, and a waitlist spot that gives you early access.',
    bullets: [
      'Ads readiness audit',
      'Entity and conversion signal fixes',
      'Waitlist priority access',
      'Readiness scorecard'
    ],
    bestFor: 'Performance-driven brands that want first-mover advantage in the next ad era',
    timeline: 'Ongoing — starts with readiness audit'
  }
];

const BLOG_POSTS = [
  {
    category: 'GEO',
    title: 'Why AI visibility is the new homepage',
    excerpt:
      'When customers ask models instead of search engines, your brand story has to survive the answer layer. The site that the model cites becomes the first impression, not the last.',
    date: 'May 2026',
    readTime: '5 min read'
  },
  {
    category: 'Strategy',
    title: 'What makes a brand recommendation-worthy',
    excerpt:
      'AI does not just need to know who you are. It needs proof that recommending you is sensible, safe, and easy to explain to the user.',
    date: 'May 2026',
    readTime: '4 min read'
  },
  {
    category: 'Ads',
    title: 'Preparing for ChatGPT Ads',
    excerpt:
      'The brands that build the right entity and conversion signals now will move faster when the slot becomes real. Early structure beats late scrambling.',
    date: 'May 2026',
    readTime: '6 min read'
  }
];

const PLATFORM_WORDS = ['ChatGPT', 'Claude', 'Gemini', 'Grok', 'Perplexity'];

function normalizeWebsite(input) {
  let url = String(input || '').trim().toLowerCase();
  if (!url) return '';
  url = url.replace(/^https?:\/\//, '');
  url = url.replace(/[/?#].*$/, '').replace(/\/+$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(url)) return '';
  return `https://${url}`;
}

function normalizePhone(country, countryCode, phoneNumber) {
  const rule = PHONE_RULES[country];
  if (!rule) return null;
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  const dial = String(countryCode || '').replace(/\D/g, '');
  if (dial !== rule.dial) return null;

  let national = digits;
  if (digits.startsWith(rule.dial) && digits.length > rule.maxDigits) {
    national = digits.slice(rule.dial.length);
  }

  if (national.length < rule.minDigits || national.length > rule.maxDigits) return null;
  return { formatted: `+${rule.dial} ${national}`, country: country };
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function siteLockKey(brandName, website) {
  return `${AUDIT_LOCK_PREFIX}${String(brandName || '').trim().toLowerCase()}|${String(website || '').trim().toLowerCase()}`;
}

function currencylessCountLabel(value) {
  return `[${value || 'X'}] brands`;
}

function getPillColor(band) {
  if (band === 'Category leader') return 'verdict-leader';
  if (band === 'Strong visibility') return 'verdict-strong';
  if (band === 'Partial visibility') return 'verdict-partial';
  if (band === 'Barely visible') return 'verdict-barely';
  return 'verdict-none';
}

function formatAudience(band) {
  return band || 'Not visible';
}

function Shell({ children, auditMode = false }) {
  const location = useLocation();
  return (
    <div className="site">
      <header className="topbar">
        <div className="brand-wrap">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <img className="brand-logo" src={logo} alt="Mnemix AI logo" />
            </span>
            <span>Mnemix AI</span>
          </Link>
          {auditMode ? <Link className="back-home" to="/">Back to Home</Link> : null}
        </div>
        <div className="topbar-actions">
          <nav className="nav">
            {ROUTES.map((route) => (
              <NavLink key={route.to} to={route.to} end={route.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                {route.label}
              </NavLink>
            ))}
          </nav>
          <Link className="btn nav-cta" to="/audit">
            Run Free Audit
          </Link>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-mark brand-mark-sm">
            <img className="brand-logo" src={logo} alt="Mnemix AI logo" />
          </span>
          <span>Mnemix AI</span>
        </div>
        <div className="footer-links">
          <span>GEO agency for AI search, answer engines, and what comes next.</span>
          <a href="https://x.com/MnemixAI" target="_blank" rel="noreferrer">
            X
          </a>
          <a href="https://www.linkedin.com/company/mnemix-ai/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, action }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow ? <div className="pill">{eyebrow}</div> : null}
        <h2>{title}</h2>
        {copy ? <p>{copy}</p> : null}
      </div>
      {action ? action : null}
    </div>
  );
}

function RotatingWord() {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const interval = window.setInterval(() => {
      gsap.to(el, {
        opacity: 0,
        y: 10,
        duration: 0.22,
        ease: 'power2.out',
        onComplete: () => {
          setIndex((current) => (current + 1) % PLATFORM_WORDS.length);
          gsap.fromTo(
            el,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' }
          );
        }
      });
    }, 1800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span ref={ref} className="rotating-word">
      {PLATFORM_WORDS[index]}
    </span>
  );
}

function HeroScene() {
  return (
    <div className="hero-visual">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.8], fov: 40 }}>
        <color attach="background" args={['#111111']} />
        <ambientLight intensity={1.25} />
        <directionalLight position={[3, 2, 4]} intensity={2.4} color="#ffb547" />
        <directionalLight position={[-4, -2, 2]} intensity={1.2} color="#ff6b2b" />
        <Float speed={1.25} rotationIntensity={0.45} floatIntensity={0.55}>
          <mesh rotation={[0.4, 0.24, 0]}>
            <torusKnotGeometry args={[1.05, 0.3, 150, 18]} />
            <meshStandardMaterial color="#ffb547" emissive="#ff6b2b" emissiveIntensity={0.18} metalness={0.5} roughness={0.24} />
          </mesh>
        </Float>
        <Float speed={1.5} rotationIntensity={0.25} floatIntensity={0.5}>
          <mesh position={[-1.6, 1.2, -0.9]}>
            <icosahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color="#f6f1ea" metalness={0.15} roughness={0.45} />
          </mesh>
        </Float>
        <Float speed={1.1} rotationIntensity={0.4} floatIntensity={0.35}>
          <mesh position={[1.45, -0.85, -0.3]}>
            <sphereGeometry args={[0.55, 32, 32]} />
            <meshStandardMaterial color="#ff6b2b" emissive="#ffb547" emissiveIntensity={0.18} metalness={0.2} roughness={0.3} />
          </mesh>
        </Float>
        <Sparkles count={24} size={2.4} speed={0.45} scale={[7, 4, 4]} color="#ffb547" opacity={0.18} />
      </Canvas>
    </div>
  );
}

function StatGrid() {
  const stats = [
    { title: 'Free audit', text: 'A sharp snapshot of brand clarity, category ownership, and authority signals.' },
    { title: 'ChatGPT Ads readiness', text: 'A dedicated offer for brands that want to be early when the next ad platform opens up.' },
    { title: 'Strategy + execution', text: 'GEO, content, schema, and positioning work built to make AI answers work for you.' }
  ];

  return (
    <div className="stats">
      {stats.map((stat) => (
        <div key={stat.title} className="panel stat">
          <strong>{stat.title}</strong>
          {stat.text}
        </div>
      ))}
    </div>
  );
}

function HomePage() {
  return (
    <Shell>
      <section className="hero">
        <div>
          <div className="pill">GEO agency for AI-era growth</div>
          <div className="hero-badges" aria-hidden="true">
            <span className="hero-badge badge-chatgpt">ChatGPT</span>
            <span className="hero-badge badge-claude">Claude</span>
            <span className="hero-badge badge-gemini">Gemini</span>
            <span className="hero-badge badge-grok">Grok</span>
            <span className="hero-badge badge-perplexity">Perplexity</span>
          </div>
          <h1 className="rotating-hero">
            Get discovered by <RotatingWord />
          </h1>
          <p className="hero-catchline">The next step of marketing is here. You’ll need us to stay on top of AI answers.</p>
          <p className="lead">
            Mnemix AI helps brands show up clearly inside ChatGPT-style answers, AI recommendations, and the next wave of ad inventory. Start with a free visibility audit, then build the entity, authority, and demand layers that make AI choose you first.
          </p>
          <div className="actions">
            <Link className="btn" to="/audit">
              Get Free AI Audit
            </Link>
            <Link className="btn secondary" to="/chatgpt-ads">
              Join ChatGPT Ads Waitlist
            </Link>
          </div>
        </div>
        <StatGrid />
      </section>

      <section className="section">
        <div className="panel card">
          <SectionHeading
            eyebrow="Social proof"
            title="What brands usually want to see first"
            copy="A tiny placeholder for the proof layer while the real client roster grows."
          />
          <div className="panel card" style={{ marginTop: 0, padding: 16 }}>
            <div className="placeholder-copy">[PLACEHOLDER] LOGO STRIP: Brand logos here</div>
          </div>
          <div className="panel card" style={{ marginTop: 14 }}>
            <span className="tag">Testimonial</span>
            <h3>“Mnemix made the AI visibility gaps painfully clear, then gave us a path to fix them.”</h3>
            <p className="placeholder-copy">[PLACEHOLDER] This testimonial is a stand-in until we have a published client quote.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          title="What we do"
          copy="We keep the offer tight: audit the brand, fix the signals, and prepare the brand for the ad layer that comes next."
        />
        <div className="grid-3">
          <article className="panel card">
            <span className="tag">Audit</span>
            <h3>GEO audits delivered in 48 hours</h3>
            <p>Get a fast read on how AI systems understand your brand, where the signal gaps are, and what they’re likely to say back to users.</p>
          </article>
          <article className="panel card">
            <span className="tag">Strategy</span>
            <h3>Entity signals built to survive AI model updates</h3>
            <p>We shape the brand story, proof points, schema, and comparison pages so your visibility doesn’t fall apart every time the models shift.</p>
          </article>
          <article className="panel card">
            <span className="tag">Growth</span>
            <h3>First-mover positioning for the ChatGPT Ads era</h3>
            <p>We help you prepare for the ad layer inside AI conversations before category leaders lock in the early advantage.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          title="The ad story"
          copy="A short version of how the growth stack evolved, and why ChatGPT Ads is the next big lever brands will fight for."
          action={
            <Link className="btn secondary" to="/chatgpt-ads">
              Read the full pitch
            </Link>
          }
        />
        <div className="timeline">
          <div className="panel timeline-item">
            <div className="year">2000s</div>
            <div>
              <h3>Google Ads made intent measurable.</h3>
              <p>Search ads turned active demand into a business model. Brands paid to show up right when people were asking.</p>
            </div>
          </div>
          <div className="panel timeline-item">
            <div className="year">2010s</div>
            <div>
              <h3>Meta Ads turned attention into targeting.</h3>
              <p>Social platforms let brands interrupt people with finely tuned creative, audiences, and retargeting loops.</p>
            </div>
          </div>
          <div className="panel timeline-item">
            <div className="year">Now</div>
            <div>
              <h3>ChatGPT Ads will live inside the answer.</h3>
              <p>When ads arrive fully in AI conversations, the brand that already has clean entity signals and early access wins the click, the trust, and the sale.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeading
          title="Latest insights"
          copy="Short reads for brands that want to stay ahead of AI discovery and the coming ad layer."
          action={
            <Link className="btn secondary" to="/blog">
              View all posts
            </Link>
          }
        />
        <div className="grid-3">
          {BLOG_POSTS.map((post) => (
            <article key={post.title} className="panel card blog-card">
              <span className="tag">{post.category}</span>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <div className="post-meta">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="panel card">
          <h2>Get your free GEO audit in 24 hours.</h2>
          <p>Start with the free audit. If you want the next step, we’ll help shape the AI-era positioning and the ads strategy around it.</p>
          <div className="actions">
            <Link className="btn" to="/audit">
              Run Free Audit
            </Link>
            <Link className="btn secondary" to="/services">
              View Services
            </Link>
            <Link className="btn secondary" to="/contact">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function AuditScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="score-ring">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b2b" />
            <stop offset="100%" stopColor="#ffb547" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset, stroke: 'url(#scoreGradient)' }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="score-ring-center">
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

function PillarCard({ label, score, max, reasoning }) {
  const pct = Math.round((Number(score || 0) / Number(max || 1)) * 100);
  return (
    <div className="pillar-card">
      <span className="pillar-tag">Pillar</span>
      <h3>{label}</h3>
      <div className="pillar-score">
        {Number(score || 0)}/{Number(max || 0)}
      </div>
      <div className="mini-bar">
        <motion.div className="mini-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </div>
      <p className="pillar-note">{reasoning || 'We score this based on how clearly the brand shows up in AI answers, how easy it is to recommend, and how much authority the open web gives it.'}</p>
    </div>
  );
}

function SignalRow({ label, score, max, blurred = false }) {
  const pct = Math.round((Number(score || 0) / Number(max || 1)) * 100);
  return (
    <div className={`signal-row ${blurred ? 'signal-blurred' : ''}`}>
      <div className="signal-name">{label}</div>
      <div className="signal-bar">
        <motion.div className="signal-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.75, ease: 'easeOut' }} />
      </div>
      <div className="signal-score">
        {Number(score || 0)}/{Number(max || 0)}
      </div>
    </div>
  );
}

function AuditPage() {
  const [form, setForm] = useState({
    brand_name: '',
    brand_website: '',
    email_id: '',
    phone_country: 'IN',
    phone_country_code: PHONE_RULES.IN.dial,
    phone_number: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState(null);
  const [locked, setLocked] = useState(null);

  const currentPhoneRule = PHONE_RULES[form.phone_country] || PHONE_RULES.IN;
  const phoneHelp = `Choose your country, then enter ${currentPhoneRule.minDigits}${currentPhoneRule.minDigits === currentPhoneRule.maxDigits ? '' : `-${currentPhoneRule.maxDigits}`} digits for ${currentPhoneRule.label}.`;

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      phone_country_code: (PHONE_RULES[prev.phone_country] || PHONE_RULES.IN).dial
    }));
  }, [form.phone_country]);

  const auditSignals = useMemo(() => {
    if (!result) return null;
    return [
      { label: 'Brand name clarity', score: result.p1Scores?.[0] ?? 0, max: 8 },
      { label: 'Category ownership', score: result.p1Scores?.[1] ?? 0, max: 8 },
      { label: 'Content depth', score: result.p1Scores?.[2] ?? 0, max: 8 },
      { label: 'External signal strength', score: result.p1Scores?.[3] ?? 0, max: 8 },
      { label: 'Competitive distinctiveness', score: result.p1Scores?.[4] ?? 0, max: 8 },
      { label: 'Representation accuracy', score: result.p2Scores?.[0] ?? 0, max: 10 },
      { label: 'Recommendation worthiness', score: result.p2Scores?.[1] ?? 0, max: 10 },
      { label: 'Competitive positioning', score: result.p2Scores?.[2] ?? 0, max: 10 },
      { label: 'Wikipedia signal', score: result.wiki ?? 0, max: 10 },
      { label: 'Third-party coverage', score: result.thirdParty ?? 0, max: 10 },
      { label: 'Structured data', score: result.structured ?? 0, max: 10 }
    ];
  }, [result]);

  const submitAudit = async (event) => {
    event.preventDefault();
    setError('');
    setPhoneError('');
    setResult(null);
    setLocked(null);

    const brand = String(form.brand_name || '').trim();
    const website = normalizeWebsite(form.brand_website);
    if (!brand || !form.brand_website || !form.email_id || !form.phone_number) {
      setError('Please fill all fields before running the audit.');
      return;
    }
    if (!website) {
      setError('Please enter a valid website.');
      return;
    }
    if (!validateEmail(form.email_id)) {
      setError('Please enter a valid email address.');
      return;
    }
    const normalizedPhone = normalizePhone(form.phone_country, form.phone_country_code, form.phone_number);
    if (!normalizedPhone) {
      setPhoneError('Please enter a valid phone number for the selected country.');
      return;
    }

    const key = siteLockKey(brand, website);
    if (window.localStorage.getItem(key)) {
      setLocked({ brandName: brand, website });
      return;
    }

    try {
      setLoading(true);
      setProgressStep(0);
      const stepTimers = [
        window.setTimeout(() => setProgressStep(1), 8000),
        window.setTimeout(() => setProgressStep(2), 22000),
        window.setTimeout(() => setProgressStep(3), 34000)
      ];

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: 'audit',
          brand_name: brand,
          brand_website: website,
          email_id: form.email_id,
          phone_country: form.phone_country,
          phone_country_code: form.phone_country_code,
          phone_number: form.phone_number,
          additional_note: ''
        })
      });

      const data = await response.json();
      stepTimers.forEach((timer) => window.clearTimeout(timer));
      setProgressStep(3);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Audit failed');
      }

      window.localStorage.setItem(key, '1');
      setResult(data);
    } catch (err) {
      setError(err.message || 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const showLocked = Boolean(locked);

  return (
    <Shell auditMode>
      <section className="audit-shell">
        <div className="audit-copy">
          <div className="hero-banner">Your brand has 60 seconds to make sense to an AI. Does it?</div>
          <p className="hero-copy">
            Mnemix AI audits your brand across entity clarity, recommendation readiness, and authority signals so you can see what ChatGPT-style engines are likely to understand, miss, or misrepresent.
          </p>
          <p className="hook-note">Your free audit includes one priority fix. The full paid report goes deeper.</p>
          <div className="trust-row">
            <div>
              <strong>Entity clarity</strong>
              Brand, category, website, and positioning signals.
            </div>
            <div>
              <strong>GEO scoring</strong>
              Brutally honest visibility bands from 0 to 100.
            </div>
            <div>
              <strong>Actionable fix</strong>
              One priority move to improve AI discoverability.
            </div>
          </div>
        </div>

        <div className="audit-column">
          <section className="progress-card">
            <div className="progress-track">
              <motion.div className="progress-fill" animate={{ width: `${Math.min(100, progressStep * 33.3)}%` }} transition={{ duration: 0.45 }} />
            </div>
            <div className="steps">
              {['Scraping', 'Researching', 'Scoring', 'Done'].map((step, index) => (
                <div key={step} className={`step ${progressStep >= index ? 'active' : ''}`}>
                  <span className="dot" />
                  {step}
                </div>
              ))}
            </div>
          </section>

          {!showLocked ? (
            <form className="form-card" onSubmit={submitAudit} noValidate>
              <h2>Run free audit</h2>
              <p>Get a quick GEO visibility snapshot for your brand.</p>
              <p className="response-note">We reply within 24 hours.</p>

              <div className="form-grid">
                <label className="field full">
                  <span>Brand Name</span>
                  <input
                    type="text"
                    value={form.brand_name}
                    onChange={(event) => setForm((prev) => ({ ...prev, brand_name: event.target.value }))}
                    placeholder="Acme Labs"
                  />
                </label>

                <label className="field full">
                  <span>Brand Website</span>
                  <input
                    type="text"
                    value={form.brand_website}
                    onChange={(event) => setForm((prev) => ({ ...prev, brand_website: event.target.value }))}
                    placeholder="www.acme.com"
                  />
                </label>

                <label className="field">
                  <span>Work Email</span>
                  <input
                    type="email"
                    value={form.email_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, email_id: event.target.value }))}
                    placeholder="you@company.com"
                  />
                  <div className="field-help">Must be a valid email format.</div>
                </label>

                <label className="field">
                  <span>Phone Number</span>
                  <div className="phone-wrap">
                    <select
                      value={form.phone_country}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone_country: event.target.value }))}
                    >
                      {Object.entries(PHONE_RULES).map(([code, rule]) => (
                        <option key={code} value={code}>
                          {rule.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                      placeholder={`Enter ${currentPhoneRule.minDigits}${currentPhoneRule.minDigits === currentPhoneRule.maxDigits ? '' : `-${currentPhoneRule.maxDigits}`} digits`}
                    />
                  </div>
                  <div className="field-help">{phoneHelp}</div>
                  {phoneError ? <div className="error" style={{ display: 'block' }}>{phoneError}</div> : null}
                </label>
              </div>

              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'Auditing...' : 'Audit My Brand'}
              </button>
              {error ? <div className="error" style={{ display: 'block' }}>{error}</div> : null}
            </form>
          ) : (
            <div className="result-card locked-card">
              <div className="result-top">
                <div>
                  <h2>{locked?.brandName || result?.brandName || 'Your free audit is already unlocked'}</h2>
                  <div className="meta">
                    <a href={locked?.website || result?.website || '/'} target="_blank" rel="noreferrer">
                      {locked?.website || result?.website || ''}
                    </a>
                  </div>
                </div>
                <span className={`badge ${getPillColor('Partial visibility')}`}>Free audit already used</span>
              </div>
              <div className="fix-box">
                <strong>Your free audit is already unlocked</strong>
                <p>
                  You’ve already run this brand through the free audit once, so we won’t generate another free version here. The full paid report is the next step if you want the complete breakdown, deeper signal analysis, and the remaining recommendations.
                </p>
                <p className="locked-note">If this wasn’t you, or if you want help moving faster, reach out and we’ll guide you to the next step.</p>
              </div>
              <div className="cta-row">
                <Link className="btn" to="/contact">
                  Contact Us
                </Link>
                <Link className="btn secondary" to="/services">
                  Get Full Report
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {!showLocked ? (
        <>
          <section className="section next-steps">
            <div className="step-card">
              <span className="tag">What happens next</span>
              <h3>We scrape and score your brand across AI platforms</h3>
              <p>We pull your site, compare the brand story, and score how clearly the model can recognize you.</p>
            </div>
            <div className="step-card">
              <span className="tag">What happens next</span>
              <h3>You get a GEO visibility report with a score out of 100</h3>
              <p>We show the total score, the three pillar breakdown, and what your presence looks like to AI answers.</p>
            </div>
            <div className="step-card">
              <span className="tag">What happens next</span>
              <h3>One priority fix, then an optional paid strategy</h3>
              <p>You leave with a single action that matters now and a clear path into the deeper paid report.</p>
            </div>
          </section>

          <section className="results">
            {result ? (
              <div className="result-card">
                <div className="result-top">
                  <div>
                    <h2>{result.brandName}</h2>
                    <div className="meta">
                      <a href={result.website} target="_blank" rel="noreferrer">
                        {result.website}
                      </a>
                      <span>{result.category}</span>
                    </div>
                  </div>
                  <span className={`badge ${getPillColor(result.verdictBand)}`}>{formatAudience(result.verdictBand)}</span>
                </div>

                <div className="score-wrap">
                  <AuditScoreRing score={result.fullScore || 0} />
                  <div className="score-copy">
                    <strong>{result.verdictBand}</strong>
                    <p>{result.summary}</p>
                  </div>
                </div>

                <div className="pillar-grid">
                  <PillarCard label="Brand clarity" score={result.p1Total} max={40} reasoning={result.pillar1?.reasoning} />
                  <PillarCard label="Recommendation readiness" score={result.p2Total} max={30} reasoning={result.pillar2?.reasoning} />
                  <PillarCard label="Public authority" score={result.p3Total} max={30} reasoning={result.pillar3?.reasoning} />
                </div>

                <div className="signal-list">
                  <div className="signal-teaser">
                    {auditSignals?.slice(0, 3).map((signal) => (
                      <SignalRow key={signal.label} label={signal.label} score={signal.score} max={signal.max} />
                    ))}
                  </div>
                  <div className="signal-blur-shell">
                    <div className="signal-blur-overlay">
                      <div>
                        <span className="tag">Get full report</span>
                        <h3>Unlock the remaining signal analysis, comparisons, and recommendations.</h3>
                        <p>Your free audit gives the first few clues. The full paid report goes deeper on the rest.</p>
                      </div>
                      <Link className="btn" to="/services">
                        Get Full Report
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <span className="tag">Audit summary</span>
                  <p className="summary">{result.summary}</p>
                </div>

                <div className="fix-callout">
                  <p className="hook-note">Your free audit includes one priority fix. The full paid report goes deeper.</p>
                  <div className="fix-box">
                    <strong>Top priority fix</strong>
                    <p>{result.topFix}</p>
                  </div>
                </div>
                <div className="cta-row">
                  <Link className="btn" to="/services">
                    Get Full Report
                  </Link>
                  <Link className="btn secondary" to="/contact">
                    Contact Us
                  </Link>
                </div>
              </div>
            ) : (
              <div className="result-card">
                <h2>Your audit will appear here</h2>
                <p>Complete the form and we’ll scrape, score, and summarize the brand in a format you can use immediately.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </Shell>
  );
}

function LeadCaptureForm({ buttonLabel = 'Send Message', successMessage = 'Thank you for contacting us. We will get back to you soon!', noteValue = '', noteLabel = 'Additional Note' }) {
  const [form, setForm] = useState({
    brand_name: '',
    brand_website: '',
    email_id: '',
    phone_country: 'IN',
    phone_country_code: PHONE_RULES.IN.dial,
    phone_number: '',
    additional_note: noteValue
  });
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const currentPhoneRule = PHONE_RULES[form.phone_country] || PHONE_RULES.IN;

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      phone_country_code: (PHONE_RULES[prev.phone_country] || PHONE_RULES.IN).dial
    }));
  }, [form.phone_country]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setPhoneError('');
    setSuccess(false);

    if (!form.brand_name || !form.brand_website || !form.email_id || !form.phone_number) {
      setError('Please fill all fields before submitting.');
      return;
    }

    const website = normalizeWebsite(form.brand_website);
    if (!website) {
      setError('Please enter a valid website.');
      return;
    }
    if (!validateEmail(form.email_id)) {
      setError('Please enter a valid email address.');
      return;
    }
    const normalizedPhone = normalizePhone(form.phone_country, form.phone_country_code, form.phone_number);
    if (!normalizedPhone) {
      setPhoneError('Please enter a valid phone number for the selected country.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: 'contact',
          brand_name: form.brand_name,
          brand_website: website,
          email_id: form.email_id,
          phone_country: form.phone_country,
          phone_country_code: form.phone_country_code,
          phone_number: form.phone_number,
          additional_note: form.additional_note || ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Submission failed');

      setSuccess(true);
      setForm((prev) => ({ ...prev, brand_name: '', brand_website: '', email_id: '', phone_number: '', additional_note: noteValue }));
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-card contact-form" onSubmit={submit} noValidate>
      <p className="response-note">We reply within 24 hours.</p>
      <div className="form-grid">
        <label className="field full">
          <span>Brand Name</span>
          <input value={form.brand_name} onChange={(e) => setForm((prev) => ({ ...prev, brand_name: e.target.value }))} type="text" placeholder="Bonkers Corner" />
        </label>
        <label className="field full">
          <span>Website</span>
          <input value={form.brand_website} onChange={(e) => setForm((prev) => ({ ...prev, brand_website: e.target.value }))} type="text" placeholder="www.brand.com" />
        </label>
        <label className="field">
          <span>Email</span>
          <input value={form.email_id} onChange={(e) => setForm((prev) => ({ ...prev, email_id: e.target.value }))} type="email" placeholder="you@company.com" />
        </label>
        <label className="field">
          <span>Phone Number</span>
          <div className="phone-wrap">
            <select value={form.phone_country} onChange={(e) => setForm((prev) => ({ ...prev, phone_country: e.target.value }))}>
              {Object.entries(PHONE_RULES).map(([code, rule]) => (
                <option key={code} value={code}>
                  {rule.label}
                </option>
              ))}
            </select>
            <input value={form.phone_number} onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))} type="tel" placeholder={`Enter ${currentPhoneRule.minDigits}${currentPhoneRule.minDigits === currentPhoneRule.maxDigits ? '' : `-${currentPhoneRule.maxDigits}`} digits`} />
          </div>
        </label>
        <label className="field full">
          <span>{noteLabel}</span>
          <textarea value={form.additional_note} onChange={(e) => setForm((prev) => ({ ...prev, additional_note: e.target.value }))} rows="6" placeholder="Tell us what you need" />
        </label>
      </div>
      <button className="submit-btn" type="submit" disabled={loading}>
        {loading ? 'Sending...' : buttonLabel}
      </button>
      {error ? <div className="error" style={{ display: 'block' }}>{error}</div> : null}
      {phoneError ? <div className="error" style={{ display: 'block' }}>{phoneError}</div> : null}
      {success ? <div className="success" style={{ display: 'block' }}>{successMessage}</div> : null}
    </form>
  );
}

function ChatGPTAdsPage() {
  return (
    <Shell>
      <section className="section hero hero-page">
        <div>
          <div className="pill">ChatGPT Ads waitlist</div>
          <h1>Join brands already on the waitlist</h1>
          <p className="lead">Early access includes priority onboarding and locked-in pre-launch pricing. Spots are limited per category.</p>
          <p className="hero-catchline">The next step of marketing is here and the brands that prep now will be first in line.</p>
        </div>
        <div className="panel card">
          <span className="tag">Waitlist</span>
          <h3>{currencylessCountLabel('X')}</h3>
          <p>Join the early access list so you are not scrambling when the ad layer in AI conversations goes live.</p>
        </div>
      </section>

      <section className="section">
        <div className="panel card">
          <SectionHeading
            title="Yes — this is a pitch. Here's why that's honest."
            copy="The pitch is simple: brands that build the right signals now are the ones that will move first when paid placements in AI conversations become real."
          />
          <div className="timeline">
            <div className="panel timeline-item">
              <div className="year">1</div>
              <div>
                <h3>Clear entity signals</h3>
                <p>AI needs a clean, consistent answer about who you are before it can place your brand in a conversation.</p>
              </div>
            </div>
            <div className="panel timeline-item">
              <div className="year">2</div>
              <div>
                <h3>Conversion-ready pages</h3>
                <p>We shape the landing layer so users can move from the answer to a decision without friction.</p>
              </div>
            </div>
            <div className="panel timeline-item">
              <div className="year">3</div>
              <div>
                <h3>Early access leverage</h3>
                <p>We want your brand positioned before category competition turns the waitlist into a scramble.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid-2">
          <LeadCaptureForm
            buttonLabel="Join Waitlist"
            successMessage="We’ll get back to you soon."
            noteValue="ChatGPT Ads waitlist"
            noteLabel="Additional Note"
          />
          <div className="panel card">
            <span className="tag">Straight talk</span>
            <h2>What happens when AI answers start carrying ads</h2>
            <p>
              The discovery layer is already changing. Google made intent measurable, Meta made attention targetable, and now AI answers are becoming the place where people decide what to believe before they click.
            </p>
            <p>
              The brands that prepare the entity, authority, and conversion structure now will have the cleaner shot when the inventory opens.
            </p>
            <div className="cta-row">
              <Link className="btn" to="/audit">
                Start with a free audit instead
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function ServicesPage() {
  return (
    <Shell>
      <section className="section">
        <SectionHeading
          title="Services"
          copy="A compact stack for brands that want to be visible in AI answers and ready for the ad layer after that."
        />
        <div className="grid-1 service-stack">
          {SERVICE_ITEMS.map((service) => (
            <article key={service.title} className="panel card service-card">
              <div className="service-meta">
                <span className="tag">{service.title}</span>
                <span className="timeline-pill">{service.timeline}</span>
              </div>
              <p>{service.description}</p>
              <div className="service-subsection">
                <strong>What you get</strong>
                <ul>
                  {service.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div className="service-subsection service-inline">
                <p>
                  <strong>Best for:</strong> {service.bestFor}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="panel card">
          <SectionHeading title="FAQ" />
          <div className="faq-list">
            <div className="faq-item">
              <h3>Do I need the audit before the strategy?</h3>
              <p>Yes. The audit tells us exactly where to focus so the strategy isn't guesswork.</p>
            </div>
            <div className="faq-item">
              <h3>How long does GEO strategy take?</h3>
              <p>Typically 3–4 weeks for the first engagement.</p>
            </div>
            <div className="faq-item">
              <h3>Is ChatGPT Ads a real product yet?</h3>
              <p>Not fully — but the signal-building work we do now directly determines who wins when it is.</p>
            </div>
            <div className="faq-item">
              <h3>Do you work with early-stage brands?</h3>
              <p>Yes, as long as the brand has a clear product and some web presence to audit.</p>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function BlogPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <Shell>
      <section className="section">
        <SectionHeading
          title="Blog"
          copy="No noise, just signal. We’re building the posts properly instead of filling space with placeholders."
        />
        <div className="panel card coming-soon">
          <span className="tag">Coming soon</span>
          <h2>Get notified when we publish. No noise, just signal.</h2>
          <form
            className="newsletter"
            onSubmit={(event) => {
              event.preventDefault();
              setSubscribed(true);
            }}
          >
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" />
            <button className="btn" type="submit">
              Subscribe
            </button>
          </form>
          {subscribed ? <div className="success" style={{ display: 'block' }}>Thanks. We’ll let you know when the first posts go live.</div> : null}
        </div>
      </section>
    </Shell>
  );
}

function ContactPage() {
  return (
    <Shell>
      <section className="section">
        <SectionHeading
          title="Contact"
          copy="We reply within 24 hours."
        />
        <div className="grid-2">
          <LeadCaptureForm />
          <div className="panel card">
            <span className="tag">Reach us directly</span>
            <h2>Want to know more? Send us the basics and we’ll get back to you soon.</h2>
            <div className="contact-links">
              <p><strong>Email:</strong> hello@mnemix.ai</p>
              <p><strong>X:</strong> @MnemixAI</p>
              <p><strong>LinkedIn:</strong> Mnemix AI</p>
            </div>
            <p className="placeholder-copy">[PLACEHOLDER] Swap these links with the live handles when ready.</p>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function NotFoundPage() {
  return (
    <Shell>
      <section className="section">
        <div className="panel card">
          <h2>Page not found</h2>
          <p>The route exists in the app shell, but there’s nothing on it yet.</p>
          <Link className="btn" to="/">
            Back home
          </Link>
        </div>
      </section>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/chatgpt-ads" element={<ChatGPTAdsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
