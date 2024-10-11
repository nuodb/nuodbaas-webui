// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { act, render, screen } from '@testing-library/react';
import App from './App';
import axios from 'axios'
jest.mock('axios');

test('Check Login Form', async () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  mockedAxios.get.mockResolvedValue({ data: {} });
  await act(async () => {
    render(<App />);
  });
  const linkElement = screen.getAllByText(/Login/i);
  expect(linkElement[0]).toBeInTheDocument();
});
