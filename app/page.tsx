import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ShieldCheckIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@heroui/react";
import Link from "next/link";
import { SearchTrigger } from "@/components/SearchDialog";
import TopicIcon from "@/components/TopicIcon";
import { getArticleSlugs, getRecentArticles } from "@/lib/data/articles";
import { getAllTopics, getTopics } from "@/lib/data/topics";
import { IT_SUPPORT_URL } from "@/lib/site-links";

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

const linkFocus = "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus";
const sectionHeading = "text-2xl leading-[1.18] font-[720] tracking-[-0.045em] text-kb-heading max-[33.125rem]:text-[1.375rem]";
const quickTaskLink = `group flex min-h-13.25 items-center gap-2.5 py-3.25 text-sm font-[620] text-kb-heading max-[33.125rem]:min-h-11 max-[33.125rem]:gap-1.5 max-[33.125rem]:py-2 max-[33.125rem]:text-[0.8125rem] ${linkFocus}`;
const heroSheet = [
  "absolute grid h-[11.125rem] w-38 content-start gap-3 rounded-2xl border border-[#a9c7f8a6] px-5.25 py-6.25",
  "[background-image:linear-gradient(140deg,#3f5b844f,#5382c273)] shadow-[0_1.125rem_2.875rem_#0a152b4d]",
].join(" ");

function HeroArtwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 end-0 grid w-[25.3125rem] place-items-center bg-[radial-gradient(circle_at_58%_35%,#46628c7a_0,#27426722_51%,transparent_73%)] before:absolute before:inset-0 before:bg-[radial-gradient(circle,#ccdefc36_1px,transparent_1.5px)] before:bg-size-[17px_17px] before:[mask-image:linear-gradient(90deg,transparent,#000_37%)] before:content-[''] max-[66.875rem]:-end-13 max-[66.875rem]:scale-90 max-[49.375rem]:hidden"
    >
      <div className="absolute aspect-square w-58.5 rounded-full border border-[#b9d1fa4a] after:absolute after:inset-6 after:rounded-[inherit] after:border after:border-[#b9d1fa36] after:content-['']" />
      <div className={`${heroSheet} translate-x-5.25 translate-y-1 rotate-11 opacity-76`} />
      <div className={`${heroSheet} -translate-x-3 -rotate-9`}>
        <span className="h-1.75 w-11.5 rounded-lg bg-unh-secondary" />
        <span className="h-1.5 w-23 rounded-lg bg-[#c2d8fa8f]" />
        <span className="h-1.5 w-23 rounded-lg bg-[#c2d8fa8f]" />
        <span className="h-1.5 w-16.5 rounded-lg bg-[#c2d8fa8f]" />
        <span className="h-1.5 w-16.5 rounded-lg bg-[#c2d8fa8f]" />
      </div>
      <div className="absolute grid aspect-square w-14.75 translate-x-18.5 translate-y-10.5 place-items-center rounded-[1.0625rem] bg-unh-secondary text-unh-primary shadow-[0_0.4375rem_1.6875rem_#10213c6b]">
        <MagnifyingGlassIcon className="size-8" />
      </div>
    </div>
  );
}

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
    <main className="flex-1">
      <div className="kb-shell pt-8.5 pb-12 max-[33.125rem]:pt-5 max-[33.125rem]:pb-8">
        <section
          className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(115deg,var(--kb-hero-start)_15%,var(--kb-hero-end))] px-13.5 py-13 text-white max-[49.375rem]:px-7 max-[49.375rem]:py-9.5 max-[33.125rem]:rounded-[1.125rem] max-[33.125rem]:px-4.75 max-[33.125rem]:py-6.75"
          aria-labelledby="home-heading"
        >
          <div className="relative z-1 max-w-[38.75rem]">
            <h1
              id="home-heading"
              className="text-[clamp(2.25rem,4.35vw,3.875rem)] leading-[1.06] font-[750] tracking-[-0.05em] max-[33.125rem]:max-w-[19.0625rem] max-[33.125rem]:text-[clamp(2rem,10vw,2.5rem)]"
            >
              Find your IT answers.
            </h1>
            <p className="mt-3.75 max-w-[35rem] text-[clamp(0.9375rem,1.45vw,1.125rem)] leading-[1.55] text-[#e1e9f7] max-[33.125rem]:mt-2.5">
              Guides for your University account, campus Wi-Fi, printing, and classroom technology.
            </p>
            <SearchTrigger
              aria-label="Search the knowledge base"
              className="group/search mt-6.5 flex h-auto min-h-15.25 w-full max-w-[33.4375rem] items-center gap-3 rounded-[0.8125rem] border border-white bg-white p-1.75 ps-4 text-start text-[#14243e] scheme-light focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-unh-secondary data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-4 data-[focus-visible]:outline-unh-secondary data-[hovered]:bg-white data-[pressed]:bg-white max-[33.125rem]:mt-4.5 max-[33.125rem]:min-h-13 max-[33.125rem]:gap-1.75 max-[33.125rem]:p-1.25 max-[33.125rem]:ps-2.5"
            >
              <MagnifyingGlassIcon aria-hidden="true" className="size-5 flex-none text-[#496184]" />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-normal text-[#566783] max-[33.125rem]:text-[0.8125rem]">
                Search by task, service, or error
              </span>
              <span
                className="grid min-h-10.5 flex-none place-items-center rounded-[0.625rem] bg-unh-secondary px-4.25 font-bold text-[#14243e] group-hover/search:bg-[#ffda68] group-data-[hovered]/search:bg-[#ffda68] max-[33.125rem]:min-h-10 max-[33.125rem]:px-2.5 max-[33.125rem]:text-[0.8125rem]"
                aria-hidden="true"
              >
                Search
              </span>
            </SearchTrigger>
          </div>
          <HeroArtwork />
        </section>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)_18.75rem] items-start gap-8.75 [reading-flow:grid-rows] max-[66.875rem]:grid-cols-[minmax(0,1fr)_15.25rem] max-[66.875rem]:gap-4.5 max-[49.375rem]:mt-6 max-[49.375rem]:grid-cols-1">
          <section aria-labelledby="topics-heading">
            <div className="mb-4.25 flex items-baseline justify-between gap-2.5">
              <h2 id="topics-heading" className={sectionHeading}>Browse by topic</h2>
              <Link
                href="/articles"
                className={`inline-flex items-center gap-1.5 text-sm font-[650] whitespace-nowrap text-link underline-offset-4 hover:underline ${linkFocus}`}
              >
                All guides <ArrowRightIcon aria-hidden="true" className="size-4 flex-none" />
              </Link>
            </div>
            {topics.length ? (
              <ul className="grid grid-cols-2 gap-3.25 max-[33.125rem]:gap-2.25">
                {topics.map((topic) => (
                  <li
                    key={topic.slug}
                    className="nth-[3n+2]:[--topic-icon-bg:light-dark(#fff4d6,#4c3e20)] nth-[3n+2]:[--topic-icon-color:light-dark(#725316,#ffe290)] nth-[3n]:[--topic-icon-bg:light-dark(#e7f5f2,#1d413e)] nth-[3n]:[--topic-icon-color:light-dark(#285b51,#b1e6d7)]"
                  >
                    <Link href={`/topics/${topic.slug}`} className={`group/topic block h-full rounded-2xl ${linkFocus}`}>
                      <Card className="grid h-full min-h-29.5 content-start gap-2.5 rounded-[inherit] border border-kb-line bg-background px-4.75 py-4.25 shadow-none wrap-anywhere group-hover/topic:border-[color:color-mix(in_srgb,var(--kb-line),var(--link)_35%)] group-hover/topic:bg-kb-hover max-[33.125rem]:min-h-33 max-[33.125rem]:p-3">
                        <div className="flex items-center justify-between">
                          <span className="grid size-8.75 place-items-center rounded-[0.625rem] [background-color:var(--topic-icon-bg,light-dark(#eaf1fd,#263d5f))] [color:var(--topic-icon-color,light-dark(#294d81,#a9c7f8))]">
                            <TopicIcon icon={topic.icon} className="size-5" />
                          </span>
                          <ArrowRightIcon className="size-4 flex-none text-kb-muted" aria-hidden="true" />
                        </div>
                        <div>
                          <Card.Title className="text-[1.0625rem] leading-[1.18] font-bold tracking-[-0.04em] text-kb-heading max-[33.125rem]:text-[0.9375rem]">
                            {topic.title}
                          </Card.Title>
                          {topic.description && (
                            <Card.Description className="mt-1 text-sm leading-[1.48] text-kb-muted max-[33.125rem]:text-[0.8125rem]">
                              {topic.description}
                            </Card.Description>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm leading-[1.48] text-kb-muted">No topics are available yet.</p>
            )}
          </section>

          <aside
            className="rounded-2xl border border-kb-line bg-kb-panel p-5.5 max-[49.375rem]:row-start-1 max-[33.125rem]:p-3.75"
            aria-labelledby="quick-tasks-heading"
          >
            <h2 id="quick-tasks-heading" className="mb-1.5 text-[1.3125rem] leading-[1.18] font-[720] tracking-[-0.045em] text-kb-heading">
              Common tasks
            </h2>
            <ul className="max-[49.375rem]:grid max-[49.375rem]:grid-cols-2 max-[49.375rem]:gap-x-3.25">
              {commonTasks.map(({ title, icon: Icon, guideSlugs, fallback }) => {
                const slug = guideSlugs.find((candidate) => published.has(candidate));
                const label = (
                  <>
                    <Icon aria-hidden="true" className="size-5 flex-none text-link max-[33.125rem]:size-4" />
                    <span className="underline-offset-4 group-hover:underline">{title}</span>
                    <ChevronRightIcon aria-hidden="true" className="ms-auto size-3.75 flex-none text-kb-muted" />
                  </>
                );
                return (
                  <li key={title} className="border-kb-line min-[49.375rem]:not-first:border-t max-[49.375rem]:nth-[n+3]:border-t">
                    {slug
                      ? <Link href={`/articles/${slug}`} className={quickTaskLink}>{label}</Link>
                      : <a href={fallback} className={quickTaskLink}>{label}</a>}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>

        <section
          className="mt-7.25 flex items-center justify-between gap-4 rounded-[0.875rem] border [border-color:color-mix(in_srgb,var(--kb-line),var(--color-unh-secondary)_18%)] [background-color:color-mix(in_srgb,var(--background),var(--color-unh-secondary)_8%)] px-5.5 py-4.5 max-[33.125rem]:items-start max-[33.125rem]:p-3.5"
          aria-labelledby="help-heading"
        >
          <div>
            <h2 id="help-heading" className="text-lg leading-[1.18] font-[720] tracking-[-0.045em] text-kb-heading">
              Still need help?
            </h2>
            <p className="mt-1 text-sm leading-[1.45] text-kb-muted">Find the right support team for your University role.</p>
          </div>
          <a
            className={`inline-flex min-h-10.5 flex-none items-center gap-1.5 rounded-[0.625rem] border border-kb-line bg-background px-3 text-[0.8125rem] font-[650] whitespace-nowrap text-kb-heading hover:border-link hover:bg-kb-hover ${linkFocus}`}
            href={IT_SUPPORT_URL}
          >
            Contact IT <ArrowUpRightIcon aria-hidden="true" className="size-4 flex-none" />
          </a>
        </section>

        {recent.length > 0 && (
          <section className="mt-8" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className={`mb-4.25 ${sectionHeading}`}>Recently updated</h2>
            <ul className="divide-y divide-kb-line overflow-hidden rounded-2xl border border-kb-line">
              {recent.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="group flex justify-between gap-x-4 gap-y-2.5 px-4.75 py-3.25 text-kb-heading hover:bg-kb-hover focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus max-[33.125rem]:flex-col max-[33.125rem]:gap-1"
                  >
                    <span className="text-[0.9375rem] font-[650] underline-offset-4 group-hover:underline">{article.title}</span>
                    <span className="text-[0.8125rem] text-kb-muted">
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
