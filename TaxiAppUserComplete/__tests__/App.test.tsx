import React from 'react';
import { render, screen } from '@testing-library/react-native';
import App from '../App';

// Mock de módulos nativos necesarios
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {},
  RESULTS: {
    GRANTED: 'granted',
  },
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(),
  logLogin: jest.fn(),
  logSignUp: jest.fn(),
  setUserId: jest.fn(),
  setUserProperty: jest.fn(),
  setAnalyticsCollectionEnabled: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => () => ({
  getToken: jest.fn(() => Promise.resolve('test-token')),
  onMessage: jest.fn(),
  requestPermission: jest.fn(() => Promise.resolve()),
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('shows TaxiApp title', () => {
    render(<App />);
    expect(screen.getByText(/TaxiApp/i)).toBeTruthy();
  });
});