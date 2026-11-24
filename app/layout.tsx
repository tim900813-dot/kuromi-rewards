import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuromi Purple Rewards",
  description: "Collect 30 points and unlock a special reward.",
  themeColor: "#21152f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
