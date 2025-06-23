function extractImdbId(url:string) {
    // This regex looks for "tt" followed by one or more digits.
    // It will not include any leading or trailing slashes in its match.
    const match = url.match(/tt\d+/);
    if (match) {
        return match[0]; // Returns the exact matched string (e.g., "tt1234567")
    } else {
        return null; // Returns null if no IMDb code is found
    }
}
export async function extractImdbIdFromGoogle(nome: string): Promise<string | null> {
    try {
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(nome)}`);
        if (!response.ok) {
            throw new Error('Error fetching data from Google API');
        }
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            for (const item of data.items) {
                if (item.link && item.link.includes('imdb.com/title/')) {
                    return extractImdbId(item.link);
                }
            }
        }else{
            console.warn('No items found in Google search results');
            return null;    
        }
    } catch (error) {
        console.error('Error fetching IMDb info:', error);
    }
    return null;
}