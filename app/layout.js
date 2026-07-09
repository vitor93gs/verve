import "./globals.css";

export const metadata = {
  title: "Verve Marketing | Painel administrativo",
  description: "Painel administrativo persistente para clientes, demandas e equipe da Verve Marketing."
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
