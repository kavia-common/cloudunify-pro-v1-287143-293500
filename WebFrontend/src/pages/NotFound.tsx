import React from 'react';
import { Link } from 'react-router-dom';

// PUBLIC_INTERFACE
export default function NotFound(): JSX.Element {
  /** 404 not found page. */
  return (
    <section>
      <h1 className="title">Page not found</h1>
      <p className="description">
        The page you are looking for does not exist. Go back to the{' '}
        <Link to="/">home page</Link>.
      </p>
    </section>
  );
}
