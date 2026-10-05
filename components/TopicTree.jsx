import Link from 'next/link';

/**
 * Sidebar tree of one top-level topic. Folders on the path to the current page start open;
 * the rest can be expanded with native <details>, so it works without JavaScript.
 */
function Branch({ category, current }) {
  return (
    <ul>
      {category.articles.map((a) => (
        <li key={a.key}>
          <Link href={a.url} aria-current={a.key === current ? 'page' : undefined}>{a.title}</Link>
        </li>
      ))}
      {category.children.map((child) => {
        const isCurrent = child.path === current;
        const isOpen = isCurrent || current.startsWith(`${child.path}/`);
        return (
          <li key={child.path} className="tree-folder">
            <details open={isOpen}>
              <summary>
                <Link href={child.url} aria-current={isCurrent ? 'page' : undefined}>{child.title}</Link>
              </summary>
              <Branch category={child} current={current} />
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export default function TopicTree({ root, current }) {
  return (
    <nav className="doc-nav" aria-label={`${root.title} articles`}>
      <p className="doc-nav-title">
        <Link href={root.url} aria-current={root.path === current ? 'page' : undefined}>{root.title}</Link>
      </p>
      <Branch category={root} current={current} />
    </nav>
  );
}
