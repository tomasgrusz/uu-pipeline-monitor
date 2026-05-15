"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/datasets", label: "Datasets" },
  { href: "/pipelines", label: "Pipelines" },
  { href: "/runs", label: "Runs" },
  { href: "/alerts", label: "Alerts" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-block">
          <div className="brand-mark">UPM</div>
          <div>
            <p className="brand-title">UU Pipeline Monitor</p>
            <p className="brand-subtitle">Operations console</p>
          </div>
        </div>

        <nav className="nav-links" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
