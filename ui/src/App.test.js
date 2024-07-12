import { render, screen } from '@testing-library/react';
import App from './App';

test('Check Login Form', () => {
  render(<App />);
  const linkElement = screen.getAllByText(/Login/i);
  expect(linkElement[0]).toBeInTheDocument();
});
