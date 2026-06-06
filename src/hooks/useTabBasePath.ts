import { useRouteMatch } from 'react-router';

/**
 * The current tab's base path (e.g. "/tabs/home"). Lets shared components
 * (cards, etc.) push detail pages into whichever tab rendered them, keeping
 * per-tab back stacks intact.
 */
export function useTabBasePath(): string {
  const match = useRouteMatch<{ tab: string }>('/tabs/:tab');
  return match ? `/tabs/${match.params.tab}` : '/tabs/home';
}
