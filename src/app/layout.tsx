import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "StonkTracker",
  description: "Track holdings locally, batch refresh quotes, and project future portfolio value."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <aside className="site-sidebar">
            <Link href="/" className="brand-block">
              <span className="brand-mark">ST</span>
              <span className="brand-copy">
                <strong>StonkTracker</strong>
              </span>
            </Link>

            <AppNav />
          </aside>

          <div className="site-main">
            <div className="content-shell">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
