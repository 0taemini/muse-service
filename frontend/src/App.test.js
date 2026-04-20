import { render, screen } from '@testing-library/react';
import App from './App';

test('renders muse backend api console title', () => {
  render(<App />);
  const title = screen.getByText(/muse backend api console/i);
  expect(title).toBeInTheDocument();
});
