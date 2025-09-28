import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  private accountIdentifier: string;
  private apiToken: string;
  private apiUrl: string;

  constructor() {
    this.accountIdentifier = process.env.ACCOUNT_IDENTIFIER || '';
    this.apiToken = process.env.SNOWFLAKE_PAT || '';

    if (!this.accountIdentifier || !this.apiToken) {
      throw new Error('Missing ACCOUNT_IDENTIFIER or SNOWFLAKE_PAT in .env file');
    }

    this.apiUrl = `https://${this.accountIdentifier}.snowflakecomputing.com/api/v2/cortex/inference:complete`;
  }

  async generateBuildingCode(
    prompt: string,
    availableParts: string,
    builderAPI: string
  ): Promise<string> {
    const systemPrompt = `You are a LEGO building assistant that generates TypeScript code to create LEGO models using the LDrawBuilder API.

${builderAPI}

Available parts (partial list):
${availableParts}

Important guidelines:
1. Generate ONLY executable TypeScript code, no explanations
2. Use the builder methods to place parts at appropriate coordinates
3. Start with "const builder = new LDrawBuilder();"
4. End with "builder.save('model.ldr');"
5. Use proper LDraw units (1 stud = 20 LDU, 1 plate height = 8 LDU)
6. Place parts logically to create a recognizable structure
7. Use appropriate colors from the Colors object
8. Return ONLY the code, no markdown or explanations`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Build: ${prompt}` }
    ];

    try {
      const response = await axios.post<AIResponse>(
        this.apiUrl,
        {
          model: 'claude-3-5-sonnet',
          messages,
          stream: false,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      const code = response.data.choices[0].message.content;

      // Clean up the response to ensure it's pure code
      const cleanedCode = this.cleanCode(code);
      return cleanedCode;
    } catch (error: any) {
      console.error('AI API Error:', error.response?.data || error.message);
      throw new Error(`Failed to generate building code: ${error.message}`);
    }
  }

  private cleanCode(code: string): string {
    // Remove markdown code blocks if present
    let cleaned = code.replace(/```typescript\n?/g, '').replace(/```\n?/g, '');

    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();

    // If the code doesn't start with const or import, try to find where the actual code starts
    if (!cleaned.startsWith('const') && !cleaned.startsWith('import')) {
      const codeStart = cleaned.indexOf('const builder');
      if (codeStart !== -1) {
        cleaned = cleaned.substring(codeStart);
      }
    }

    return cleaned;
  }
}