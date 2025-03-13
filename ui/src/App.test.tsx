// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { act, render, screen } from '@testing-library/react';
import App from './App';
import axios from 'axios'
jest.mock('axios');

test('Check Login Form', async () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  mockedAxios.get.mockImplementation((url) => {
    if (url.includes("login/providers")) {
      return Promise.resolve({ data: [] });
    }
    else {
      return Promise.resolve({ data: {} })
    }
  })
  await act(async () => {
    render(<App />);
  });
  //screen.getAllByText(/Login/i);
});
