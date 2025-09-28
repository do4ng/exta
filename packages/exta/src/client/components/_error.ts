import React from 'react';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  minHeight: '100px',
  textAlign: 'center',
};

export interface ErrorProps {
  status?: number;
  message?: string;
}

const defaultProps: ErrorProps = {
  status: 404,
  message: 'Page not found',
};

export const DefaultError = ({ status, message }: ErrorProps = defaultProps) => {
  return React.createElement('div', { style: containerStyle }, [
    React.createElement('h1', { key: 'status' }, String(status)),
    React.createElement('p', { key: 'message' }, message),
  ]);
};
