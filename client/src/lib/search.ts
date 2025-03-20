
export interface SearchResult {
  type: 'track' | 'user' | 'stream' | 'post';
  id: number;
  title?: string;
  username?: string;
  displayName?: string;
  artistName?: string;
  imageUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
  profileImageUrl?: string;
  description?: string;
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }
  
  try {
    // Search tracks
    const trackResponse = await fetch(`/api/search/tracks?query=${encodeURIComponent(query)}`);
    const tracks = await trackResponse.json();
    
    // Search users
    const userResponse = await fetch(`/api/search/users?query=${encodeURIComponent(query)}`);
    const users = await userResponse.json();
    
    // Search streams
    const streamResponse = await fetch(`/api/search/streams?query=${encodeURIComponent(query)}`);
    const streams = await streamResponse.json();
    
    // Search posts
    const postResponse = await fetch(`/api/search/posts?query=${encodeURIComponent(query)}`);
    const posts = await postResponse.json();
    
    // Combine and format results
    const results: SearchResult[] = [
      ...tracks.map((track: any) => ({
        type: 'track' as const,
        id: track.id,
        title: track.title,
        artistName: track.artist_name,
        imageUrl: track.cover_url
      })),
      
      ...users.map((user: any) => ({
        type: 'user' as const,
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        imageUrl: user.profile_image_url
      })),
      
      ...streams.map((stream: any) => ({
        type: 'stream' as const,
        id: stream.id,
        title: stream.title,
        description: stream.description,
        imageUrl: stream.thumbnail_url
      })),
      
      ...posts.map((post: any) => ({
        type: 'post' as const,
        id: post.id,
        title: post.title,
        imageUrl: post.image_url
      }))
    ];
    
    // Limit to top 20 results total
    return results.slice(0, 20);
  } catch (error) {
    console.error('Error searching content:', error);
    return [];
  }
}
