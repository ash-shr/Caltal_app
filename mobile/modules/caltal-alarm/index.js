import { requireOptionalNativeModule } from 'expo';

// Caltal's own Android code for reminders that ring like an alarm
// (android/src/main/java/expo/modules/caltalalarm). null on iPhone, where the
// module doesn't exist and ordinary notifications are used instead.
//
//   replaceScheduled(alarms)   alarms: [{ id, at, title, body, taskId, hasVoiceNote }]
//                              `at` is a time in milliseconds (Date.getTime())
//   schedule(alarm)            add one, leaving the rest
//   cancelAll()
//   ringNow(alarm)             ring straight away
//   canRingFullScreen()        false on Android 14+ until the person allows it
//   openFullScreenSettings()   opens the switch that allows it
export default requireOptionalNativeModule('CaltalAlarm');
