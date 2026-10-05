import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { RouteTrace } from '../components/route/RouteTrace';
import { Button } from '../components/ui/button';
import { useSession } from '../hooks/useAuth';

const STEPS = [
  { title: 'Tell us your mood', body: 'Pick a city, a few interests and how much time you have.' },
  {
    title: 'We search real places',
    body: 'Your interests are matched against thousands of real spots, not a generic top-ten list.',
  },
  {
    title: 'Watch it come together',
    body: 'Your guide writes the day live, then maps the route stop by stop.',
  },
];

export function LandingPage() {
  const { data: user } = useSession();

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Accent: a slow sunrise gradient. Static for users who prefer reduced motion. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-drift bg-primary/20 absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl" />
          <div className="animate-drift bg-sand absolute -right-16 top-10 h-80 w-80 rounded-full blur-3xl [animation-delay:-6s]" />
          <div className="animate-drift bg-sea/15 absolute bottom-0 left-1/3 h-72 w-72 rounded-full blur-3xl [animation-delay:-11s]" />
        </div>

        <div className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <p className="text-primary text-sm font-medium uppercase tracking-widest">
              AI city guide
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Plan a day that drifts the right way.
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              Daydrift turns your mood into a walkable, rideable or drivable itinerary built from
              real places, with the route mapped out for you.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? '/plan' : '/auth'}>
                  {user ? 'Plan a trip' : 'Get started'} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              {user && (
                <Button asChild size="lg" variant="outline">
                  <Link to="/trips">My trips</Link>
                </Button>
              )}
            </div>
          </div>
          <RouteTrace className="mx-auto max-w-xl" />
        </div>
      </section>

      <section className="container pb-20" aria-labelledby="how">
        <h2 id="how" className="mb-8 text-3xl font-semibold">
          How it works
        </h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative space-y-2 border-t pt-5">
              <span className="waypoint">{i + 1}</span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
