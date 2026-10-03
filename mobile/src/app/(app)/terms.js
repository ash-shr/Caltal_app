import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colours } from '../../theme';

// Basic placeholder terms in plain English. Before Caltal goes on the App Store
// or Google Play, these need replacing with properly written terms and a
// privacy policy.
const UPDATED = '2 October 2026';

const SECTIONS = [
  {
    heading: 'About Caltal',
    body:
      'Caltal is a personal project that reminds you about tasks at a time, at a place, or both. ' +
      'It is still being built, and it is provided as it is, without any guarantee that it will ' +
      'always work or always be available.',
  },
  {
    heading: 'Your account',
    body:
      'You need an account to use Caltal. Please give a real email address and keep your password ' +
      'to yourself. You are responsible for what happens on your account. One account is for one person.',
  },
  {
    heading: 'Your tasks and your location',
    body:
      'Caltal stores the tasks you create, including their names, dates, times and any places you pin ' +
      'on the map. Your phone checks your location itself to know when you reach one of those places — ' +
      'your live location is not sent to or stored on Caltal’s server.',
  },
  {
    heading: 'Reminders are not guaranteed',
    body:
      'Phones limit what apps can do in the background, so a reminder can arrive late or not at all — ' +
      'for example with low battery, no signal, or location turned off. Please don’t rely on Caltal ' +
      'for anything urgent, medical or safety-related.',
  },
  {
    heading: 'Using Caltal fairly',
    body:
      'Don’t use Caltal to break the law, to harm anyone, or to try to get into accounts or data ' +
      'that aren’t yours. Accounts used this way may be removed.',
  },
  {
    heading: 'Deleting your account',
    body:
      'You can delete your account at any time in Settings. This permanently removes your account and ' +
      'all of your tasks from Caltal’s server.',
  },
  {
    heading: 'Changes to these terms',
    body:
      'These terms may change as Caltal grows. The date at the top shows when they last changed.',
  },
  {
    heading: 'Questions',
    body: 'Caltal’s code is open at github.com/ash-shr/Caltal_app, where you can raise an issue.',
  },
];

export default function Terms() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.updated}>Last updated {UPDATED}</Text>

      {SECTIONS.map((section, index) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>
            {index + 1}. {section.heading}
          </Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  updated: { fontSize: 13, color: colours.faint },
  section: { gap: 6 },
  heading: { fontSize: 16, fontWeight: '600', color: colours.ink },
  body: { fontSize: 15, color: colours.body, lineHeight: 22 },
});
