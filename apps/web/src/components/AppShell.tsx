import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSession, useSignOut } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { cn } from '../lib/utils';

import { Atmosphere } from './Atmosphere';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent sm:px-3',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
  );

export function AppShell() {
  const { data: user } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const online = useOnlineStatus();

  const handleSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast.success('Signed out');
        navigate('/');
      },
      onError: () => toast.error('Could not sign out. Please try again.'),
    });

  return (
    <div className="min-h-app relative flex flex-col">
      {pathname !== '/' && <Atmosphere />}
      {/* The warm paper the landing page always had, behind the whole page in light mode. */}
      {pathname === '/' && (
        <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[hsl(40_35%_95%)] dark:hidden" />
      )}
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {!online && (
        <div
          role="status"
          className="bg-secondary text-secondary-foreground px-4 py-2 text-center text-sm"
        >
          You're offline. Reconnect to keep planning; nothing you do now will be saved.
        </div>
      )}

      <header
        className={cn(
          'border-b backdrop-blur',
          pathname === '/' ? 'dark:bg-background/80 bg-transparent' : 'bg-background/80',
        )}
      >
        <div className="container flex h-14 items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1">
            {user && (
              <>
                <NavLink to="/plan" className={navClass}>
                  Plan<span className="max-[440px]:sr-only"> a trip</span>
                </NavLink>
                <NavLink to="/trips" className={navClass}>
                  My trips
                </NavLink>
              </>
            )}
            <ThemeToggle />
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={signOut.isPending}
              >
                <LogOut aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="text-muted-foreground border-t py-2 text-center text-xs">
        Places and routes from{' '}
        <a className="underline underline-offset-2" href="https://www.openstreetmap.org/copyright">
          OpenStreetMap
        </a>{' '}
        contributors.
      </footer>
    </div>
  );
}
