import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * Scroll-reveal primitives — zero client JavaScript per instance.
 *
 * They render plain server HTML marked with data attributes. A single inline
 * IntersectionObserver (see `revealScript`, injected once in the root layout)
 * adds `.is-in` as elements enter the viewport and CSS transitions do the rest.
 * This keeps the polished staggered reveals while avoiding dozens of hydrated
 * animation components per page (much lower Total Blocking Time on phones).
 *
 * Fallbacks: no-JS and reduced-motion visitors see everything immediately.
 * `suppressHydrationWarning` is set because the observer may add `.is-in`
 * before React hydrates.
 */

type Tag = "div" | "section" | "li" | "ul" | "ol" | "dl" | "article" | "span" | "p";

const vars = (v: Record<string, string | number>) => v as CSSProperties;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  x = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
  as?: Tag;
  /** Kept for API compatibility; the shared observer uses a fixed threshold. */
  amount?: number;
}) {
  const T = as as ElementType;
  return (
    <T data-reveal="" suppressHydrationWarning className={className} style={vars({ "--d": `${delay}s`, "--ry": `${y}px`, "--rx": `${x}px` })}>
      {children}
    </T>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  as?: Tag;
  amount?: number;
}) {
  const T = as as ElementType;
  return (
    <T data-reveal-group="" data-stagger={stagger} data-delay={delay} suppressHydrationWarning className={className}>
      {children}
    </T>
  );
}

export function RevealItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: Tag }) {
  const T = as as ElementType;
  return (
    <T data-reveal-item="" suppressHydrationWarning className={className}>
      {children}
    </T>
  );
}

type Line = { text: string; className?: string };

/**
 * Staggered word-by-word masked reveal for headings.
 * `immediate` (above the fold) plays a CSS keyframe from first paint; otherwise
 * the words rise when the heading scrolls into view.
 * Screen readers get the sentence via aria-label; the split words are aria-hidden.
 */
export function SplitReveal({
  lines,
  as: Heading = "h2",
  className,
  delay = 0,
  immediate = false,
}: {
  lines: (Line | string)[];
  as?: ElementType;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const normalized = lines.map((l) => (typeof l === "string" ? { text: l } : l));
  const label = normalized.map((l) => l.text).join(" ");
  let index = 0;

  return (
    <Heading className={className} aria-label={label} {...(immediate ? {} : { "data-reveal-split": "", suppressHydrationWarning: true })}>
      <span aria-hidden className="block">
        {normalized.map((line, li) => (
          <span key={li} className={`block ${line.className ?? ""}`}>
            {line.text.split(" ").map((word) => {
              const i = index++;
              return (
                <span key={`${li}-${i}`} className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                  <span className={immediate ? "enter-word" : "split-word"} style={vars({ "--d": `${(delay + i * 0.06).toFixed(2)}s` })}>
                    {word}
                  </span>
                  {" "}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </Heading>
  );
}

/** Shared observer, inlined at the end of <body> so it runs before hydration. */
export const revealScript = `(function(){
var SEL='[data-reveal]:not(.is-in),[data-reveal-group]:not(.is-in),[data-reveal-split]:not(.is-in)';
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(el){
  var items=el.hasAttribute('data-reveal-group')?el.querySelectorAll('[data-reveal-item]'):[];
  if(items.length){var st=parseFloat(el.getAttribute('data-stagger')||'0.08'),d0=parseFloat(el.getAttribute('data-delay')||'0');
    for(var i=0;i<items.length;i++)items[i].style.setProperty('--d',(d0+Math.min(i,10)*st).toFixed(2)+'s');}
  el.classList.add('is-in');
  setTimeout(function(){el.style.setProperty('--d','0s');for(var j=0;j<items.length;j++)items[j].style.setProperty('--d','0s');},2200);
}
var io=('IntersectionObserver' in window)&&!reduce?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);show(e.target);}});},{rootMargin:'0px 0px -6% 0px',threshold:0.1}):null;
// Never read layout here (no getBoundingClientRect): forcing a synchronous
// full-page layout during HTML parsing is very expensive on phones. The
// observer computes intersections inside the browser's own rendering pass.
function scan(root){var list=root.querySelectorAll?root.querySelectorAll(SEL):[];
  for(var i=0;i<list.length;i++){io?io.observe(list[i]):show(list[i]);}
  if(root.matches&&root.matches(SEL)){io?io.observe(root):show(root);}}
scan(document);
new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n);});});}).observe(document.documentElement,{childList:true,subtree:true});
})();`;

/**
 * Above-the-fold counterpart of <Reveal>: plays a CSS entrance from first paint
 * (no observer, no hydration), so it never delays Largest Contentful Paint.
 */
export function Enter({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={className ? `enter ${className}` : "enter"} style={vars({ "--d": `${(delay + 0.35).toFixed(2)}s` })}>
      {children}
    </div>
  );
}
