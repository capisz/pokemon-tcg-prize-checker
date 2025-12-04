import type { Metadata } from "next";
import "./globals.css";
import { MusicControls } from "@/components/music-controls";


export const metadata: Metadata = {
  title: "PrizeCheckDrillr",
  description: "Prize check practice app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-50">
        {children}

        {/* Global floating music controls, always mounted */}
        <div className="fixed right-4 bottom-4 z-50">
          <MusicControls />
        </div>
      </body>
      
    </html>
  );
}
