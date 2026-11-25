import { useEffect, useRef } from 'react';
import { archiveTag, markup } from 'virtual:alvenx-design-record';

export { archiveTag };

export function AssetRecord({ repository, t }: { repository: string; t: (text: string) => string }) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === '#asset-record') section.current?.scrollIntoView({ behavior: 'instant' });
  }, []);
  const root = new URL(import.meta.env.PROD ? '../' : '../../', import.meta.url);
  const evidence = new URL('docs/reviews/2026-11-25/asset-record/', root);
  const file = (name: string) => new URL(name, evidence).href;
  return <section ref={section} id="asset-record" className="lab-section lab-asset-record" aria-labelledby="asset-record-heading">
    <h2 id="asset-record-heading">{t('Design record')}</h2>
    <div className="lab-doc-links">
      <a href={`${repository}/releases/tag/${archiveTag}`}>{t('Fixed source and release')} ↗</a>
      <a href={`${repository}/tree/${archiveTag}/docs/reviews/2026-11-25/asset-record`}>{t('Reproduction evidence')} ↗</a>
      <a href={file('measurements.json')}>JSON ↗</a>
    </div>
    <article lang="zh-CN" dangerouslySetInnerHTML={{ __html: markup }}/>
    <figure>
      <video aria-label={t('Shared light on the input and send button')} controls playsInline preload="none"
        poster={file('rail-light-phase-a.png')} width="1200" height="780" src={file('shared-light-controls.webm')}/>
      <figcaption>{t('Shared light on the input and send button')}</figcaption>
    </figure>
    <div className="lab-doc-links">
      <a href={file('chamber-title-desktop.png')}>{t('Chamber on desktop')} ↗</a>
      <a href={file('chamber-title-narrow-390.png')}>{t('Chamber on a narrow screen')} ↗</a>
      <a href={file('menu-compact-890.png')}>{t('Responsive menu')} ↗</a>
    </div>
  </section>;
}
