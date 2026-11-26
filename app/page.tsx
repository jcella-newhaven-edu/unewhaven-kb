import {
  AcademicCapIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ShieldCheckIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@heroui/react";
import Link from "next/link";
import { SearchTrigger } from "@/components/SearchDialog";
import { getArticleSlugs, getRecentArticles } from "@/lib/data/articles";
import { getAllTopics, getTopics } from "@/lib/data/topics";
import { IT_SUPPORT_URL } from "@/lib/site-links";
import styles from "./home.module.css";

const commonTasks = [
  {
    title: "Reset your password",
    icon: LockClosedIcon,
    guideSlugs: ["reset-or-change-your-university-password", "reset-your-university-password", "reset-your-password"],
    fallback: "https://studentsupport.newhaven.edu/login-trouble/",
  },
  {
    title: "Set up MFA",
    icon: ShieldCheckIcon,
    guideSlugs: ["set-up-microsoft-authenticator", "set-up-mfa"],
    fallback: "https://studentsupport.newhaven.edu/mfa/",
  },
  {
    title: "Connect to campus Wi-Fi",
    icon: WifiIcon,
    guideSlugs: ["connect-a-computer-or-phone-to-chargerwifi", "connect-to-chargerwifi", "connect-to-campus-wi-fi"],
    fallback: "https://studentsupport.newhaven.edu/network-connectivity/chargerwifi/",
  },
  {
    title: "Print on campus",
    icon: PrinterIcon,
    guideSlugs: ["print-on-campus-using-the-student-printing-service", "print-on-campus", "find-a-campus-printer-and-check-printing-costs"],
    fallback: "https://studentsupport.newhaven.edu/printing-on-campus/",
  },
];

const topicIcons = [
  { matches: /account|sign-in|password/, icon: LockClosedIcon },
  { matches: /email|outlook|microsoft|collaboration/, icon: EnvelopeIcon },
  { matches: /wifi|wi-fi|connectivity|network|remote-access/, icon: WifiIcon },
  { matches: /device|software|print/, icon: PrinterIcon },
  { matches: /academic|learning|classroom|canvas/, icon: AcademicCapIcon },
  { matches: /security|privacy|safety/, icon: ShieldCheckIcon },
];

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function Home() {
  const [topics, recent, publishedSlugs, allTopics] = await Promise.all([
    getTopics(),
    getRecentArticles(4),
    getArticleSlugs(),
    getAllTopics(),
  ]);
  const published = new Set(publishedSlugs.map(({ slug }) => slug));
  const topicTitles = new Map(allTopics.map(({ slug, title }) => [slug, title]));

  return (
    <main className={styles.main}>
      <div className={`kb-shell ${styles.home}`}>
        <section className={styles.hero} aria-labelledby="home-heading">
          <div className={styles.heroContent}>
            <h1 id="home-heading">Find your IT answers.</h1>
            <p>Guides for your University account, campus Wi-Fi, printing, and classroom technology.</p>
            <SearchTrigger aria-label="Search the knowledge base" className={styles.heroSearch}>
              <MagnifyingGlassIcon aria-hidden="true" className={styles.searchIcon} />
              <span className={styles.searchPrompt}>Search by task, service, or error</span>
              <span className={styles.searchButton} aria-hidden="true">Search</span>
            </SearchTrigger>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <div className={styles.artOrbit} />
            <div className={`${styles.artSheet} ${styles.artSheetBack}`} />
            <div className={styles.artSheet}>
              <span /><span /><span /><span /><span />
            </div>
            <div className={styles.artLens}><MagnifyingGlassIcon /></div>
          </div>
        </section>

        <div className={styles.homeContent}>
          <section aria-labelledby="topics-heading">
            <div className={styles.sectionHead}>
              <h2 id="topics-heading">Browse by topic</h2>
              <Link href="/articles" className={styles.textLink}>
                All guides <ArrowRightIcon aria-hidden="true" />
              </Link>
            </div>
            {topics.length ? (
              <ul className={styles.topicGrid}>
                {topics.map((topic) => {
                  const Icon = topicIcons.find(({ matches }) => matches.test(topic.slug))?.icon ?? BookOpenIcon;
                  return (
                    <li key={topic.slug}>
                      <Link href={`/topics/${topic.slug}`} className={styles.topicLink}>
                        <Card className={styles.topicCard}>
                          <div className={styles.cardTop}>
                            <span className={styles.topicIcon}><Icon aria-hidden="true" /></span>
                            <ArrowRightIcon className={styles.cardArrow} aria-hidden="true" />
                          </div>
                          <div>
                            <Card.Title className={styles.cardTitle}>{topic.title}</Card.Title>
                            {topic.description && (
                              <Card.Description className={styles.cardDescription}>{topic.description}</Card.Description>
                            )}
                          </div>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>No topics are available yet.</p>
            )}
          </section>

          <aside className={styles.quickTasks} aria-labelledby="quick-tasks-heading">
            <h2 id="quick-tasks-heading">Common tasks</h2>
            <ul>
              {commonTasks.map(({ title, icon: Icon, guideSlugs, fallback }) => {
                const slug = guideSlugs.find((candidate) => published.has(candidate));
                const label = (
                  <>
                    <Icon aria-hidden="true" />
                    <span>{title}</span>
                    <ChevronRightIcon aria-hidden="true" />
                  </>
                );
                return (
                  <li key={title}>
                    {slug ? <Link href={`/articles/${slug}`}>{label}</Link> : <a href={fallback}>{label}</a>}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>

        <section className={styles.supportBand} aria-labelledby="help-heading">
          <div>
            <h2 id="help-heading">Still need help?</h2>
            <p>Find the right support team for your University role.</p>
          </div>
          <a className={styles.supportLink} href={IT_SUPPORT_URL}>
            Contact IT <ArrowUpRightIcon aria-hidden="true" />
          </a>
        </section>

        {recent.length > 0 && (
          <section className={styles.recent} aria-labelledby="recent-heading">
            <div className={styles.sectionHead}>
              <h2 id="recent-heading">Recently updated</h2>
            </div>
            <ul className={styles.recentList}>
              {recent.map((article) => (
                <li key={article.slug}>
                  <Link href={`/articles/${article.slug}`}>
                    <span className={styles.recentTitle}>{article.title}</span>
                    <span className={styles.recentDetails}>
                      {topicTitles.get(article.topicSlug) ?? article.topicSlug}
                      <span aria-hidden="true"> · </span>
                      <time dateTime={article.updated.toISOString()}>{dateFormat.format(article.updated)}</time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
