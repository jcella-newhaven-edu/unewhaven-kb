import Link from 'next/link';

/** Home / Topic / Subtopic. Set includeLast={false} on a topic's own page, where its title is the heading. */
export default function Breadcrumbs({ trail, includeLast = true }) {
  const items = includeLast ? trail : trail.slice(0, -1);
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((c) => (
        <span key={c.path} className="crumb">
          <span aria-hidden="true">/</span>
          <Link href={c.url}>{c.title}</Link>
        </span>
      ))}
    </nav>
  );
}
