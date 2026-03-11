"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/",
    label: "Overview"
  },
  {
    href: "/holdings",
    label: "Holdings"
  },
  {
    href: "/projections",
    label: "Projections"
  },
  {
    href: "/compounding",
    label: "Compounding"
  }
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="nav-list" aria-label="Primary">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? " active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="nav-link-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
