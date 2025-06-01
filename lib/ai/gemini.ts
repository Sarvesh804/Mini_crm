import { SegmentRule } from "@/types";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey });

export class GeminiService {
  public model = "gemini-2.0-flash";

  async naturalLanguageToRules(query: string): Promise<SegmentRule[]> {
    const prompt = `
    Convert this natural language query into CRM segment rules.
    Query: "${query}"

    Available fields: totalSpent, visits, lastVisit, createdAt
    Available operators: >, <, >=, <=, =, !=, days_ago
    
    Return ONLY a JSON array of rules in this format:
    [
      {
        "field": "totalSpent",
        "operator": ">",
        "value": 1000,
        "logic": "AND"
      }
    ]
    
    Examples:
    - "customers who spent more than $500" → [{"field": "totalSpent", "operator": ">", "value": 500}]
    - "users who haven't visited in 30 days" → [{"field": "lastVisit", "operator": "days_ago", "value": 30}]
    - "high spenders with low visits" → [{"field": "totalSpent", "operator": ">", "value": 1000, "logic": "AND"}, {"field": "visits", "operator": "<", "value": 5}]
    `;

    try {
      const response = await genAI.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      const text = response.text;

      // Extract JSON from response
      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error("Could not parse rules from AI response");
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to convert natural language to rules");
    }
  }

  async generateCampaignMessages(
    objective: string,
    audienceDescription: string
  ): Promise<string[]> {
    const prompt = `
    Generate 3 personalized marketing message variants for a CRM campaign.
    
    Campaign Objective: ${objective}
    Target Audience: ${audienceDescription}
    
    Requirements:
    - Keep messages under 150 characters
    - Include personalization placeholder {name}
    - Make them engaging and action-oriented
    - Vary the tone (urgent, friendly, exclusive)
    - Include relevant offers or CTAs
    
    Return ONLY a JSON array of 3 messages:
    ["message1", "message2", "message3"]
    `;

    try {
      const response = await genAI.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      const text = response.text;

      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const messages = JSON.parse(jsonMatch[0]);
        return messages.map((msg: string) =>
          msg.replace(/\{name\}/g, "{customerName}")
        );
      }

      throw new Error("Could not parse messages from AI response");
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate campaign messages");
    }
  }

  async analyzeCampaignPerformance(stats: {
    sent: number;
    failed: number;
    audienceSize: number;
    campaignName: string;
  }): Promise<string> {
    const prompt = `
    Analyze this campaign performance and provide insights:
    
    Campaign: ${stats.campaignName}
    Total Audience: ${stats.audienceSize}
    Messages Sent: ${stats.sent}
    Messages Failed: ${stats.failed}
    Success Rate: ${((stats.sent / stats.audienceSize) * 100).toFixed(1)}%
    
    Provide a concise, actionable analysis in 2-3 sentences focusing on:
    - Performance assessment
    - Potential reasons for failures
    - Recommendations for improvement
    
    Keep it professional but engaging.
    `;

    try {
      const response = await genAI.models.generateContent({
        model: this.model,
        contents: prompt,
      });
      if (!response || !response.text) {
        throw new Error("No response from Gemini AI");
      }
      return response.text.trim();
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Unable to generate performance analysis at this time.";
    }
  }

  async suggestAudienceSegments(existingRules: string[]): Promise<string[]> {
    const prompt = `
    Based on these existing segment rules, suggest 3 similar audience segments:
    ${JSON.stringify(existingRules)}
    
    Return ONLY a JSON array of 3 descriptive segment names:
    ["Segment Name 1", "Segment Name 2", "Segment Name 3"]
    
    Examples: ["High-Value Inactive Users", "Frequent Low-Spenders", "New Premium Customers"]
    `;

    try {
      const response = await genAI.models.generateContent({model: this.model, contents: prompt});
      const text = response?.text;

      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [
        "Similar High-Value Customers",
        "Potential Churning Users",
        "Growth Opportunity Segment",
      ];
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return [
        "Similar Audience Segment",
        "Complementary User Group",
        "Alternative Target Audience",
      ];
    }
  }
}

export const geminiService = new GeminiService();
