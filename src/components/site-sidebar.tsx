"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppNav } from "@/components/app-nav";
import { RefreshPricesButton } from "@/components/refresh-prices-button";

export function SiteSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <aside className={`site-sidebar${isOpen ? " open" : ""}`}>
      <div className="sidebar-header">
        <Link href="/" className="brand-block" onClick={() => setIsOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="img">
              <path d="M12 43H52M12 32H52M12 21H52M22 12V52M34 12V52M46 12V52" />
              <path className="brand-chart-shadow" d="M14 45L24 35L32 39L47 20" />
              <path className="brand-chart-line" d="M14 45L24 35L32 39L47 20" />
              <path className="brand-chart-arrow" d="M47 20H37M47 20V30" />
              <circle className="brand-chart-start" cx="14" cy="45" r="4" />
              <circle className="brand-chart-dot" cx="32" cy="39" r="3.5" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>StonkTracker</strong>
          </span>
        </Link>

        <button
          className="sidebar-menu-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls="sidebar-navigation"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? "Close" : "Menu"}
        </button>
      </div>

      <div id="sidebar-navigation" className="sidebar-content">
        <AppNav />
        <RefreshPricesButton />
      </div>
    </aside>
  );
}
