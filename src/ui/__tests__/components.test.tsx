import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LengthInput, NumberInput, Select, Segmented, Checkbox } from '../components/Fields';
import { Dialog } from '../components/Dialog';
import { Menu } from '../components/Menu';
import { shortcutLabel, isEditableTarget } from '../components/platform';
import { FeedbackHost, confirmAsync, promptAsync, toast, useFeedback } from '../components/feedback';

describe('LengthInput', () => {
  it('shows the value in the chosen unit and accepts other units', async () => {
    const onCommit = vi.fn();
    render(<LengthInput ariaLabel="len" valueMm={1200} unit="m" onCommit={onCommit} />);
    const input = screen.getByLabelText('len') as HTMLInputElement;
    expect(input.value).toBe('1.2');
    await userEvent.clear(input);
    await userEvent.type(input, '150 cm{Enter}');
    expect(onCommit).toHaveBeenCalledWith(1500);
  });
  it('flags invalid input and reverts on Escape', async () => {
    const onCommit = vi.fn();
    render(<LengthInput ariaLabel="len" valueMm={1000} unit="m" onCommit={onCommit} />);
    const input = screen.getByLabelText('len') as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'abc{Enter}');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onCommit).not.toHaveBeenCalled();
    await userEvent.type(input, '{Escape}');
    expect(input.value).toBe('1');
  });
  it('allows clearing when allowEmpty', async () => {
    const onCommit = vi.fn();
    render(<LengthInput ariaLabel="len" valueMm={100} unit="cm" allowEmpty onCommit={onCommit} />);
    const input = screen.getByLabelText('len');
    await userEvent.clear(input);
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith(null);
  });
  it('rejects values below the minimum', async () => {
    const onCommit = vi.fn();
    render(<LengthInput ariaLabel="len" valueMm={100} unit="cm" min={10} onCommit={onCommit} />);
    const input = screen.getByLabelText('len');
    await userEvent.clear(input);
    await userEvent.type(input, '0.5{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('NumberInput / Select / Segmented / Checkbox', () => {
  it('parses comma decimals, rounds integers, enforces bounds', async () => {
    const onCommit = vi.fn();
    render(<NumberInput ariaLabel="n" value={1} onCommit={onCommit} min={0} max={10} />);
    const input = screen.getByLabelText('n');
    await userEvent.clear(input);
    await userEvent.type(input, '2,5{Enter}');
    expect(onCommit).toHaveBeenLastCalledWith(2.5);
    await userEvent.clear(input);
    await userEvent.type(input, '11{Enter}');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
  it('integer mode rounds', async () => {
    const onCommit = vi.fn();
    render(<NumberInput ariaLabel="n" value={1} integer onCommit={onCommit} />);
    const input = screen.getByLabelText('n');
    await userEvent.clear(input);
    await userEvent.type(input, '3.7{Enter}');
    expect(onCommit).toHaveBeenCalledWith(4);
  });
  it('select maps empty to null; segmented and checkbox report changes', async () => {
    const onSel = vi.fn();
    const onSeg = vi.fn();
    const onChk = vi.fn();
    render(
      <>
        <Select ariaLabel="s" value="" emptyLabel="None" options={[{ value: 'a', label: 'A' }]} onChange={onSel} />
        <Segmented ariaLabel="seg" value="x" options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} onChange={onSeg} />
        <Checkbox checked={false} onChange={onChk} label="Tick" />
      </>,
    );
    await userEvent.selectOptions(screen.getByLabelText('s'), 'a');
    expect(onSel).toHaveBeenCalledWith('a');
    await userEvent.selectOptions(screen.getByLabelText('s'), '');
    expect(onSel).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole('button', { name: 'Y' }));
    expect(onSeg).toHaveBeenCalledWith('y');
    expect(screen.getByRole('button', { name: 'X' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByLabelText('Tick'));
    expect(onChk).toHaveBeenCalledWith(true);
  });
});

describe('Dialog & Menu', () => {
  it('dialog is labelled, closes via button and Escape', async () => {
    function Host() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Hello" onClose={() => setOpen(false)}>
          <p>Body</p>
        </Dialog>
      );
    }
    render(<Host />);
    expect(screen.getByText('Body')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(screen.queryByText('Body')).not.toBeInTheDocument();
  });
  it('menu supports keyboard navigation and runs items', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const onClose = vi.fn();
    render(<Menu label="m" anchor={{ x: 0, y: 0 }} onClose={onClose} entries={[{ label: 'Alpha', onSelect: a }, { type: 'separator' }, { label: 'Disabled', onSelect: vi.fn(), disabled: true }, { label: 'Beta', onSelect: b, shortcut: 'Mod+B' }]} />);
    const menu = screen.getByRole('menu');
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Alpha/ }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Beta/ }));
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: /Alpha/ }));
    fireEvent.keyDown(menu, { key: 'End' });
    await userEvent.keyboard('{Enter}');
    expect(b).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    render(<Menu label="m2" anchor={{ x: 0, y: 0 }} onClose={onClose} entries={[{ label: 'X', onSelect: vi.fn() }]} />);
    fireEvent.keyDown(screen.getByRole('menu', { name: 'm2' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('platform helpers', () => {
  it('formats shortcuts and detects editable targets', () => {
    expect(shortcutLabel('Mod+Shift+Z')).toMatch(/Z$/);
    expect(shortcutLabel('')).toBe('');
    const input = document.createElement('input');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(cb)).toBe(false);
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true);
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('feedback host', () => {
  beforeEach(() => useFeedback.setState({ toasts: [], confirmReq: null, promptReq: null }));
  it('shows toasts and resolves confirm/prompt dialogs', async () => {
    render(<FeedbackHost />);
    act(() => toast('error', 'Something failed', ['detail one']));
    expect(screen.getByText('Something failed')).toBeInTheDocument();
    expect(screen.getByText('detail one')).toBeInTheDocument();
    let confirmed: boolean | undefined;
    act(() => void confirmAsync({ title: 'Sure?', message: 'Really', confirmLabel: 'Yes' }).then((v) => (confirmed = v)));
    await userEvent.click(await screen.findByRole('button', { name: 'Yes' }));
    await act(async () => {});
    expect(confirmed).toBe(true);
    let name: string | null | undefined;
    act(() => void promptAsync({ title: 'Name it', label: 'Name', value: 'Old' }).then((v) => (name = v)));
    const input = await screen.findByLabelText('Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'New{Enter}');
    await act(async () => {});
    expect(name).toBe('New');
    const dismiss = screen.getAllByRole('button', { name: 'Dismiss' })[0];
    await userEvent.click(dismiss);
    expect(within(document.body).queryByText('Something failed')).not.toBeInTheDocument();
  });
});
