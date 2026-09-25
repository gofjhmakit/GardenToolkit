import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';
import { FeedbackHost, promptAsync } from '../components/feedback';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('bed has no shape');
  return <p>Garden view</p>;
}

describe('ErrorBoundary', () => {
  it('shows a way out instead of a blank page when a view crashes', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onHome = vi.fn();
    render(
      <ErrorBoundary resetKey="p1" onHome={onHome}>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('bed has no shape')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to projects' }));
    expect(onHome).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('recovers when the user navigates elsewhere (reset key changes)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary resetKey="p1">
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <ErrorBoundary resetKey="home">
        <Boom explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Garden view')).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('prompt dialog length limit', () => {
  it('never returns more characters than the field can store', async () => {
    render(<FeedbackHost />);
    let result: string | null = null;
    // A pre-filled value that is already too long, e.g. "<200-char name> (copy)".
    act(() => void promptAsync({ title: 'Rename layer', label: 'Layer name', value: 'L'.repeat(150), maxLength: 100 }).then((v) => (result = v)));
    const input = (await screen.findByLabelText('Layer name')) as HTMLInputElement;
    expect(input.maxLength).toBe(100);
    await userEvent.type(input, '{Enter}');
    await act(async () => {});
    expect(result).toBe('L'.repeat(100));
  });
});
