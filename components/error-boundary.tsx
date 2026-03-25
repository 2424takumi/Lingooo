/**
 * エラーバウンダリコンポーネント
 *
 * アプリ全体のエラーをキャッチし、クラッシュを防ぎます。
 * 機密情報の漏洩を防ぐため、エラー詳細は開発環境のみ表示します。
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { logger } from '@/utils/logger';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Themed fallback UI (functional component to use hooks)
 */
function DefaultFallbackUI({
  error,
  errorInfo,
  onRetry,
}: {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onRetry: () => void;
}) {
  const pageBg = useThemeColor({}, 'pageBackground');
  const cardBg = useThemeColor({}, 'modalBackground');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const surfaceBg = useThemeColor({}, 'surfaceBackground');
  const borderColor = useThemeColor({}, 'borderLight');
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.content, { backgroundColor: cardBg }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚠️</Text>
        </View>
        <Text style={[styles.title, { color: textColor }]}>問題が発生しました</Text>
        <Text style={[styles.message, { color: textSecondary }]}>
          アプリで予期しないエラーが発生しました。{'\n'}
          申し訳ございませんが、もう一度お試しください。
        </Text>
        {error && (
          <ScrollView style={[styles.errorDetails, { backgroundColor: surfaceBg, borderColor }]}>
            <Text style={[styles.errorDetailsTitle, { color: textColor }]}>エラー詳細:</Text>
            <Text style={[styles.errorText, { color: textSecondary }]}>
              {error.toString()}
              {__DEV__ && error.stack ? `\n\n${error.stack}` : ''}
            </Text>
            {__DEV__ && errorInfo && (
              <>
                <Text style={[styles.errorDetailsTitle, { color: textColor }]}>コンポーネントスタック:</Text>
                <Text style={[styles.errorText, { color: textSecondary }]}>{errorInfo.componentStack}</Text>
              </>
            )}
          </ScrollView>
        )}
        <TouchableOpacity style={[styles.button, { backgroundColor: primaryColor }]} onPress={onRetry}>
          <Text style={styles.buttonText}>再試行</Text>
        </TouchableOpacity>
        {!__DEV__ && (
          <Text style={[styles.supportText, { color: textTertiary }]}>
            問題が解決しない場合は、サポートまでお問い合わせください。
          </Text>
        )}
      </View>
    </View>
  );
}

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
    // TODO: クラッシュレポーティングサービス（Firebase Crashlytics等）を追加
    if (!__DEV__) {
      // 将来的にクラッシュレポーティングを追加可能
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
      <DefaultFallbackUI
        error={error}
        errorInfo={errorInfo}
        onRetry={this.handleRetry}
      />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
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
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    maxHeight: 200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  button: {
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
    textAlign: 'center',
    marginTop: 8,
  },
});
