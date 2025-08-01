import { Inter } from "next/font/google";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Mamo-ru Kun",
  description: "Protects you from crashes!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Load the Eruda script */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/eruda"
          strategy="beforeInteractive"
        />

        {/* Initialize Eruda only after it’s loaded */}
        <Script 
          id="eruda-init"
          strategy="beforeInteractive"
        >
          {`eruda.init();`}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
