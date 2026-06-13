import "./styles.css";

export const metadata = {
  title: "App Screenshot AI",
  description: "Local-first AI app store screenshot generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
