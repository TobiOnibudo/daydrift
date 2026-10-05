import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { GuideNote } from './GuideNote';

describe('GuideNote', () => {
  it('renders nothing for trips with no narrative', () => {
    const { container } = render(<GuideNote text={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(render(<GuideNote text="   " />).container).toBeEmptyDOMElement();
  });

  it('shows a short note in full as a labelled region', () => {
    render(<GuideNote text="Start with coffee, then wander to the gallery." />);
    expect(screen.getByRole('region', { name: 'From your guide' })).toBeInTheDocument();
    expect(screen.getByText('Start with coffee, then wander to the gallery.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('splits paragraphs on blank lines', () => {
    render(<GuideNote text={'First thought.\n\nSecond thought.'} />);
    expect(screen.getAllByText(/thought\./)).toHaveLength(2);
  });

  it('folds a long note and lets the reader expand it, announcing the state', async () => {
    const user = userEvent.setup();
    render(<GuideNote text={'A long and winding note about the day. '.repeat(20)} />);

    const toggle = screen.getByRole('button', { name: 'Read more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
