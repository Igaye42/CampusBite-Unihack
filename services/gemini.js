import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyABzM-zdA3SG4F5_Lv2ULsuCTSxqBq7hTM"
});

export async function analyzeFoodImage(base64Image) {
  const prompt = `
    Analyze this food image. Return strictly a JSON object with no markdown formatting.
    
    Schema requirements:
    {
      "contains_multiple_food_types": "Boolean. True ONLY IF there are completely distinct types of food in the image (e.g., a pizza AND a salad, or a burger AND fries). False if it is just multiple pieces of the SAME food (e.g., 3 apples or 5 slices of pizza).",
      "food_title": "String. A specific, highly recognizable name for the main food (e.g., 'Pepperoni Pizza').",
      "category": "String. Must be exactly one of: [meal, snack, dessert, drink, other].",
      "estimated_qty": "Integer. Estimate the total quantity or servings.",
      "estimated_weight_kg": "Float. Estimate the total weight in kilograms.",
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
