import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { isSupabaseConfigured, requireSupabase } from '../src/lib/supabase'

const REVIEWER_EMAIL = 'eudachat-reviewer@example.com'
const REVIEWER_PASSWORD = 'EudaChat-Review-2026'

export default function LoginScreen () {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    isSupabaseConfigured()
      ? null
      : 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (same shared project as the web app).'
  )
  const [loading, setLoading] = useState(false)

  async function handleSignIn () {
    if (!isSupabaseConfigured()) return
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (signInError) setError(signInError.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>EudaChat</Text>
        <Text style={styles.subtitle}>
          Sign in with the same cohort account as the web app. English is the default language; Trinidadian Creole is opt-in later.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          autoComplete="password"
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <Text role="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          disabled={loading || !isSupabaseConfigured()}
          onPress={handleSignIn}
          style={[styles.button, (loading || !isSupabaseConfigured()) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{loading ? 'Please wait…' : 'Sign in'}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setEmail(REVIEWER_EMAIL)
            setPassword(REVIEWER_PASSWORD)
          }}
        >
          <Text style={styles.hint}>
            Peer reviewer demo:{' '}
            <Text style={styles.mono}>{REVIEWER_EMAIL}</Text>
            {' / '}
            <Text style={styles.mono}>{REVIEWER_PASSWORD}</Text>
            {' · tap to fill'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 10
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    color: '#475569',
    marginBottom: 8,
    lineHeight: 20
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.28)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff'
  },
  error: {
    color: '#b91c1c',
    fontSize: 13
  },
  button: {
    backgroundColor: '#0891b2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: '#0f172a'
  }
})
