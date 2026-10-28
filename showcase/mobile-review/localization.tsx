import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import './localization.css';

export type ShowcaseLanguage = 'en' | 'zh-CN';
export const SHOWCASE_LANGUAGE_STORAGE_KEY = 'alvenx-showcase-language-v1';

/** English copy is the lookup key, so source copy stays readable at its use site.
 * Language selection belongs to the showcase, independently of material settings.
 * Deliberately do not infer language from the browser or the operating system. */
export const SHOWCASE_CHINESE_COPY: Readonly<Record<string, string>> = {
  'Choose language': '选择语言',
  'Language': '语言',
  'Showcase language': '展示页语言',
  'Skip to the experience': '跳转到交互演示',
  'AlvenX — Back to top': 'AlvenX — 返回顶部',
  'Navigation menu': '导航菜单',
  'Menu': '菜单',
  'Showcase': '展示页导航',
  'Experience': '体验',
  'Components': '组件',
  'Design': '设计',
  'Code': '代码',
  'GitHub (opens in a new tab)': 'GitHub（在新标签页打开）',
  'ALVENX LIQUID GLASS · INTERACTIVE DESIGN SYSTEM': 'ALVENX 液态玻璃 · 交互设计系统',
  'ALVENX LIQUID GLASS': 'ALVENX 液态玻璃',
  'Glass that follows your hand.': '随手而动的玻璃。',
  'Glass that follows': '随手而动',
  'your hand.': '的玻璃。',
  'Touch the form to shape it. Swipe the surrounding space to scroll. Explore live refraction with your finger or trackpad.': '触摸并拖动形体，感受实时折射；在周围空白处滑动即可滚动页面。',
  'Touch to shape. Swipe outside to scroll.': '触摸形体，随手塑形；在空白处滑动，即可滚动。',
  'Touch the form. Swipe outside to scroll.': '触摸形体即可互动；在空白处滑动即可滚动。',
  'Touch the pearl. Scroll around it.': '触摸珠体即可互动，在周围滑动即可滚动。',
  'Touch to shape it. Swipe outside to scroll.': '触摸形体，随手塑形；在空白处滑动，即可滚动。',
  'Explore the material': '体验玻璃材质',
  'PUBLIC DESIGN PREVIEW': '公开设计预览',
  'Public design preview': '公开设计预览',
  'A continuous form.': '连续的形体。',
  '01 / A CONTINUOUS FORM': '01 / 连续的形体',
  'Hold the form.': '按住形体，',
  'Move in any direction.': '向任意方向拖动。',
  'Hold the form. Move in any direction.': '按住形体，向任意方向拖动。',
  'Hold. Pull. Let go.': '按住，拖动，松开。',
  'Budding…': '正在生长…',
  'Play slow budding': '播放缓慢生长',
  'Replay slow budding': '重播缓慢生长',
  'Touch the pearl form; swipe its surrounding background to scroll': '触摸珠体即可互动；滑动周围背景即可滚动页面',
  'Interactive preview': '交互预览',
  'Touch and drag to shape the glass.': '触摸并拖动，改变玻璃形状。',
  'On the pearl: pull, hold, release.': '在珠体上：拖动、按住、松开。',
  'Outside the pearl: scroll freely.': '在珠体外：自由滚动页面。',
  'Try the glass': '体验玻璃',
  'Toggle explore link': '展开或收起体验入口',
  'explore me!': '探索玻璃',
  'Background motion': '背景动效',
  'Reduced motion': '减弱动态效果',
  'Surface parameters': '材质参数',
  'Reset defaults': '恢复默认',
  'Tune the material below. The pearl above and the glass controls share these settings.': '在下方调整参数，上方珠体与玻璃控件会同步呈现变化。',
  'Interaction strength': '交互强度',
  'Specular opacity': '高光不透明度',
  'Specular saturation': '高光饱和度',
  'Refraction level': '折射强度',
  'Blur level': '模糊程度',
  'Progressive blur': '渐进模糊',
  'Glass background opacity': '玻璃底色不透明度',
  '02 / LOOK THROUGH IT': '02 / 透过玻璃',
  'A source. A lens.': '同一画面，一枚透镜。',
  'Real displacement.': '真实折射位移。',
  'Drag the lens over the letters or the line. The scene is shared by the background and the glass.': '把透镜拖过文字或进度条。背景与玻璃内部取自同一幅实时画面。',
  'A clear view. A living edge.': '视野清晰，边缘灵动。',
  'Light & form': '光与形',
  'Drag the refractive lens, or use arrow keys': '拖动折射透镜，或使用方向键移动',
  'Progress': '进度',
  'Continuous switch': '连续交互开关',
  'On': '开启',
  'Off': '关闭',
  'Sample text': '示例文字',
  'The sample font could not load. Your text is kept; edit to retry.': '示例字体未能载入，输入内容已保留。继续编辑即可重试。',
  'Preparing sample typography…': '正在准备示例字体…',
  'Finish choosing your text to update the sample.': '完成输入法选字后，示例会自动更新。',
  'Up to {limit} characters.': '最多输入 {limit} 个字符。',
  'Change the word or line. Their refracted pixels update inside the lens. Text outside it stays untouched.': '修改文字或进度，透镜内的折射画面会实时更新，外部文字保持原样。',
  '03 / TYPE CLEARLY': '03 / 清晰输入',
  'The surface bends.': '光影随形而变，',
  'Your words stay clear.': '文字始终清晰。',
  'Native text, selection and keyboard editing above the optical layer.': '文字位于光学效果上方，保留原生选择、输入与键盘编辑。',
  'Write a message before sending.': '输入内容后再发送。',
  'Preview message': '体验消息输入',
  'Ask anything…': '随便问点什么…',
  'Send preview message': '发送体验消息',
  '04 / DESIGN LANGUAGE': '04 / 设计语言',
  'Softness with a structure.': '柔和有形，结构有序。',
  '01 / FORM': '01 / 形体',
  'Full volume': '饱满的体积',
  'A mother form, a soft connection and an expanding chamber share one continuous contour.': '从母体，经柔软的连接，到逐渐展开的内容空间，始终保持一条连续的轮廓。',
  '02 / LIGHT': '02 / 光线',
  'Light at the edge': '光沿边缘流动',
  'Blue, indigo and violet give the material depth. Edge light follows its living contour.': '蓝、靛与紫赋予材质层次，边缘的光随轮廓自然流动。',
  '03 / MOTION': '03 / 动态',
  'Motion with memory': '延续手势的动态',
  'Continuous gestures, bounded resistance and a return after release preserve the movement of your hand.': '连续跟随手势，以适度阻力回应拖动，松手后自然回弹，让动作保留余韵。',
  '04 / TYPE': '04 / 文字',
  'Text stays text': '文字保持本真',
  'Instrument Sans and MiSans stay readable, selectable and editable above the optical layer.': 'Instrument Sans 与 MiSans 位于光学效果上方，保持清晰，并可原生选择和编辑。',
  'Room for a new idea.': '给新想法一点空间。',
  'Space for an idea to grow.': '给想法一个慢慢生长的空间。',
  'Instrument Sans / MiSans · Native, selectable text': 'Instrument Sans / MiSans · 原生文字，可自由选择',
  '05 / INSPECT THE SYSTEM': '05 / 探索实现',
  'A material you can explore.': '从质感，走进实现。',
  'Explore the source': '查看源代码',
  'React components, continuous geometry, scoped styles and editable material parameters. Source is public for inspection; reuse requires permission under the reserved-rights notice.': '基于 React 组件、连续几何、局部样式与可编辑的材质参数。代码公开供查阅，复用须按保留权利声明获得许可。',
  'Run the showcase locally': '在本地运行展示页',
  'Design language': '设计语言',
  'Integration guide': '集成指南',
  'Browser support': '浏览器支持',
  'Credits & licenses': '致谢与许可',
  'Large forms use a 2.5D lighting environment. The interactive specimens refract a shared SVG scene, including its live text and progress. Arbitrary page capture is not provided. Physical iPhone and iPad validation continues with device feedback.': '大形体采用 2.5D 光照环境。交互样本对共享 SVG 场景进行折射，文字与进度实时同步；不提供任意页面内容的捕获。iPhone 与 iPad 的实机表现继续结合设备反馈验证。',
  'DEVICE REVIEW': '设备体验',
  'Try it on your device.': '在你的设备上体验。',
  'Show input report': '显示输入报告',
  'If a touch or trackpad drag fails, the local report shows which input and capture events reached this page. Frame timings describe scheduling, not physical display latency.': '如果触摸或触控板拖动出现问题，可通过本地报告查看页面收到的输入与指针捕获事件。帧耗时反映任务调度，不代表屏幕的实际显示延迟。',
  'Local input report': '本地输入报告',
  'Copy input report': '复制输入报告',
  'Report copied.': '报告已复制。',
  'Select the report text to copy.': '请选择报告文字后复制。',
  'Shaped for interaction.': '为交互而塑形。',
  'All rights reserved.': '保留所有权利。',
  'License notice': '权利声明',
};

