import { GoogleGenAI } from "@google/genai";
import { SearchFilters, Coordinates, SearchResult, MapSource } from "../types";

const apiKey = process.env.API_KEY;

export const searchRestaurants = async (
  filters: SearchFilters,
  location: Coordinates | null,
  manualAddress?: string
): Promise<SearchResult> => {
  if (!apiKey) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey });

  const countPrompt = filters.recommendationCount === 'single' 
    ? "✨ 請只推薦「1家」你認為絕對最棒、無敵好吃的店！這非常重要，我只想去一家！" 
    : "✨ 請推薦「3-5家」超棒的選擇給我挑選！";

  // Time Mapping
  let timeContext = "";
  if (filters.time === '現在') {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    timeContext = `現在時間是 ${hour}:${minutes}，請務必確認餐廳「現在這個當下」是營業中的 (Open Now)。`;
  } else if (filters.time === '早上') {
    timeContext = "時段：早餐時段 (Morning/Breakfast)。請找有賣早餐的店。";
  } else if (filters.time === '中午') {
    timeContext = "時段：午餐時段 (Noon/Lunch)。請找適合吃午餐的店。";
  } else if (filters.time === '晚上') {
    timeContext = "時段：晚餐時段 (Evening/Dinner)。請找適合吃晚餐的店。";
  }

  // Price Mapping
  let priceContext = "";
  if (filters.price === '$ 1~200') {
    priceContext = "預算極限：200元台幣以內。請找「平價」、「銅板美食」、「小吃」或 Google Maps 標示為 '$' (Inexpensive) 的店。絕對不要推薦高價餐廳。";
  } else if (filters.price === '$ 201~400') {
    priceContext = "預算範圍：200-400元台幣。尋找中價位、Google Maps 標示為 '$$' (Moderate) 的店。";
  } else if (filters.price === '$ 401~600') {
    priceContext = "預算範圍：400-600元台幣。適合聚餐的餐廳。";
  } else {
    priceContext = "預算：600元以上。尋找高級餐廳、精緻料理。";
  }

  // Location Context Construction
  let locationContext = "";
  let toolConfig = {};
  let nearQueryContext = "";

  if (manualAddress) {
      // Manual Mode
      locationContext = `
        📍 我的位置在：『${manualAddress}』。
        請以這個地點為中心搜尋附近的餐廳。
        注意：請不要使用GPS座標，直接搜尋這個地址周邊。
      `;
      nearQueryContext = `位於 ${manualAddress} 附近`;
      // We do NOT pass latLng in retrievalConfig when using manual address to let Google Maps tool infer from query
      toolConfig = {
        tools: [{ googleMaps: {} }],
      };
  } else if (location) {
      // GPS Mode
      locationContext = `
        📍 我的精確位置在 (緯度: ${location.latitude}, 經度: ${location.longitude})。
        請注意：搜尋時請務必使用這個座標作為中心點，不要自己亂猜一個位置。
      `;
      nearQueryContext = `位於 (緯度:${location.latitude}, 經度:${location.longitude}) 附近`;
      toolConfig = {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
          },
        },
      };
  } else {
      throw new Error("需要定位或手動輸入位置才能搜尋");
  }

  // Distance / Mode Logic (Tiered System - STRICTLY UPDATED)
  // Walking Speed avg ~70-80m/min.
  // Tier 1 (1-7 min): < 500-600m
  // Tier 2 (8-10 min): 600m - 800m
  // Tier 3 (11-15 min): 800m - 1.2km
  
  // Biking Speed avg ~250m/min (15km/h)
  // Tier 1 (1-7 min): < 1.8km
  // Tier 2 (8-10 min): 1.8km - 2.5km
  // Tier 3 (11-15 min): 2.5km - 4.0km
  
  let modeContext = "";
  if (filters.mode === '步行') {
     modeContext = `
     ⚠️ 交通方式：步行 (Walking)。請嚴格遵守以下距離分級：
     【第一級優先 (Tier 1)】：步行 1~7 分鐘內 (約 500公尺內)。這是最完美的距離。
     【第二級接受 (Tier 2)】：步行 8~10 分鐘內 (約 500-800公尺)。
     【第三級勉強 (Tier 3)】：步行 11~15 分鐘內 (約 800-1200公尺)。
     ⛔【絕對禁止】：步行超過 15分鐘 (超過 1.2公里) 的店。
     `;
  } else {
     modeContext = `
     ⚠️ 交通方式：騎車 (Scooter/Bike)。請嚴格遵守以下距離分級：
     【第一級優先 (Tier 1)】：騎車 1~7 分鐘內 (約 1.8公里內)。
     【第二級接受 (Tier 2)】：騎車 8~10 分鐘內 (約 1.8-2.5公里)。
     【第三級勉強 (Tier 3)】：騎車 11~15 分鐘內 (約 2.5-4.0公里)。
     ⛔【絕對禁止】：騎車超過 15分鐘 (超過 4公里) 的店。
     `;
  }

  // Construct a natural language prompt based on filters
  const prompt = `
    ${locationContext}

    我是個超級吃貨，我有選擇困難！請幫我找到${nearQueryContext}的餐廳。
    
    🎯 我的願望清單:
    1. 想吃類型: ${filters.cuisine === '全部' ? '任何好吃的都可以' : filters.cuisine} 😋
    2. 💰 ${priceContext} (⚠️嚴格篩選價格)
    3. ${modeContext} (⚠️嚴格遵守時間/距離分級)
    4. ${timeContext} ⏰
    5. 數量要求: ${countPrompt}

    🛑 絕對紅線 (CRITICAL RULES):
    1. 【禁止跨區推薦】：絕對不要推薦其他國家(如美國)、其他縣市的店家。請確認店家地址就在我附近。如果找不到，請誠實說找不到。
    2. 【Top 1 順序綁定】：你的文字報告中推薦的「第一名」店家，**必須** 是你引用的第一個 Google Maps 連結。請不要順序錯亂。
    3. 【Top 1 距離優先】：你心中的「Top 1」推薦店家，**必須** 是在【第一級優先 (1-7分鐘)】範圍內的店家。不能因為某家店很好吃但很遠就排第一。
    4. 【分級排序】：請優先列出符合【第一級】的店家，再來是【第二級】，最後才是【第三級】。
    5. 【加上距離】：在每一家店的推薦理由中，明確寫出「距離約 xxx 公尺」或「${filters.mode}約 x 分鐘」。
    
    請列出每家店的：
    - 🏠 店名 (請使用 Markdown 連結格式： [店名](Google Map連結))
    - ⭐ 評分
    - 📍 位置與距離 (例如：距離約 300m，${filters.mode} 4分鐘)
    - 💰 預估價格
    - ❤️ 為什麼推薦它 (必吃特色)
    
    語氣要求：
    請用「超級活潑、可愛、充滿表情符號」的語氣！要像個貼心的美食小助手。使用大量 Emoji (🍱, 🔥, ✨, 🤤)。
    
    技術要求(重要)：
    請務必使用 Google Maps Tool 搜尋真實存在的店家，不要憑空捏造。
    確保所有的超連結 (URI) 都是真實有效的 Google Maps 連結。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: toolConfig,
    });

    const text = response.text || "嗚嗚... 找不到相關結果，換個條件試試看？";
    
    // Extract grounding chunks for map links
    const sources: MapSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
           sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        } else if (chunk.maps?.uri && chunk.maps?.title) {
            sources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        } else if (chunk.groundingChunk?.web?.uri) {
             sources.push({ uri: chunk.groundingChunk.web.uri, title: chunk.groundingChunk.web.title });
        }
      });
    }

    // Filter out duplicates based on URI
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return {
      text,
      sources: uniqueSources,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("哎呀！AI 腦袋打結了，請稍後再試一次！");
  }
};
