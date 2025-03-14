
export interface SearchResult {
  type: 'track' | 'user' | 'stream' | 'post';
  id: number;
  title?: string;
  username?: string;
  imageUrl?: string;
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return response.json();
}