function isLanguage(value: unknown): value is ShowcaseLanguage {
  return value === 'en' || value === 'zh-CN';
}

function readLanguage(): ShowcaseLanguage {
  try {
    const saved = window.localStorage.getItem(SHOWCASE_LANGUAGE_STORAGE_KEY);
    return isLanguage(saved) ? saved : 'en';
  } catch { return 'en'; }
}

type LanguageStatus = 'ready' | 'loading' | 'error';
// One bounded catalog request per locale. Character deduplication avoids asking
// FontFaceSet to match repeated prose; decoded face/shard caching stays native.
const chineseGlyphs = Array.from(new Set((Object.values(SHOWCASE_CHINESE_COPY).join('')+'范围至最多保留位小数按离开输入框应用取消已恢复为已设为已四舍五入为最多个字符已忽略粘贴已取消编辑简体中文').replace(/[\u0000-\u007f]/g, ''))).join('');
// The canonical 590 navigation weight selects MiSans 600. Prepare only the
// navigation/option glyphs at this weight; body copy still needs only 400/500.
const navigationChineseGlyphs = Array.from(new Set(['Experience', 'Components', 'Design', 'Code', 'Language'].map(key => SHOWCASE_CHINESE_COPY[key]).join('')+'简体中文')).join('');
let chineseFonts: Promise<void> | null = null;
function prepareChinese(): Promise<void> {
  if (chineseFonts) return chineseFonts;
  if (!document.fonts?.load) return Promise.reject(new Error('Font loading is unavailable.'));
  const requests = [400, 500].map(weight => ({ weight, glyphs: chineseGlyphs }));
  requests.push({ weight: 600, glyphs: navigationChineseGlyphs });
  const request = Promise.all(requests.map(({ weight, glyphs }) => document.fonts.load(`${weight} 16px "MiSans"`, glyphs).then(faces => {
    if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error('The Chinese catalog font is unavailable.');
  }))).then(() => undefined);
  chineseFonts = request;
  void request.catch(() => { if (chineseFonts === request) chineseFonts = null; });
  return request;
}

