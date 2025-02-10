import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Website Metadata Manager",
  description: "Update your website favicon and title easily",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
