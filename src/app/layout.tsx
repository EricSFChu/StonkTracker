import type { Metadata } from "next";

import { PriceRefreshWatcher } from "@/components/price-refresh-watcher";
import { SiteSidebar } from "@/components/site-sidebar";
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
          <SiteSidebar />

          <div className="site-main">
            <div className="content-shell">{children}</div>
          </div>
        </div>
        <PriceRefreshWatcher />
      </body>
    </html>
  );
}
