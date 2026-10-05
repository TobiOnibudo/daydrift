import { Link } from 'react-router-dom';

import { EmptyState } from '../components/states';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container max-w-xl py-20">
      <EmptyState
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
