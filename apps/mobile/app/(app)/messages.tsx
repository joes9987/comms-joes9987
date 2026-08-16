import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'

const WEB_CHAT_URL = 'https://comms-joes9987.vercel.app'

export default function MessagesScreen () {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Channels live on the web</Text>
        <Text style={styles.body}>
          This mobile stub does not reimplement channels or DMs. Open EudaChat on the web for full chat, announcements, and search.
        </Text>
        <Pressable
          onPress={() => {
            void Linking.openURL(WEB_CHAT_URL)
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Open EudaChat</Text>
        </Pressable>
        <Text style={styles.url}>{WEB_CHAT_URL}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#eef2f7',
    padding: 16,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a'
  },
  body: {
    color: '#475569',
    lineHeight: 22
  },
  button: {
    backgroundColor: '#0891b2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  url: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center'
  }
})
