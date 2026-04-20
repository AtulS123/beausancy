import React from 'react';
import Link from 'next/link';

interface SiteNavProps {
  activePage?: 'home' | 'screener';
}

export function SiteNav({ activePage }: SiteNavProps) {
  return (
    <nav className="site-nav">
      <Link href="/" className="sn-logo">
        <span className="sn-logo-dot" />
        Beausancy
      </Link>
      <div className="sn-links">
        <Link href="/#why" className={activePage === 'home' ? 'sn-active' : ''}>Why</Link>
        <Link href="/#how" className="">How it works</Link>
        <Link href="/screener" className={activePage === 'screener' ? 'sn-active' : ''}>Screener</Link>
        {activePage === 'screener' ? (
          <Link href="/" className="sn-cta">Back to home <span className="sn-arr">→</span></Link>
        ) : (
          <Link href="/screener" className="sn-cta">Open screener <span className="sn-arr">→</span></Link>
        )}
      </div>
    </nav>
  );
}
