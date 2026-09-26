"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "crayon-theme";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function HomeClient() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    syncTheme();
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // The selected theme still applies for this visit when storage is blocked.
    }
    setTheme(nextTheme);
  }

  function openPreview() {
    dialogRef.current?.showModal();
  }

  function closePreview() {
    dialogRef.current?.close();
  }

  return (
    <main className="studio-page">
      <div className="studio-scene studio-scene-day" aria-hidden="true" />
      <div className="studio-scene studio-scene-night" aria-hidden="true" />
      <div className="studio-light studio-light-day" aria-hidden="true" />
      <div className="studio-light studio-light-night" aria-hidden="true" />
      <div className="studio-grain" aria-hidden="true" />

      <div className="studio-content">
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Crayon 首页">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>Crayon<span className="brand-dot">.</span></span>
          </Link>
          <div className="header-actions">
            <span className="header-note">一张照片，一幅亲手画的画</span>
            <a
              className="header-icon-link glass-control"
              href="https://github.com/beststarli/crayon"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="在 GitHub 查看 Crayon 仓库"
              title="GitHub · Crayon"
            >
              <svg className="github-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.7a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-4.7 0-1 .4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.2 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.6.7.7 1 1.6 1 2.6 0 3.6-2.4 4.4-4.6 4.7.4.3.7.9.7 1.8v2.8c0 .4.2.6.7.5A9.5 9.5 0 0 0 12 2.7Z" />
              </svg>
            </a>
            <a
              className="header-icon-link blog-link glass-control"
              href="https://www.beststarli.cn/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="访问 BestStar 的个人博客"
              title="BestStar 的个人博客"
            >
              <Image src="/images/beststar-avatar.webp" alt="" width={38} height={38} />
            </a>
            <button
              className="theme-toggle glass-control"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "切换至浅色模式" : theme === "light" ? "切换至深色模式" : "切换深浅模式"}
              title={theme === "dark" ? "切换至浅色模式" : "切换至深色模式"}
            >
              <svg className="sun-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
              <svg className="moon-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" /></svg>
              <span className="theme-toggle-text">{theme === "dark" ? "白天" : "夜晚"}</span>
            </button>
          </div>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-intro">
            <p className="eyebrow"><span className="eyebrow-line" /> WELCOME TO YOUR LITTLE STUDIO <span className="eyebrow-line" /></p>
            <h1 id="hero-title">把喜欢的瞬间，<em>画下来。</em></h1>
            <p className="hero-description">上传一张照片，让它变成油画棒的模样。<br className="desktop-break" />再跟着简单的步骤，亲手画出属于你的作品。</p>
          </div>

          <figure className="artwork">
            <div className="artwork-paper">
              <div className="artwork-image">
                <Image className="artwork-day" src="/images/flower-field-day.webp" alt="阳光下的黄色与橙色花田，油画棒绘制" fill priority sizes="(max-width: 640px) 82vw, (max-width: 1024px) 58vw, 470px" />
                <Image className="artwork-night" src="/images/flower-field-night.webp" alt="夜色中的黄色与橙色花田，油画棒绘制" fill priority sizes="(max-width: 640px) 82vw, (max-width: 1024px) 58vw, 470px" />
              </div>
              <span className="artwork-tape artwork-tape-top-left" aria-hidden="true" />
              <span className="artwork-tape artwork-tape-top-right" aria-hidden="true" />
              <span className="artwork-tape artwork-tape-bottom-left" aria-hidden="true" />
              <span className="artwork-tape artwork-tape-bottom-right" aria-hidden="true" />
            </div>
            <figcaption className="artwork-caption">
              <span>花田 / <span className="caption-day">晴日</span><span className="caption-night">入夜</span></span>
              <span>OIL PASTEL STUDY · 01</span>
            </figcaption>
          </figure>

          <div className="hero-action">
            <button className="start-button glass-control" ref={startRef} type="button" onClick={openPreview}>
              <span>开始创作</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
            </button>
            <p>上传照片 <span>·</span> 选择画幅 <span>·</span> 跟着教程画</p>
          </div>
        </section>

        <footer className="site-footer">
          <span>LET EVERY PHOTO BECOME A PAINTING</span>
          <span>© CRAYON STUDIO</span>
        </footer>
      </div>

      <dialog
        className="preview-dialog"
        ref={dialogRef}
        aria-labelledby="preview-title"
        onClose={() => startRef.current?.focus()}
        onClick={(event) => {
          if (event.target === dialogRef.current) closePreview();
        }}
      >
        <div className="preview-panel">
          <button className="dialog-close" type="button" onClick={closePreview} aria-label="关闭创作流程预览">×</button>
          <span className="dialog-kicker">COMING SOON · 即将开放</span>
          <h2 id="preview-title">从一张照片，<br />到一幅自己的画。</h2>
          <p className="dialog-intro">Crayon 正在准备一套轻松上手的创作方式。功能开放后，你可以这样开始：</p>
          <ol className="preview-steps">
            <li><span>01</span><div><strong>上传照片</strong><p>挑一张你想留住的画面。</p></div></li>
            <li><span>02</span><div><strong>选择画幅</strong><p>选好比例，看看它的油画棒模样。</p></div></li>
            <li><span>03</span><div><strong>跟着教程画</strong><p>从铺色到细节，一步步完成。</p></div></li>
          </ol>
          <button className="dialog-done" type="button" onClick={closePreview}>我知道了</button>
        </div>
      </dialog>
    </main>
  );
}
