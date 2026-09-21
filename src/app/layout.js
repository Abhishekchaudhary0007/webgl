import "./globals.css";

export const metadata = {
  title: "Digital Worlds",
  description: "Immersive WebGL experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}