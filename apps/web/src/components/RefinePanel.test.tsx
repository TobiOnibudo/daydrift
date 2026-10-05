import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RefinePanel } from './RefinePanel';

const setup = (props: Partial<React.ComponentProps<typeof RefinePanel>> = {}) => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<RefinePanel pending={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit, user };
};

const open = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /ask your guide/i }));

describe('RefinePanel', () => {
  it('starts collapsed and opens on demand', async () => {
    const { user } = setup();
    const toggle = screen.getByRole('button', { name: /ask your guide/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    await open(user);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('textbox', { name: /what would you like to change/i }),
    ).toBeInTheDocument();
  });

  it("fills the note from a suggestion, and sends what's in the box trimmed", async () => {
    const { onSubmit, user } = setup();
    await open(user);

    await user.click(screen.getByRole('button', { name: "It's raining" }));
    const box = screen.getByRole('textbox');
    expect(box).toHaveValue("It's raining");
    expect(box).toHaveFocus();

    await user.type(box, '  so keep us indoors  ');
    await user.click(screen.getByRole('button', { name: /update my day/i }));
    expect(onSubmit).toHaveBeenCalledWith("It's raining  so keep us indoors");
  });

  it('asks for a few words instead of sending an empty note', async () => {
    const { onSubmit, user } = setup();
    await open(user);

    await user.click(screen.getByRole('button', { name: /update my day/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/tell your guide/i);
    expect(box).toHaveFocus();

    // The message goes away as soon as they start writing.
    await user.type(box, 'Running late');
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('limits the note length and counts down near the limit', async () => {
    const { user } = setup();
    await open(user);

    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('maxlength', '300');
    expect(screen.queryByText(/\/300/)).not.toBeInTheDocument();
    await user.click(box);
    await user.paste('x'.repeat(250));
    expect(screen.getByText('250/300')).toBeInTheDocument();
  });

  it('waits while the guide is working', async () => {
    const { user } = setup({ pending: true });
    await open(user);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /asking your guide/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Shorter day' })).toBeDisabled();
  });
});
