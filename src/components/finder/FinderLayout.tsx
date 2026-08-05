/**
 * FinderLayout — clean PUBLIC layout for the visitor-facing Finder marketplace.
 *
 * Light deep-teal + mint brand tokens only. This wraps the public Finder pages
 * (/find, /find/match, /find/:providerId) which are NOT behind RouteProtection,
 * so prospective clients can browse without an account. Build agents fill the
 * page bodies; this just supplies the chrome (wordmark, top nav, footer).
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface FinderLayoutProps {
  children: React.ReactNode;
}

const FinderLayout = ({ children }: FinderLayoutProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/favicon.ico" alt="" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight text-primary">
              Bondable
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="text-foreground">
              <Link to="/find">{t('finder_nav_find', 'Vind hulp')}</Link>
            </Button>
            {/* De wachtlijstradar hoort in de hoofdnavigatie: het is voor veel
                bezoekers de eerste vraag, nog vóór "wie past bij mij". */}
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/wachttijden">
                {t('finder_nav_waittimes', 'Wachttijden')}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground">
              <Link to="/">{t('finder_nav_home', 'Home')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/login">{t('finder_nav_login', 'Inloggen')}</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Page body */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              to="/wachttijden"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('finder_footer_waittimes', 'Wachttijden per stad')}
            </Link>
            <Link
              to="/wachtruimte"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('finder_footer_wachtruimte', 'De Wachtruimte')}
            </Link>
            <Link
              to="/how-ranking-works"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('finder_footer_ranking', 'Hoe we rangschikken')}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            {t(
              'finder_footer_neutral',
              'Onafhankelijke matching op basis van fit — nooit op betaling.',
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FinderLayout;