export function useShowcaseLanguage() {
  // Stored Chinese starts with the stable English page and publishes only once
  // body catalog weights and the actual navigation glyphs are ready.
  const [language, updateLanguage] = useState<ShowcaseLanguage>('en');
  const [requestedLanguage, updateRequested] = useState<ShowcaseLanguage>(readLanguage);
  const [languageStatus, setLanguageStatus] = useState<LanguageStatus>(() => readLanguage() === 'zh-CN' ? 'loading' : 'ready');
  const sequence = useRef(0), mounted = useRef(true);
  const setLanguage = useCallback((next: ShowcaseLanguage) => {
    if (!isLanguage(next)) return;
    const request = ++sequence.current;
    updateRequested(next);
    const publish = () => {
      if (!mounted.current || request !== sequence.current) return;
      updateLanguage(next);
      setLanguageStatus('ready');
      try { window.localStorage.setItem(SHOWCASE_LANGUAGE_STORAGE_KEY, next); }
      catch { /* Browsing and language selection remain usable without storage. */ }
    };
    if (next === 'en') { publish(); return; }
    setLanguageStatus('loading');
    void prepareChinese().then(publish, () => {
      if (mounted.current && request === sequence.current) setLanguageStatus('error');
    });
  }, []);
  useLayoutEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    mounted.current = true;
    setLanguage(readLanguage());
    const synchronize = (event: StorageEvent) => {
      if (event.key !== SHOWCASE_LANGUAGE_STORAGE_KEY || !isLanguage(event.newValue)) return;
      setLanguage(event.newValue);
    };
    window.addEventListener('storage', synchronize);
    return () => { mounted.current = false; sequence.current++; window.removeEventListener('storage', synchronize); };
  }, [setLanguage]);
  const t = useCallback((english: string, values?: Readonly<Record<string, string | number>>): string => {
    const copy = language === 'zh-CN' ? (SHOWCASE_CHINESE_COPY[english] ?? english) : english;
    return values ? copy.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder)) : copy;
  }, [language]);
  return { language, requestedLanguage, languageStatus, setLanguage, t };
}

