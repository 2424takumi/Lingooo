import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INITIAL_SETUP_KEY = '@initial_language_setup_completed';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsInitialSetup: boolean;
  completeInitialSetup: (nativeLanguage: string, learningLanguages: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  needsInitialSetup: false,
  completeInitialSetup: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);

  useEffect(() => {
    // 初期化処理
    initializeAuth();

    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        ensureUserRecord(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    // 初期設定完了フラグをチェック
    const setupCompleted = await AsyncStorage.getItem(INITIAL_SETUP_KEY);

    // 初期セッションチェック
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);

    // セッションがない場合
    if (!session) {
      if (!setupCompleted) {
        // 初期設定が未完了の場合はモーダルを表示
        setNeedsInitialSetup(true);
        setLoading(false);
      } else {
        // 初期設定完了済みの場合は匿名ログイン
        signInAnonymously();
      }
    } else {
      // セッションがある場合、usersテーブルにレコードがあるか確認
      ensureUserRecord(session.user.id);
      setLoading(false);
    }
  };

  // 初期設定完了処理
  const completeInitialSetup = async (nativeLanguage: string, learningLanguages: string[]) => {
    try {
      // 初期設定完了フラグを保存
      await AsyncStorage.setItem(INITIAL_SETUP_KEY, 'true');

      // 匿名ログイン実行
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('匿名ログインエラー:', error);
        setLoading(false);
        return;
      }

      if (data.user) {
        // 選択された言語設定でusersテーブルにレコードを作成
        await ensureUserRecord(data.user.id, nativeLanguage, learningLanguages);
      }

      setNeedsInitialSetup(false);
      setLoading(false);
    } catch (error) {
      console.error('初期設定完了エラー:', error);
      setLoading(false);
    }
  };

  // 匿名ログイン
  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('匿名ログインエラー:', error);
        setLoading(false);
        return;
      }

      if (data.user) {
        // usersテーブルにレコードを作成（デフォルト値）
        await ensureUserRecord(data.user.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('匿名ログイン例外:', error);
      setLoading(false);
    }
  };

  // usersテーブルにレコードがあるか確認し、なければ作成
  const ensureUserRecord = async (
    userId: string,
    nativeLanguage?: string,
    learningLanguages?: string[]
  ) => {
    try {
      // 既存レコードを確認
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = レコードが見つからない（これは正常）
        console.error('ユーザーレコード取得エラー:', fetchError);
        return;
      }

      // レコードがなければ作成
      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          plan: 'free',
          monthly_question_count: 0,
          monthly_token_usage: 0,
          native_language: nativeLanguage || 'ja',
          default_language: learningLanguages?.[0] || 'en',
          learning_languages: learningLanguages || ['en'],
          ai_detail_level: 'concise',
        });

        if (insertError) {
          // 23505 = duplicate key (既に存在する場合)は無視
          if (insertError.code !== '23505') {
            console.error('ユーザーレコード作成エラー:', insertError);
          }
        }
      }
    } catch (error) {
      console.error('usersテーブル確認例外:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, needsInitialSetup, completeInitialSetup }}>
      {children}
    </AuthContext.Provider>
  );
}
