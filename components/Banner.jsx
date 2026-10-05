/** A page-level or site-wide notice. `html` is already sanitized (lib/markdown.js). */
export default function Banner({ banner, className = '' }) {
  if (!banner) return null;
  const classes = `callout callout-${banner.type} ${className}`.trim();

  if (banner.title) {
    return (
      <div className={classes} role="note">
        <p className="callout-title" dangerouslySetInnerHTML={{ __html: banner.title }} />
        <p dangerouslySetInnerHTML={{ __html: banner.html }} />
      </div>
    );
  }
  // Without a title, the icon sits beside the text; the span keeps the text in one flowing line.
  return (
    <div className={classes} role="note">
      <p className="callout-inline">
        <span dangerouslySetInnerHTML={{ __html: banner.html }} />
      </p>
    </div>
  );
}
