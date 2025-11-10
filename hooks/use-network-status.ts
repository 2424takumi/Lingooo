import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * ネットワーク状態を監視するフック
 *
 * @returns {NetworkStatus} ネットワークの状態情報
 *
 * @example
 * const { isConnected, isInternetReachable } = useNetworkStatus();
 *
 * if (!isConnected) {
 *   // オフライン時の処理
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // デフォルトはオンラインと仮定
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // 初回の状態取得
    NetInfo.fetch().then(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      });
    });

    // ネットワーク状態の変更を監視
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}

/**
 * オフライン状態かどうかを返すシンプルなフック
 */
export function useIsOffline(): boolean {
  const { isConnected } = useNetworkStatus();
  return !isConnected;
}
