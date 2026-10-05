import Link from 'next/link';

export default function Footer({ categories, text }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav aria-label="Categories">
          <ul>
            {categories.map((c) => (
              <li key={c.slug}><Link href={c.url}>{c.title}</Link></li>
            ))}
          </ul>
        </nav>
        <p>{text}</p>
      </div>
    </footer>
  );
}
