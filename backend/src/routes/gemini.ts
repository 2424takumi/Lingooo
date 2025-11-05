import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initTask, updateTask, getTask } from '../utils/progressive-store';

const router = Router();

/**
 * Exponential backoff retry wrapper for API calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a rate limit error (429 or RESOURCE_EXHAUSTED)
      const isRateLimit = lastError.message.includes('429') ||
        lastError.message.includes('RESOURCE_EXHAUSTED') ||
        lastError.message.includes('rate limit');

      // Only retry on rate limit errors
      if (!isRateLimit || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.log(`[Retry] Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// Gemini クライアントを初期化
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * POST /api/gemini/generate
 * テキスト生成（ストリーミングなし）
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error('Error in /generate:', error);
    res.status(500).json({
      error: 'Failed to generate text',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/gemini/generate-stream
 * テキスト生成（ストリーミング）
 */
router.post('/generate-stream', async (req: Request, res: Response) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      },
    });

    // Server-Sent Events (SSE) でストリーミング
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // SSE形式でデータを送信
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    // ストリーム終了
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in /generate-stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate stream',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * POST /api/gemini/generate-json
 * JSON生成
 */
router.post('/generate-json', async (req: Request, res: Response) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      },
    });

    const result = await withRetry(
      () => model.generateContent(prompt),
      3,
      2000
    );
    const response = result.response;
    const text = response.text();

    // JSONをパース
    try {
      const jsonData = JSON.parse(text.trim());
      res.json({ data: jsonData });
    } catch (parseError) {
      // フォールバック: ```json ... ``` 形式を試す
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1].trim());
        res.json({ data: jsonData });
      } else {
        throw new Error('Response is not valid JSON');
      }
    }
  } catch (error) {
    console.error('Error in /generate-json:', error);
    res.status(500).json({
      error: 'Failed to generate JSON',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/gemini/generate-json-stream
 * JSON生成（ストリーミング・段階的レンダリング対応）
 *
 * JSONの各セクションが生成されるたびにイベントを送信：
 * - headword: 単語の基本情報
 * - senses: 意味のリスト
 * - metrics: メトリクス（頻度、難易度、ニュアンス）
 * - examples: 例文のリスト
 */
router.post('/generate-json-stream', async (req: Request, res: Response) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      generationConfig: {
        maxOutputTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        responseMimeType: 'application/json', // JSONレスポンスを強制
      },
    });

    // Server-Sent Events (SSE) でストリーミング
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const result = await model.generateContentStream(prompt);

    let accumulatedText = '';
    let lastSentSection = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedText += chunkText;

      // 部分的なJSONをパースして、新しいセクションが完成したら送信
      const partialData = tryParsePartialJSON(accumulatedText);

      if (partialData) {
        // headwordが新しく完成した場合
        if (partialData.headword && lastSentSection !== 'headword') {
          res.write(`data: ${JSON.stringify({
            type: 'section',
            section: 'headword',
            data: partialData.headword
          })}\n\n`);
          lastSentSection = 'headword';
        }

        // sensesが新しく完成した場合
        if (partialData.senses && partialData.senses.length > 0 && lastSentSection === 'headword') {
          res.write(`data: ${JSON.stringify({
            type: 'section',
            section: 'senses',
            data: partialData.senses
          })}\n\n`);
          lastSentSection = 'senses';
        }

        // metricsが新しく完成した場合
        if (partialData.metrics && lastSentSection === 'senses') {
          res.write(`data: ${JSON.stringify({
            type: 'section',
            section: 'metrics',
            data: partialData.metrics
          })}\n\n`);
          lastSentSection = 'metrics';
        }

        // examplesが新しく完成した場合
        if (partialData.examples && partialData.examples.length > 0 && lastSentSection === 'metrics') {
          res.write(`data: ${JSON.stringify({
            type: 'section',
            section: 'examples',
            data: partialData.examples
          })}\n\n`);
          lastSentSection = 'examples';
        }
      }

      // 進捗状況を送信
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        length: accumulatedText.length
      })}\n\n`);
    }

    // 最終的な完全なJSONをパース
    try {
      const finalData = JSON.parse(accumulatedText.trim());
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: finalData
      })}\n\n`);
    } catch (parseError) {
      console.error('Failed to parse final JSON:', parseError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to parse final JSON'
      })}\n\n`);
    }

    // ストリーム終了
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error in /generate-json-stream:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to generate JSON stream',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * 部分的なJSONをパースする（不完全でも可）
 */
function tryParsePartialJSON(text: string): any | null {
  try {
    const trimmed = text.trim();

    if (!trimmed || trimmed.length < 2) {
      return null;
    }

    // 不完全なJSONを完結させる試み
    let jsonText = trimmed;

    // 閉じカッコが足りない場合は追加
    const openBraces = (jsonText.match(/{/g) || []).length;
    const closeBraces = (jsonText.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      jsonText += '}'.repeat(openBraces - closeBraces);
    }

    // 配列の閉じカッコが足りない場合
    const openBrackets = (jsonText.match(/\[/g) || []).length;
    const closeBrackets = (jsonText.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      jsonText += ']'.repeat(openBrackets - closeBrackets);
    }

    // 最後がカンマで終わっている場合は削除
    jsonText = jsonText.replace(/,\s*}/g, '}');
    jsonText = jsonText.replace(/,\s*]/g, ']');

    // 文字列が途中で終わっている場合は削除
    jsonText = jsonText.replace(/:\s*"[^"]*$/, ': ""');

    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

/**
 * POST /api/gemini/generate-json-progressive
 * JSON生成（段階的生成 + ポーリング対応）
 *
 * タスクIDを即座に返し、バックグラウンドで生成を開始。
 * フロントエンドはタスクIDで進捗をポーリングします。
 */
router.post('/generate-json-progressive', async (req: Request, res: Response) => {
  try {
    const { prompt, config } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // タスクIDを生成
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // タスクを初期化
    initTask(taskId);

    // タスクIDを即座に返す
    res.json({ taskId });

    // バックグラウンドで生成を開始
    (async () => {
      try {
        const client = getGeminiClient();
        const model = client.getGenerativeModel({
          model: config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          generationConfig: {
            maxOutputTokens: config?.maxTokens || parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
            temperature: config?.temperature || parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
            responseMimeType: 'application/json',
          },
        });

        updateTask(taskId, { status: 'generating', progress: 10 });

        // Retry logic for rate limit errors
        const result = await withRetry(
          () => model.generateContentStream(prompt),
          3, // max retries
          2000 // initial delay: 2s, then 4s, then 8s
        );

        let accumulatedText = '';
        let lastSentSection = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accumulatedText += chunkText;

          // 部分的なJSONをパース
          const partialData = tryParsePartialJSON(accumulatedText);

          if (partialData) {
            // headwordが完成
            if (partialData.headword && lastSentSection !== 'headword') {
              updateTask(taskId, {
                progress: 25,
                partialData: { headword: partialData.headword },
              });
              lastSentSection = 'headword';
              console.log(`[Task ${taskId}] headword ready`);
            }

            // sensesが完成
            if (partialData.senses && partialData.senses.length > 0 && lastSentSection === 'headword') {
              updateTask(taskId, {
                progress: 50,
                partialData: {
                  headword: partialData.headword,
                  senses: partialData.senses,
                },
              });
              lastSentSection = 'senses';
              console.log(`[Task ${taskId}] senses ready`);
            }

            // metricsが完成
            if (partialData.metrics && lastSentSection === 'senses') {
              updateTask(taskId, {
                progress: 75,
                partialData: {
                  headword: partialData.headword,
                  senses: partialData.senses,
                  metrics: partialData.metrics,
                },
              });
              lastSentSection = 'metrics';
              console.log(`[Task ${taskId}] metrics ready`);
            }

            // examplesが完成
            if (partialData.examples && partialData.examples.length > 0 && lastSentSection === 'metrics') {
              updateTask(taskId, {
                progress: 95,
                partialData: {
                  headword: partialData.headword,
                  senses: partialData.senses,
                  metrics: partialData.metrics,
                  examples: partialData.examples,
                },
              });
              lastSentSection = 'examples';
              console.log(`[Task ${taskId}] examples ready`);
            }
          }
        }

        // 最終データ
        try {
          console.log(`[Task ${taskId}] Accumulated text (first 1000 chars):`, accumulatedText.substring(0, 1000));
          const finalData = JSON.parse(accumulatedText.trim());
          console.log(`[Task ${taskId}] Final data type:`, typeof finalData);
          console.log(`[Task ${taskId}] Final data is array:`, Array.isArray(finalData));
          console.log(`[Task ${taskId}] Final data keys:`, Object.keys(finalData));
          console.log(`[Task ${taskId}] Final data structure:`, JSON.stringify(finalData, null, 2).substring(0, 500));

          updateTask(taskId, {
            status: 'completed',
            progress: 100,
            partialData: finalData,
          });
          console.log(`[Task ${taskId}] completed`);
        } catch (parseError) {
          console.error(`[Task ${taskId}] Failed to parse final JSON:`, parseError);
          console.error(`[Task ${taskId}] Accumulated text:`, accumulatedText.substring(0, 500));
          throw parseError;
        }
      } catch (error) {
        console.error(`[Task ${taskId}] error:`, error);
        updateTask(taskId, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
  } catch (error) {
    console.error('Error in /generate-json-progressive:', error);
    res.status(500).json({
      error: 'Failed to start generation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/gemini/task/:taskId
 * タスクの進捗を取得（ポーリング用）
 */
router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;

  const task = getTask(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});

/**
 * GET /api/gemini/status
 * APIキーが設定されているかチェック
 */
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  res.json({ configured: isConfigured });
});

export default router;