export function LanguageControl({ language, onLanguageChange, busy = false, error = false }: {
  language: ShowcaseLanguage;
  onLanguageChange: (language: ShowcaseLanguage) => void;
  busy?: boolean;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const english = useRef<HTMLButtonElement>(null);
  const chinese = useRef<HTMLButtonElement>(null);
  const focusOnOpen = useRef<'en' | 'zh-CN' | null>(null);
  const panelId = `showcase-language-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    if (focusOnOpen.current) {
      (focusOnOpen.current === 'en' ? english : chinese).current?.focus({ preventScroll: true });
      focusOnOpen.current = null;
    }
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); close(true);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (!open) {
        focusOnOpen.current = event.key === 'ArrowUp' || event.key === 'End' ? 'zh-CN' : 'en';
        setOpen(true);
      } else {
        const next = event.key === 'Home' ? english : event.key === 'End' ? chinese : document.activeElement === english.current ? chinese : english;
        next.current?.focus({ preventScroll: true });
      }
    }
  };
  return <div className="lab-language" ref={root} onKeyDown={keyboard}
    onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <button ref={trigger} className="lab-language__toggle" type="button" aria-label={language === 'zh-CN' ? '选择语言' : 'Choose language'}
      aria-expanded={open} aria-controls={panelId} aria-busy={busy || undefined} onClick={() => setOpen(value => !value)}>
      <span>{language === 'zh-CN' ? '语言' : 'Language'}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div id={panelId} className="lab-language__panel" role="group" aria-label={language === 'zh-CN' ? '展示页语言' : 'Showcase language'}>
      <button ref={english} type="button" lang="en" aria-pressed={language === 'en'} onClick={() => { onLanguageChange('en'); close(true); }}>English</button>
      <button ref={chinese} type="button" lang="zh-CN" aria-pressed={language === 'zh-CN'} onClick={() => { onLanguageChange('zh-CN'); close(true); }}>简体中文</button>
    </div>}
    <span className="lab-language__status" role="status" aria-live="polite">{busy ? 'Preparing Chinese…' : error ? 'Chinese fonts could not load. Please try again.' : ''}</span>
  </div>;
}
