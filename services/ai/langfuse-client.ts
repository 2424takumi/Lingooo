/**
 * モバイル向けLangfuseプロンプトクライアント
 *
 * バックエンド経由でLangfuseプロンプトを取得し、
 * AsyncStorageでキャッシュを管理します。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

interface CachedPrompt {
  prompt: string;
  version: number;
  timestamp: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30分
const CACHE_PREFIX = 'langfuse_prompt_';

/**
 * バックエンドURLを取得
 */
function getBackendUrl(): string {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL is not defined');
  }
  return url;
}

/**
 * バックエンド経由でLangfuseプロンプトを取得
 *
 * @param name - Langfuseプロンプト名
 * @param variables - プロンプト変数（Mustache形式: {{variable}}）
 * @returns コンパイル済みプロンプト文字列
 */
export async function fetchPrompt(
  name: string,
  variables?: Record<string, any>
): Promise<string> {
  const cacheKey = `${CACHE_PREFIX}${name}`;

  try {
    // キャッシュチェック
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const cachedData: CachedPrompt = JSON.parse(cached);
      const age = Date.now() - cachedData.timestamp;

      if (age < CACHE_TTL) {
        logger.debug(`[LangfuseClient] Cache hit: ${name}`);
        return compilePrompt(cachedData.prompt, variables || {});
      }
    }

    // バックエンドAPIから取得
    logger.info(`[LangfuseClient] Fetching from backend: ${name}`);
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/prompts/${name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prompt: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // キャッシュに保存
    const cacheData: CachedPrompt = {
      prompt: data.prompt,
      version: data.version,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

    logger.info(`[LangfuseClient] Fetched successfully: ${name} (v${data.version})`);
    return compilePrompt(data.prompt, variables || {});
  } catch (error) {
    logger.error(`[LangfuseClient] Error fetching prompt ${name}:`, error);
    throw error;
  }
}

/**
 * フォールバック付きプロンプト取得
 *
 * @param name - Langfuseプロンプト名
 * @param fallbackPrompt - フォールバックプロンプト（テンプレート）
 * @param variables - プロンプト変数
 * @returns コンパイル済みプロンプト文字列
 */
export async function fetchPromptWithFallback(
  name: string,
  fallbackPrompt: string,
  variables?: Record<string, any>
): Promise<string> {
  try {
    return await fetchPrompt(name, variables);
  } catch (error) {
    logger.warn(`[LangfuseClient] Using fallback for ${name}:`, error);
    return compilePrompt(fallbackPrompt, variables || {});
  }
}

/**
 * プロンプトテンプレートに変数を適用
 * Mustache-style syntax: {{variable}}
 *
 * @param template - プロンプトテンプレート
 * @param variables - 変数オブジェクト
 * @returns コンパイル済みプロンプト
 */
function compilePrompt(template: string, variables: Record<string, any>): string {
  let compiled = template;
  for (const [key, value] of Object.entries(variables)) {
    // {{variable}} または {{ variable }} の両方に対応
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    compiled = compiled.replace(regex, String(value));
  }
  return compiled;
}

/**
 * プロンプトキャッシュをクリア（デバッグ用）
 *
 * @param name - プロンプト名（指定しない場合は全キャッシュをクリア）
 */
export async function clearPromptCache(name?: string): Promise<void> {
  try {
    if (name) {
      const cacheKey = `${CACHE_PREFIX}${name}`;
      await AsyncStorage.removeItem(cacheKey);
      logger.info(`[LangfuseClient] Cache cleared: ${name}`);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const promptKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(promptKeys);
      logger.info(`[LangfuseClient] All prompt caches cleared (${promptKeys.length} items)`);
    }
  } catch (error) {
    logger.error('[LangfuseClient] Error clearing cache:', error);
  }
}
