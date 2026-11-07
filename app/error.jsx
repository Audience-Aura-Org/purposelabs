'use client';

export default function Error({ reset }) {
  return (
    <section className="flow">
      <div className="wrap wrap--narrow empty empty--page">
        <p className="eyebrow mono">500</p>
        <h1 className="display">Something went wrong</h1>
        <p className="lead">Please try again in a moment.</p>
        <p><button className="btn btn--signal" type="button" onClick={() => reset()}>Try again</button></p>
      </div>
    </section>
  );
}
