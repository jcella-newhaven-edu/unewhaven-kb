// import { getDb } from "./mongodb";

// async function topicTitles(db) {
//   const topics = await db.collection("topics").find({}, { projection: { _id: 0, slug: 1, title: 1 } }).toArray();
//   return new Map(topics.map((t) => [t.slug, t.title]));
// }

// async function topicTitles(db) {
//   const topics = await db.collection("topics").find({}, { projection: { _id: 0, slug: 1, title: 1 } }).toArray();
//   return new Map(topics.map((t) => [t.slug, t.title]));
// }
// const withTopic = (article, titles) => ({
//   ...article,
//   topic: { slug: article.topicSlug, title: titles.get(article.topicSlug) ?? article.topicSlug },
// });

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
