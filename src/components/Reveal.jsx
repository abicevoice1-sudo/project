import { useEffect, useRef } from 'react';

/**
 * Fail-safe scroll reveal. Content is VISIBLE by default — the hidden initial
 * state only applies when JavaScript is running (`.js` on <html>) and the
 * browser has no reduced-motion preference. A native IntersectionObserver adds
 * `.is-visible`; a 2.5s backstop timer guarantees content can never stay
 * hidden if the observer misfires. Animation enhances, never gates.
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let io = null;
    const show = () => el.classList.add('is-visible');
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              show();
              io?.disconnect();
            }
          });
        },
        { rootMargin: '0px 0px -70px 0px' }
      );
      io.observe(el);
    } else {
      show();
    }
    const t = setTimeout(show, 2500);
    return () => {
      io?.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}s` }} {...rest}>
      {children}
    </Tag>
  );
}
