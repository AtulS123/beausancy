import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { AnimatedFrame } from '@/components/home/AnimatedFrame';

export default function Home() {
  const revealRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Scroll reveal via IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("on");
      });
    }, { threshold: 0.12 });
    revealRef.current = observer;
    document.querySelectorAll(".reveal:not(.on)").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('button');
    if (btn) btn.textContent = 'Thanks ✓';
  };

  return (
    <>
      <Head>
        <title>Beausancy — Mutual funds, for investors who think</title>
        <meta name="description" content="Filter 1,400+ Indian mutual fund schemes on rolling consistency, drawdown behaviour, style integrity and manager continuity." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="landing-body">

        {/* Navigation */}
        <nav className="l-nav">
          <div className="l-nav-inner">
            <Link href="/" className="l-logo">
              <span className="l-logo-dot" />
              Beausancy
            </Link>
            <div className="l-nav-links">
              <Link href="#why">Why</Link>
              <Link href="#how">How it works</Link>
              <Link href="/screener" className="l-nav-cta">
                Open screener <span className="arr">→</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="l-hero">
          <div className="l-wrap">
            <h1 className="l-hero-h reveal on d1">
              A smarter way to invest in mutual funds.
            </h1>
            <p className="l-hero-sub reveal on d2">
              Top small-cap fund: 33% a year. Bottom one: 16%. Same category, same five years. Picking the right fund matters as much as picking the right category. We give you the data to do it.
            </p>
            <div className="l-cta-row reveal on d3">
              <Link href="/screener" className="l-btn-primary">
                Open the screener <span className="arr">→</span>
              </Link>
              <Link href="#how" className="l-btn-ghost">See how it works</Link>
            </div>

            {/* Animated browser frame */}
            <div className="reveal on d4">
              <AnimatedFrame />
            </div>
          </div>
        </header>

        {/* Why section */}
        <section className="l-why l-section" id="why">
          <div className="l-wrap">
            <div className="l-s-head">
              <div>
                <div className="l-s-eyebrow reveal">01 — Why we built it</div>
                <h2 className="l-s-h reveal d1">
                  The tools most Indians use to pick a fund don&apos;t ask the questions that matter.
                </h2>
              </div>
              <p className="l-s-lede reveal d2">
                ₹52 lakh crore in mutual fund AUM. And the choice interfaces still stop at &ldquo;category, AUM, 1Y returns&rdquo; with a star on top.
              </p>
            </div>

            <div className="l-why-grid">
              <div className="l-why-cell reveal">
                <div className="n">01</div>
                <h4>Consistency, not a year.</h4>
                <p>One good year can carry a 3Y return for a long time. We show the share of rolling 3Y windows over seven years where the fund actually beat its category — so &ldquo;it caught one rally&rdquo; becomes visible instead of hidden.</p>
              </div>
              <div className="l-why-cell reveal d1">
                <div className="n">02</div>
                <h4>How it behaves when markets fall.</h4>
                <p>Maximum drawdown, time to recover, and downside-capture ratio — visible on every row. A fund that falls with the market and takes 18 months to climb back tells you more than its CAGR ever will.</p>
              </div>
              <div className="l-why-cell reveal d2">
                <div className="n">03</div>
                <h4>Is it still the same fund.</h4>
                <p>A Flexi Cap with an R² of 0.42 against its declared style is a momentum trade in disguise. We flag style drift. We show every manager&apos;s tenure. We flag recent manager changes.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="l-how l-section" id="how">
          <div className="l-wrap">
            <div className="l-s-head">
              <div>
                <div className="l-s-eyebrow reveal">02 — How it works</div>
                <h2 className="l-s-h reveal d1">A dense, filterable table. Every screen is a URL.</h2>
              </div>
              <p className="l-s-lede reveal d2">
                No account, no dashboard, no lock-in. Make a screen, copy the link, send it to someone who thinks about funds the way you do.
              </p>
            </div>

            <div className="l-how-steps">
              <div className="l-step reveal">
                <div className="sn">Step 01</div>
                <h4>Pick filters that mean something.</h4>
                <p>Seventeen filters across returns, risk-adjusted performance, drawdown behaviour, style integrity, manager tenure, and concentration. None of them are &ldquo;Most Bought This Week&rdquo;.</p>
              </div>
              <div className="l-step reveal d1">
                <div className="sn">Step 02</div>
                <h4>Read the table like a spreadsheet.</h4>
                <p>Sortable columns, dense rows, inline sparklines, hover for detail. Columns you can show or hide. A Tweaks panel to change density, accent and font size to suit your eyes.</p>
              </div>
              <div className="l-step reveal d2">
                <div className="sn">Step 03</div>
                <h4>Share a screen, not a screenshot.</h4>
                <p>Every filter lives in the URL. Send someone a link to &ldquo;Flexi Cap funds with rolling consistency above 70% and downside capture below 90%&rdquo; and they see the same funds you do.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="l-final l-section">
          <div className="l-wrap">
            <div className="l-eyebrow reveal">
              <span className="dot" />
              It&apos;s free. It always will be.
            </div>
            <h2 className="reveal d1">Treat mutual funds like you&apos;d treat stocks.</h2>
            <p className="reveal d2">
              Top small-cap fund: 33% a year. Bottom one: 16%. Same category, same five years. Picking the right fund matters more than picking the right category. We give you the data to do it.
            </p>
            <div className="l-cta-row reveal d3">
              <Link href="/screener" className="l-btn-primary">
                Find your fund.
              </Link>
              <Link href="#how" className="l-btn-ghost">Read how it works</Link>
            </div>
            <form className="l-signup reveal d4" onSubmit={handleSignup}>
              <input type="email" placeholder="you@domain.com" required />
              <button type="submit">Sign up for alerts</button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="l-foot">
          <div className="l-foot-inner">
            <span>© 2026 Beausancy · Built in Bengaluru</span>
            <span>
              <Link href="/screener" style={{textDecoration:"none",color:"inherit"}}>
                Open screener →
              </Link>
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}
