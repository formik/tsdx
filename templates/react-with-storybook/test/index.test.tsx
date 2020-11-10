import React from 'react';
import { render } from '@testing-library/react';
import { Default as Thing } from '../stories/Thing.stories';

describe('Thing', () => {
  it('renders the correct text', () => {
    const { getByText } = render(<Thing />);

    expect(
      getByText('the snozzberries taste like snozzberries')
    ).toBeInTheDocument();
  });
});
