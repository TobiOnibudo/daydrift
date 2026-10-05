import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { SampleDay } from '../components/SampleDay';
import { HeroScene } from '../components/route/HeroScene';
import { Button } from '../components/ui/button';
import { useSession } from '../hooks/useAuth';

const HEADLINE = ['Plan', 'a', 'day', 'that', 'drifts'];
const HIGHLIGHT = ['the', 'right', 'way.'];

// A real sequence, so the numbers mean something.
const STEPS = ['Tell us your mood', 'We search real places', 'Watch it come together'];

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
    <>
      <section className="min-h-fit-screen relative isolate flex flex-col justify-center overflow-x-clip py-8">
        {/* Accent: slow drifting color, static for users who prefer reduced motion. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift bg-primary/20 absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl" />
          <div className="animate-drift absolute -right-16 top-10 h-80 w-80 rounded-full bg-[hsl(36_70%_86%)] blur-3xl [animation-delay:-6s] dark:bg-[hsl(20_90%_60%/0.2)]" />
          <div className="animate-drift dark:bg-sea/10 absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[hsl(190_42%_24%/0.1)] blur-3xl [animation-delay:-11s]" />
        </div>

        <div className="container grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="space-y-6">
            <motion.p
              className="text-secondary text-sm font-medium uppercase tracking-widest"
              initial={reduce ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
            >
              AI city guide
            </motion.p>

            <h1 className="text-balance text-[clamp(2.25rem,4.6vh+1.4rem,4.25rem)] font-semibold leading-[1.05]">
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
              Pick a city and a mood. Daydrift builds a walkable, rideable or drivable day from real
              places, maps the route, and reshapes it when your plans change.
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

            <motion.div
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <h2 className="sr-only">How it works</h2>
              <ol className="text-muted-foreground relative grid grid-cols-3 gap-3 text-sm">
                <li
                  aria-hidden="true"
                  className="route-line absolute left-3.5 top-[13px] w-[62%]"
                />
                {STEPS.map((step, i) => (
                  <li key={step} className="relative flex flex-col items-start gap-1.5">
                    <span className="waypoint relative z-10" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="max-w-[9rem] leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </div>

          <HeroScene className="mx-auto w-full max-w-xl" />
        </div>
      </section>

      <section
        aria-labelledby="sample-heading"
        className="relative isolate overflow-x-clip pb-16 pt-6 sm:pb-24"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift bg-primary/15 absolute -right-24 top-0 h-96 w-96 rounded-full blur-3xl [animation-delay:-4s]" />
          <div className="animate-drift absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-[hsl(36_70%_86%)] blur-3xl [animation-delay:-9s] dark:bg-[hsl(20_90%_60%/0.14)]" />
        </div>
        <div className="container grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="space-y-3">
            <h2
              id="sample-heading"
              className="text-balance text-3xl font-semibold leading-tight sm:text-4xl"
            >
              Plans change. Your day can too.
            </h2>
            <p className="text-muted-foreground max-w-md text-lg">
              Tell your guide what is different and it reshapes the day, keeping what still works.
              Try it on a sample.
            </p>
          </div>
          <SampleDay className="mx-auto w-full max-w-xl lg:mx-0" />
        </div>
      </section>
    </>
  );
}
