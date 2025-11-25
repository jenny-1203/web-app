
export type Cuisine = '全部' | '中式' | '日式' | '韓式' | '港式' | '美式' | '義式' | '速食' | '飲料' | '咖啡廳';

export type PriceRange = '$ 1~200' | '$ 201~400' | '$ 401~600' | '$ 600+';

export type TravelMode = '步行' | '騎車';

export type MealTime = '早上' | '中午' | '晚上' | '現在';

export type RecommendationCount = 'single' | 'multiple';

export interface SearchFilters {
  cuisine: Cuisine;
  price: PriceRange;
  mode: TravelMode;
  time: MealTime;
  recommendationCount: RecommendationCount;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapSource {
  uri: string;
  title: string;
}

export interface SearchResult {
  text: string;
  sources: MapSource[];
}

export interface FavoriteCategory {
  id: string;
  name: string;
  items: MapSource[];
  collapsed?: boolean;
}

export type ViewState = 'search' | 'results' | 'favorites';
