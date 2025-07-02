import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "IRYS 2048",
  description: "2048 on IRYS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-irys-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}