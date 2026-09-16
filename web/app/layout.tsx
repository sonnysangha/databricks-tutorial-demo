import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { dataMode } from "@/lib/feedback";
import "./globals.css";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "PapaEats · Feedback Overview",
  description:
    "Customer feedback, recurring issues and the evidence behind them.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border bg-surface/60">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-lg font-black text-white">
                P
              </span>
              <span>
                <strong className="block text-base tracking-tight">
                  PapaEats
                </strong>
                <span className="text-xs text-muted">
                  Feedback intelligence
                </span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-4 text-xs text-muted">
              <Link href="/decisions" className="hover:text-foreground">Saved decisions</Link>
              <Link href="/submit" className="primary-button">Submit feedback</Link>
              <Link href="/workflow" className="hover:text-foreground">
                Workflow
              </Link>
              <span className="source-badge">
                <span className="mr-2 text-emerald-400">●</span>
                {dataMode()}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-border px-5 py-5 text-center text-xs text-muted">
          PapaEats fictional demo · App Store, Google Play, support and in-app
          feedback · Saved analysis, no AI calls on page load.
        </footer>
      </body>
    </html>
  );
}
