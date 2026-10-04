import { useEffect } from 'react';

const SITE = 'Shia Rishta';

/**
 * Sets document.title for the current page. Call at the top of each page
 * component: usePageTitle('Browse Profiles').
 */
export function usePageTitle(page) {
  useEffect(() => {
    document.title = page ? `${page} — ${SITE}` : `${SITE} — Where intention meets introduction`;
    return () => {
      document.title = `${SITE} — Where intention meets introduction`;
    };
  }, [page]);
}
