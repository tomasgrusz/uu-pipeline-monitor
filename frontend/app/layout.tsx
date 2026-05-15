import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UU Pipeline Monitor",
  description: "Monitor and manage data pipelines",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  );
}
