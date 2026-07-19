import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GestionAle | Il gestionale di ShinyUp",
  description: "Advanced resource management dashboard for Trello and Google Calendar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
