import { Link } from 'react-router-dom';

import { EmptyState } from '../components/states';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  return (
    <div className="min-h-fit-screen container flex max-w-xl items-center py-6">
      <EmptyState
        className="w-full"
        title="This page drifted off the map"
        description="The page you are looking for does not exist."
        action={
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
        }
      />
    </div>
  );
}
