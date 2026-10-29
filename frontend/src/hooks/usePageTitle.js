import { useEffect } from 'react';

const HOME_TITLE = 'FOREVER | Modern fashion for men, women & kids';

// Browser tab title for a page: "Collection | FOREVER", or the full store title when none is given
export const pageTitle = (title) => (title ? `${title} | FOREVER` : HOME_TITLE);

const usePageTitle = (title) => {
  useEffect(() => {
    document.title = pageTitle(title);
  }, [title]);
};

export default usePageTitle;
