export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

const SEARCH_QUERY = "고석현";
const MAX_RESULTS = 6;

export async function fetchNews(): Promise<NewsArticle[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(SEARCH_QUERY)}&hl=ko&gl=KR&ceid=KR:ko`;

    const res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) {
      return [];
    }

    const xml = await res.text();
    const articles: NewsArticle[] = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while (
      (match = itemRegex.exec(xml)) !== null &&
      articles.length < MAX_RESULTS
    ) {
      const itemXml = match[1];

      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
      const source =
        itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "";
      const pubDate =
        itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";

      if (title && link) {
        articles.push({
          title: decodeHtmlEntities(title),
          link,
          source: decodeHtmlEntities(source),
          pubDate,
        });
      }
    }

    return articles;
  } catch {
    return [];
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
