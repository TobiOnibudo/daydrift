import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSession, useSignOut } from '../hooks/useAuth';
import { cn } from '../lib/utils';

import { Logo } from './Logo';
import { Button } from './ui/button';

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
  );

export function AppShell() {
  const { data: user } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSignOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast.success('Signed out');
        navigate('/');
      },
      onError: () => toast.error('Could not sign out. Please try again.'),
    });

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="bg-background/80 border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1">
            {user && (
              <>
                <NavLink to="/plan" className={navClass}>
                  Plan a trip
                </NavLink>
                <NavLink to="/trips" className={navClass}>
                  My trips
                </NavLink>
              </>
            )}
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

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        Places and routes from{' '}
        <a className="underline underline-offset-2" href="https://www.openstreetmap.org/copyright">
          OpenStreetMap
        </a>{' '}
        contributors.
      </footer>
    </div>
  );
}
