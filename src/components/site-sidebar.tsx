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
          <span className="brand-mark">ST</span>
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
