interface JokeResponse {
  type: string;
  setup: string;
  punchline: string;
  id: number;
}

export interface Joke {
  setup: string;
  punchline: string;
}

export async function fetchRandomJoke(): Promise<Joke | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://official-joke-api.appspot.com/jokes/random', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('[JokeService] Failed to fetch joke, status:', response.status);
      return null;
    }
    
    const data: JokeResponse = await response.json();
    
    if (!data.setup || !data.punchline) {
      console.log('[JokeService] Invalid joke response format');
      return null;
    }
    
    return {
      setup: data.setup,
      punchline: data.punchline
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[JokeService] Joke fetch timed out');
    } else {
      console.log('[JokeService] Error fetching joke:', error);
    }
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
