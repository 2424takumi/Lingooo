/**
 * エラーバウンダリコンポーネント
 *
 * アプリ全体のエラーをキャッチし、クラッシュを防ぎます。
 * 機密情報の漏洩を防ぐため、エラー詳細は開発環境のみ表示します。
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  /**
   * カスタムフォールバックUI
   */
  fallback?: (error: Error, errorInfo: React.ErrorInfo, retry: () => void) => ReactNode;
  /**
   * エラー発生時のコールバック
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary コンポーネント
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * @example カスタムフォールバック
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, errorInfo, retry) => (
 *     <CustomErrorScreen error={error} onRetry={retry} />
 *   )}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * エラーが発生したときに呼ばれる
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * エラー情報をログに記録
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーログに記録
    logger.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 状態を更新
    this.setState({ errorInfo });

    // カスタムエラーハンドラを呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 本番環境では、エラーレポートサービスに送信
    // 例: Sentry, Firebase Crashlytics など
    if (!__DEV__) {
      // TODO: エラーレポートサービスへの送信
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  /**
   * エラーをリセットして再試行
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * デフォルトのフォールバックUI
   */
  renderDefaultFallback() {
    const { error, errorInfo } = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* エラーアイコン */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>

          {/* エラーメッセージ */}
          <Text style={styles.title}>問題が発生しました</Text>
          <Text style={styles.message}>
            アプリで予期しないエラーが発生しました。{'\n'}
            申し訳ございませんが、もう一度お試しください。
          </Text>

          {/* 開発環境のみ: エラー詳細 */}
          {__DEV__ && error && (
            <ScrollView style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>エラー詳細（開発環境のみ表示）:</Text>
              <Text style={styles.errorText}>
                {error.toString()}
                {'\n\n'}
                {error.stack}
              </Text>
              {errorInfo && (
                <>
                  <Text style={styles.errorDetailsTitle}>コンポーネントスタック:</Text>
                  <Text style={styles.errorText}>{errorInfo.componentStack}</Text>
                </>
              )}
            </ScrollView>
          )}

          {/* 再試行ボタン */}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>再試行</Text>
          </TouchableOpacity>

          {/* 本番環境のみ: サポート連絡先 */}
          {!__DEV__ && (
            <Text style={styles.supportText}>
              問題が解決しない場合は、サポートまでお問い合わせください。
            </Text>
          )}
        </View>
      </View>
    );
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // カスタムフォールバックがある場合はそれを表示
      if (fallback && errorInfo) {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // デフォルトのフォールバックを表示
      return this.renderDefaultFallback();
    }

    // エラーがない場合は通常の children を表示
    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    maxHeight: 200,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00AA69',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  supportText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
});
