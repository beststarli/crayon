import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import AuthDialog from "@/components/auth-dialog";

export const metadata: Metadata = {
  title: "Crayon 把喜欢的瞬间，画下来",
  description: "上传照片，让它变成油画棒的模样；再跟着简单的步骤，亲手画出属于你的作品。",
  icons: {
    icon: [{ url: "/images/crayon-logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/images/crayon-logo-180.png", sizes: "180x180" }],
  },
};

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('crayon-theme');
    document.documentElement.dataset.theme = saved === 'light' || saved === 'dark'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch (error) {
    document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><AuthProvider>{children}<AuthDialog /></AuthProvider></body>
    </html>
  );
}
