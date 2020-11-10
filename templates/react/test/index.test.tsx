import * as React from 'react';
import { render } from '@testing-library/react';
import { Thing } from '../src';

describe('Thing', () => {
  it('renders the correct text', () => {
    const { getByText } = render(<Thing />);

    expect(
      getByText('the snozzberries taste like snozzberries')
    ).toBeInTheDocument();
  });
});
