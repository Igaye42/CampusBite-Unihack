import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyABzM-zdA3SG4F5_Lv2ULsuCTSxqBq7hTM"
});

export async function analyzeFoodImage(base64Image) {
  const prompt = `
    Analyze this food image and identify the SINGLE most prominent food item. 
    Return strictly a JSON object with no markdown formatting.
    
    Schema requirements:
    {
      "food_title": "String. A specific, highly recognizable name for the main food (e.g., 'Pepperoni Pizza', 'Blueberry Muffin').",
      "category": "String. Must be exactly one of: [meal, snack, dessert, drink, other].",
      "estimated_qty": "Integer. Estimate the total quantity or servings of this main food.",
      "estimated_weight_kg": "Float. Estimate the total weight of this food in kilograms (e.g., 0.5).",
      "safety_risk": "Boolean. True ONLY IF this food contains raw meat, raw seafood, or is clearly unrefrigerated dairy.",
      "suggested_tags": "Array of strings. Select applicable from: [vegetarian, vegan, halal, gluten-free, dairy-free, nut-warning]"
    }
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        prompt,
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
