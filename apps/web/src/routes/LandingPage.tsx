import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Compass, MapPinned, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { HeroScene } from '../components/route/HeroScene';
import { Button } from '../components/ui/button';
import { useSession } from '../hooks/useAuth';

const HEADLINE = ['Plan', 'a', 'day', 'that', 'drifts'];
const HIGHLIGHT = ['the', 'right', 'way.'];

const STEPS = [
  {
    Icon: Compass,
    title: 'Tell us your mood',
    body: 'A city, a few interests, and how much time you have.',
  },
  {
    Icon: MapPinned,
    title: 'We search real places',
    body: 'Matched against thousands of real spots, not a generic top ten.',
  },
  {
    Icon: Sparkles,
    title: 'Watch it come together',
    body: 'Your guide writes the day live, then maps every step.',
  },
];

export function LandingPage() {
  const { data: user } = useSession();
  const reduce = useReducedMotion();

  const word = (text: string, i: number, extra = '') => (
    <motion.span
      key={text + i}
      className={`inline-block pr-[0.25em] ${extra}`}
      initial={reduce ? false : { opacity: 0, y: '0.6em', filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 140, damping: 18 }}
    >
      {text}
    </motion.span>
  );

  return (
    <section className="min-h-fit-screen relative isolate flex flex-col justify-center overflow-hidden py-8">
      {/* Accent: slow drifting color, static for users who prefer reduced motion. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-drift bg-primary/20 absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl" />
        <div className="animate-drift dark:bg-sand/40 absolute -right-16 top-10 h-80 w-80 rounded-full bg-[hsl(36_70%_86%)] blur-3xl [animation-delay:-6s]" />
        <div className="animate-drift dark:bg-sea/10 absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[hsl(190_42%_24%/0.1)] blur-3xl [animation-delay:-11s]" />
      </div>

      <div className="container grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        <div className="space-y-5">
          <motion.p
            className="text-secondary text-sm font-medium uppercase tracking-widest"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
          >
            AI city guide
          </motion.p>

          <h1 className="text-[clamp(2.25rem,4.6vh+1.4rem,4.25rem)] font-semibold leading-[1.05]">
            {HEADLINE.map((w, i) => word(w, i))}
            <span className="relative inline-block">
              {HIGHLIGHT.map((w, i) => word(w, HEADLINE.length + i, 'text-primary'))}
              <svg
                viewBox="0 0 300 14"
                aria-hidden="true"
                className="text-primary/70 absolute -bottom-1 left-0 h-3 w-full"
                preserveAspectRatio="none"
                fill="none"
              >
                <motion.path
                  d="M2 9 C 60 1, 110 13, 170 6 S 260 4, 298 8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.1, duration: 0.9, ease: 'easeInOut' }}
                />
              </svg>
            </span>
          </h1>

          <motion.p
            className="text-muted-foreground max-w-lg text-lg"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Daydrift turns your mood into a walkable, rideable or drivable itinerary built from real
            places, with the route mapped out for you.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <Button asChild size="lg" className="group">
              <Link to={user ? '/plan' : '/auth'}>
                {user ? 'Plan a trip' : 'Get started'}
                <ArrowRight
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </Button>
            {user && (
              <Button asChild size="lg" variant="outline">
                <Link to="/trips">My trips</Link>
              </Button>
            )}
          </motion.div>
        </div>

        <HeroScene className="mx-auto w-full max-w-xl" />
      </div>

      <div className="container mt-8 lg:mt-10">
        <h2 className="sr-only">How it works</h2>
        <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
          {STEPS.map(({ Icon, title, body }, i) => (
            <motion.li
              key={title}
              className="bg-card/70 hover:shadow-soft group flex gap-3 rounded-xl border p-4 backdrop-blur transition-all duration-200 hover:-translate-y-1"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ delay: i * 0.12, type: 'spring', stiffness: 160, damping: 20 }}
            >
              <span className="waypoint transition-transform duration-300 group-hover:rotate-[360deg]">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">{body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
