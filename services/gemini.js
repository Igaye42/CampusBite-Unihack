import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyABzM-zdA3SG4F5_Lv2ULsuCTSxqBq7hTM"
});

export async function analyzeFoodImage(base64Image) {
  const prompt = `
    Analyze this food image. Return strictly a JSON object with no markdown formatting.
    Schema requirements:
    {
      "category": "Must be exactly one of: [pizza, sandwich, pastries, rice_noodle_box, salad, drinks, other]",
      "estimated_qty": "Integer. Estimate the number of servings or items",
      "safety_risk": "Boolean. True ONLY IF the food contains raw meat, raw seafood, or is clearly unrefrigerated dairy. Otherwise false.",
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
