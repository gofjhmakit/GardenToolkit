import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PlantDetail } from '../plants/PlantDetail';
import { usePlants } from '../../app/plantStore';
import { loadCoreCatalog } from '../../test/fixtures';

const catalog = loadCoreCatalog();

beforeAll(() => {
  usePlants.setState({ catalog, version: 1, status: 'ready', favourites: new Set(), recents: [] });
});

function usesSection() {
  return screen.getByRole('heading', { name: 'Uses' }).closest('section')!;
}

describe('plant detail: uses', () => {
  it('shows parts used, food, traditional use with a disclaimer, and the caution first', () => {
    render(<PlantDetail plant={catalog.get('hypericum-perforatum')!} />);
    const section = within(usesSection());
    const caution = section.getByRole('note');
    expect(caution).toHaveTextContent(/Caution:.*medicines/);
    expect(section.getByText('Parts used')).toBeInTheDocument();
    expect(section.getByText('flower, leaf')).toBeInTheDocument();
    expect(section.getByText('Traditional medicinal use')).toBeInTheDocument();
    expect(section.getByText(/not medical advice/)).toBeInTheDocument();
    // The caution is shown before the details.
    expect(caution.compareDocumentPosition(section.getByText('Parts used')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('credits the herb database in the data sources', () => {
    render(<PlantDetail plant={catalog.get('urtica-dioica')!} />);
    expect(screen.getByText('Yrttitarha – herb database (yrttitarha.fi)')).toBeInTheDocument();
  });

  it('has no uses section for plants without usage data', () => {
    render(<PlantDetail plant={catalog.get('tulipa')!} />);
    expect(screen.queryByRole('heading', { name: 'Uses' })).not.toBeInTheDocument();
  });
});
