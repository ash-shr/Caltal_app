import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CONTACT_EMAIL, PRIVACY_URL } from '../../config';
import { colours } from '../../theme';

// The terms of use: the same words as the website's Terms page
// (frontend/src/TermsPage.jsx), so change both together, and the date with
// them. Written in plain English, but not reviewed by a lawyer.
const UPDATED = '21 October 2026';

const SECTIONS = [
  {
    heading: 'About Caltal',
    body:
      'Caltal is a task app that reminds you about tasks at a time, at a place, or both. It is ' +
      'available as a website (caltal.fly.dev) and a phone app, and is provided by Ashutosh Sharma, ' +
      'a developer based in the United Kingdom (“we”, “us”). By creating an account or using Caltal, ' +
      'you agree to these terms.',
  },
  {
    heading: 'Your account',
    body:
      'You need an account to use Caltal. You must give accurate details, including a valid email ' +
      'address, and keep your password confidential. You are responsible for activity on your account. ' +
      'Each account is for one person and must not be shared. We email you only about your account: to ' +
      'confirm your email address and, when you ask, to reset your password.',
  },
  {
    heading: 'Your content and privacy',
    body:
      'The tasks, places and voice notes you add to Caltal remain yours. You allow us to store and ' +
      'process them only so that we can provide Caltal to you. Our privacy policy explains what data ' +
      'we collect, including how your location is used, and the rights you have over it.',
  },
  {
    heading: 'Reminders are not guaranteed',
    body:
      'Phones limit what apps can do in the background, and the website can remind you only while it ' +
      'is open, so a reminder may arrive late or not at all: for example when your battery is low, you ' +
      'have no signal, or location services are off. Do not rely on Caltal for anything urgent, medical ' +
      'or safety-critical.',
  },
  {
    heading: 'Acceptable use',
    body:
      'You must not use Caltal to break the law, to harm others, to interfere with the service, or to ' +
      'try to access accounts or data that are not yours. We may suspend or close accounts used in ' +
      'this way.',
  },
  {
    heading: 'Availability and liability',
    body:
      'Caltal is provided “as is” and “as available”. We work to keep it reliable and secure, but we ' +
      'do not guarantee that it will always be available or free from errors, and we may change or ' +
      'withdraw features. As far as the law allows, we are not responsible for any loss caused by a ' +
      'missed or late reminder or by Caltal being unavailable. Nothing in these terms affects your ' +
      'statutory rights.',
  },
  {
    heading: 'Deleting your account',
    body:
      'You can delete your account at any time in Settings. This permanently removes your account and ' +
      'all of your tasks, saved places and voice notes from our servers.',
  },
  {
    heading: 'Changes to these terms',
    body:
      'We may update these terms from time to time. The date at the top shows when they last changed. ' +
      'If we make a significant change, we will let you know in Caltal before it takes effect.',
  },
  {
    heading: 'Governing law',
    body:
      'These terms are governed by the law of England and Wales. If you live in Scotland or Northern ' +
      'Ireland, you may also bring proceedings in your local courts.',
  },
  {
    heading: 'Contact',
    body:
      `Questions about these terms can be sent to ${CONTACT_EMAIL}. Caltal’s source code is ` +
      'public at github.com/ash-shr/Caltal_app.',
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

      <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} hitSlop={8}>
        <Text style={styles.link}>Read the privacy policy</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  updated: { fontSize: 13, color: colours.faint },
  section: { gap: 6 },
  heading: { fontSize: 16, fontWeight: '600', color: colours.ink },
  body: { fontSize: 15, color: colours.body, lineHeight: 22 },
  link: { fontSize: 15, color: colours.orange, fontWeight: '500' },
});
