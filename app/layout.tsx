import type { Metadata } from "next";
import "./globals.css";
import KiteSky from "@/components/KiteSky";
import FirebaseInit from "@/components/FirebaseInit";

export const metadata: Metadata = {
  title: "EventRadar — find tech events",
  description:
    "One-page tech-event finder: hackathons, meetups and more, aggregated live from multiple sources.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen text-ink antialiased">
        <FirebaseInit />
        <KiteSky />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
