'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main id="main" className="page page-error">
      <h1>Something went wrong on our side</h1>
      <p className="page-lede">The page couldn’t be loaded.</p>
      <p><button type="button" className="button" onClick={() => reset()}>Try again</button></p>
    </main>
  );
}
