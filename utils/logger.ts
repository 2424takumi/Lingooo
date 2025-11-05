/**
 * Logger ユーティリティ
 *
 * 開発環境と本番環境でログ出力を切り替え、
 * 機密情報の漏洩を防ぎます。
 */

// __DEV__ は React Native が提供するグローバル変数
const isDevelopment = __DEV__;

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * ログ出力設定
 */
interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
}

const defaultConfig: LoggerConfig = {
  enabledInProduction: false, // 本番環境ではログを無効化
  minLevel: LogLevel.DEBUG,
};

let config = { ...defaultConfig };

/**
 * ログレベルの優先度
 */
const levelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * ログを出力すべきかチェック
 */
function shouldLog(level: LogLevel): boolean {
  // 本番環境で無効化されている場合
  if (!isDevelopment && !config.enabledInProduction) {
    // エラーログのみ出力
    return level === LogLevel.ERROR;
  }

  // 最小レベル未満は出力しない
  return levelPriority[level] >= levelPriority[config.minLevel];
}

/**
 * 機密情報をマスクする
 */
function sanitize(value: any): any {
  if (typeof value === 'string') {
    // APIキーっぽい文字列をマスク
    if (value.match(/^[A-Za-z0-9_-]{20,}$/)) {
      return `***${value.slice(-4)}`;
    }
    // JWTトークンをマスク
    if (value.match(/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
      return '***[JWT_TOKEN]***';
    }
  }

  if (typeof value === 'object' && value !== null) {
    const sanitized: any = Array.isArray(value) ? [] : {};
    for (const key in value) {
      // パスワードやトークンのキーをマスク
      if (/password|token|secret|api[_-]?key/i.test(key)) {
        sanitized[key] = '***[REDACTED]***';
      } else {
        sanitized[key] = sanitize(value[key]);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * ログを整形
 */
function formatLog(level: LogLevel, ...args: any[]): any[] {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;

  // 本番環境では機密情報をサニタイズ
  const sanitizedArgs = isDevelopment ? args : args.map(sanitize);

  return [prefix, ...sanitizedArgs];
}

/**
 * Logger クラス
 */
class Logger {
  /**
   * デバッグログ（開発環境のみ）
   */
  debug(...args: any[]): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.log(...formatLog(LogLevel.DEBUG, ...args));
    }
  }

  /**
   * 情報ログ
   */
  info(...args: any[]): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(...formatLog(LogLevel.INFO, ...args));
    }
  }

  /**
   * 警告ログ
   */
  warn(...args: any[]): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(...formatLog(LogLevel.WARN, ...args));
    }
  }

  /**
   * エラーログ（常に出力）
   */
  error(...args: any[]): void {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(...formatLog(LogLevel.ERROR, ...args));
    }
  }

  /**
   * グループ化されたログ（開発環境のみ）
   */
  group(label: string, fn: () => void): void {
    if (isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  }

  /**
   * テーブル形式のログ（開発環境のみ）
   */
  table(data: any): void {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Logger設定を更新
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): LoggerConfig {
    return { ...config };
  }
}

/**
 * シングルトンインスタンス
 */
export const logger = new Logger();

/**
 * デフォルトエクスポート
 */
export default logger;
