// import { connection } from "next/server";
// import { getDb } from "./mongodb";

// // Collections
// //   topics    { slug, title, description, order }
// //   articles  { slug, title, summary, topicSlug, updated (Date), published, body: [blocks] }
// //
// // Article body blocks:
// //   { type: "p", text }  { type: "h2", text }  { type: "h3", text }
// //   { type: "ul", items: [...] }  { type: "ol", items: [...] }  { type: "code", text }
// //
// // Every function calls connection() so pages read the database on each request
// // (new articles appear without rebuilding), and the build doesn't need the database.

// const hidden = { projection: { _id: 0 } };

// async function topicTitles(db) {
//   const topics = await db.collection("topics").find({}, { projection: { _id: 0, slug: 1, title: 1 } }).toArray();
//   return new Map(topics.map((t) => [t.slug, t.title]));
// }

// const withTopic = (article, titles) => ({
//   ...article,
//   topic: { slug: article.topicSlug, title: titles.get(article.topicSlug) ?? article.topicSlug },
// });

// /** One published article, with its topic, or null. */
// export async function getArticle(slug) {
//   await connection();
//   const db = await getDb();
//   const article = await db.collection("articles").findOne({ slug, published: true }, hidden);
//   return article ? withTopic(article, await topicTitles(db)) : null;
// }

// /** Other published articles in the same topic. */
// export async function getRelated(article, limit = 3) {
//   await connection();
//   const db = await getDb();
//   return db
//     .collection("articles")
//     .find({ topicSlug: article.topicSlug, slug: { $ne: article.slug }, published: true }, { projection: { _id: 0, slug: 1, title: 1, summary: 1 } })
//     .sort({ title: 1 })
//     .limit(limit)
//     .toArray();
// }

// /** Most recently updated published articles, with their topics. */
// export async function getRecentArticles(limit = 5) {
//   await connection();
//   const db = await getDb();
//   const [articles, titles] = await Promise.all([
//     db.collection("articles")
//       .find({ published: true }, { projection: { _id: 0, slug: 1, title: 1, topicSlug: 1, updated: 1 } })
//       .sort({ updated: -1 })
//       .limit(limit)
//       .toArray(),
//     topicTitles(db),
//   ]);
//   return articles.map((a) => withTopic(a, titles));
// }

// /** All topics in display order, each with its number of published articles. */
// export async function getTopics() {
//   await connection();
//   const db = await getDb();
//   const [topics, counts] = await Promise.all([
//     db.collection("topics").find({}, hidden).sort({ order: 1, title: 1 }).toArray(),
//     db.collection("articles").aggregate([{ $match: { published: true } }, { $group: { _id: "$topicSlug", n: { $sum: 1 } } }]).toArray(),
//   ]);
//   const count = new Map(counts.map((c) => [c._id, c.n]));
//   return topics.map((t) => ({ ...t, articles: count.get(t.slug) ?? 0 }));
// }

// /** "Reset it" -> "reset-it", for heading links. */
// export function slugify(text) {
//   return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// }

/**
 * Estimated reading time in whole minutes, at least 1.
 * Pass the article's bodyText (the plain-text copy of the body stored with each article).
 * 200 words per minute: a little slower than average, since how-tos get read step by step.
 *
 *   readingMinutes(article.bodyText) // 3
//  */
// export function readingMinutes(text, wordsPerMinute = 200) {
//   const words = text.trim().split(/\s+/).filter(Boolean).length;
//   return Math.max(1, Math.round(words / wordsPerMinute));
// }
