package expo.modules.caltalalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings

// Makes a reminder ring: a notification that keeps sounding until it's
// answered, snoozed or dismissed, and that opens the full-screen ringing
// screen (RingActivity), over the lock screen if the phone is locked.
//
// After a minute with no answer it stops ringing and stays behind as an
// ordinary notification, like a missed call.
//
// During a call (a phone call, or WhatsApp and the like), Android won't let an
// alarm ring over it. So the reminder shows quietly instead and rings properly
// as soon as the call ends.
object Ringer {
  const val ACTION_QUIET = "expo.modules.caltalalarm.QUIET"
  const val ACTION_SNOOZE = "expo.modules.caltalalarm.SNOOZE"
  const val ACTION_DISMISS = "expo.modules.caltalalarm.DISMISS"
  const val ACTION_CLOSE_SCREEN = "expo.modules.caltalalarm.CLOSE_SCREEN"
  const val ACTION_AFTER_CALL = "expo.modules.caltalalarm.AFTER_CALL"
  const val EXTRA_ALARM = "alarm"
  // When a reminder started waiting for a call to end
  const val EXTRA_SINCE = "since"

  private const val CHANNEL_RINGING = "caltal_ringing"
  private const val CHANNEL_MISSED = "caltal_missed"
  private const val CHANNEL_WAITING = "caltal_waiting"

  private const val RING_FOR_MS = 60_000L
  const val SNOOZE_MS = 10 * 60_000L

  // While waiting for a call to end: how often to look, and when to give up
  // and leave it as a missed reminder
  private const val CALL_CHECK_MS = 15_000L
  private const val MAX_CALL_WAIT_MS = 2 * 60 * 60_000L

  const val ORANGE = 0xFFFB8A28.toInt()
  private val VIBRATION = longArrayOf(0, 800, 600, 800, 600)

  private fun notificationId(alarm: Alarm) = ("caltal-ring-" + alarm.id).hashCode()

  fun ring(context: Context, alarm: Alarm) {
    if (onCall(context)) {
      waitForCallToEnd(context, alarm, System.currentTimeMillis())
      return
    }

    val manager = notifications(context)
    createChannels(manager)

    val ringScreen = RingActivity.pendingIntent(context, alarm, answer = false)
    val builder = baseBuilder(context, CHANNEL_RINGING)
      .setContentTitle(alarm.title)
      .setContentText(alarm.body)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(ringScreen)
      // Shows RingActivity straight away when the phone is locked or asleep.
      // When someone is using the phone, Android shows a pop-up instead.
      .setFullScreenIntent(ringScreen, true)
      .addAction(action("Answer", RingActivity.pendingIntent(context, alarm, answer = true)))
      .addAction(action("Snooze", broadcast(context, ACTION_SNOOZE, alarm)))
      .addAction(action("Dismiss", broadcast(context, ACTION_DISMISS, alarm)))

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      // Before Android 8 there are no channels: sound and vibration go here
      setOldStyleSound(builder)
    }

    val notification = builder.build()
    // Keep repeating the sound until it's answered, snoozed or dismissed
    notification.flags = notification.flags or Notification.FLAG_INSISTENT
    manager.notify(notificationId(alarm), notification)

    AlarmScheduler.setExact(
      context,
      System.currentTimeMillis() + RING_FOR_MS,
      broadcast(context, ACTION_QUIET, alarm)
    )
  }

  // Shows the reminder without ringing, with the same Answer, Snooze and
  // Dismiss, then looks every 15 seconds to see whether the call has ended.
  private fun waitForCallToEnd(context: Context, alarm: Alarm, since: Long) {
    val manager = notifications(context)
    createChannels(manager)

    val waiting = baseBuilder(context, CHANNEL_WAITING)
      .setContentTitle(alarm.title)
      .setContentText("You're on a call. Caltal will ring when it ends.")
      .setCategory(Notification.CATEGORY_REMINDER)
      .setOngoing(true)
      .setAutoCancel(false)
      .setContentIntent(RingActivity.pendingIntent(context, alarm, answer = true))
      .addAction(action("Answer", RingActivity.pendingIntent(context, alarm, answer = true)))
      .addAction(action("Snooze", broadcast(context, ACTION_SNOOZE, alarm)))
      .addAction(action("Dismiss", broadcast(context, ACTION_DISMISS, alarm)))
      .build()
    manager.notify(notificationId(alarm), waiting)

    AlarmScheduler.setExact(
      context,
      System.currentTimeMillis() + CALL_CHECK_MS,
      afterCallIntent(context, alarm, since)
    )
  }

  // The 15-second look. Answered, snoozed or dismissed in the meantime: done.
  // Call over: ring now. Still on it: look again, for up to two hours.
  fun afterCall(context: Context, alarm: Alarm, since: Long) {
    val stillWaiting = notifications(context).activeNotifications.any {
      it.id == notificationId(alarm)
    }
    if (!stillWaiting) {
      return
    }

    val now = System.currentTimeMillis()
    when {
      !onCall(context) -> ring(context, alarm)
      now - since > MAX_CALL_WAIT_MS -> quieten(context, alarm)
      else -> AlarmScheduler.setExact(context, now + CALL_CHECK_MS, afterCallIntent(context, alarm, since))
    }
  }

  // Phone calls and internet calls (WhatsApp, Meet, Teams...) both take the
  // phone's audio out of its normal mode, and so does a call that's ringing.
  // Reading the mode needs no permission.
  private fun onCall(context: Context): Boolean {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    return audio.mode > AudioManager.MODE_NORMAL
  }

  // A minute with no answer: stop ringing, leave a quiet notification behind
  fun quieten(context: Context, alarm: Alarm) {
    val manager = notifications(context)
    val stillRinging = manager.activeNotifications.any { it.id == notificationId(alarm) }
    if (!stillRinging) {
      return
    }
    createChannels(manager)

    val missed = baseBuilder(context, CHANNEL_MISSED)
      .setContentTitle(alarm.title)
      .setContentText("Caltal rang about this. Tap to open it.")
      .setAutoCancel(true)
      .setContentIntent(RingActivity.pendingIntent(context, alarm, answer = true))
      .build()
    manager.notify(notificationId(alarm), missed)
    closeRingScreen(context)
  }

  // closeScreen is false when the ringing screen itself is answering, so it
  // can carry on (it may need the phone unlocked first)
  fun stop(context: Context, alarm: Alarm, closeScreen: Boolean = true) {
    notifications(context).cancel(notificationId(alarm))
    AlarmScheduler.cancelOperation(context, broadcast(context, ACTION_QUIET, alarm))
    AlarmScheduler.cancelOperation(context, afterCallIntent(context, alarm, 0L))
    if (closeScreen) {
      closeRingScreen(context)
    }
  }

  fun snooze(context: Context, alarm: Alarm) {
    stop(context, alarm)
    val id = if (alarm.id.startsWith(AlarmScheduler.SNOOZE_PREFIX)) {
      alarm.id
    } else {
      AlarmScheduler.SNOOZE_PREFIX + alarm.id
    }
    AlarmScheduler.schedule(
      context,
      alarm.copy(id = id, at = System.currentTimeMillis() + SNOOZE_MS)
    )
  }

  // Android 14 and later only lets an app fill the screen over the lock
  // screen if the person allows it (Settings > Apps > Caltal). Without it,
  // reminders still ring, as a pop-up notification.
  fun canRingFullScreen(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return true
    }
    return notifications(context).canUseFullScreenIntent()
  }

  private fun closeRingScreen(context: Context) {
    context.sendBroadcast(Intent(ACTION_CLOSE_SCREEN).setPackage(context.packageName))
  }

  private fun notifications(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun createChannels(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    if (manager.getNotificationChannel(CHANNEL_RINGING) == null) {
      val ringing = NotificationChannel(
        CHANNEL_RINGING,
        "Ringing reminders",
        NotificationManager.IMPORTANCE_HIGH
      )
      ringing.description = "Reminders that ring like an alarm until you answer them"
      // The alarm sound, played as an alarm: it rings even when the phone is
      // on silent, like an alarm clock does
      ringing.setSound(
        alarmSound(),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      ringing.enableVibration(true)
      ringing.vibrationPattern = VIBRATION
      ringing.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      manager.createNotificationChannel(ringing)
    }

    if (manager.getNotificationChannel(CHANNEL_WAITING) == null) {
      val waiting = NotificationChannel(
        CHANNEL_WAITING,
        "Reminders during a call",
        NotificationManager.IMPORTANCE_HIGH
      )
      waiting.description =
        "A ringing reminder that came while you were on a call. It rings once the call ends."
      waiting.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      manager.createNotificationChannel(waiting)
    }

    if (manager.getNotificationChannel(CHANNEL_MISSED) == null) {
      val missed = NotificationChannel(
        CHANNEL_MISSED,
        "Missed ringing reminders",
        NotificationManager.IMPORTANCE_DEFAULT
      )
      missed.description = "A ringing reminder that wasn't answered"
      missed.setSound(null, null)
      manager.createNotificationChannel(missed)
    }
  }

  private fun alarmSound(): Uri =
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      ?: Settings.System.DEFAULT_NOTIFICATION_URI

  private fun baseBuilder(context: Context, channel: String): Notification.Builder {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, channel)
    } else {
      oldStyleBuilder(context)
    }
    return builder
      .setSmallIcon(smallIcon(context))
      .setColor(ORANGE)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true)
  }

  @Suppress("DEPRECATION")
  private fun oldStyleBuilder(context: Context) = Notification.Builder(context)

  @Suppress("DEPRECATION")
  private fun setOldStyleSound(builder: Notification.Builder) {
    builder
      .setPriority(Notification.PRIORITY_MAX)
      .setSound(alarmSound(), AudioManager.STREAM_ALARM)
      .setVibrate(VIBRATION)
  }

  // The white orange-with-a-leaf icon the app's reminders use (made by
  // expo-notifications from assets/notification-icon.png)
  private fun smallIcon(context: Context): Int {
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (icon != 0) icon else context.applicationInfo.icon
  }

  private fun action(title: String, intent: PendingIntent): Notification.Action =
    Notification.Action.Builder(null as Icon?, title, intent).build()

  // The 15-second look while waiting for a call to end. Android tells two
  // PendingIntents apart by their address, not their extras, so this one
  // cancels the look whatever `since` it was set with.
  private fun afterCallIntent(context: Context, alarm: Alarm, since: Long): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(ACTION_AFTER_CALL)
      .setData(Uri.parse("caltal-alarm://after_call/" + Uri.encode(alarm.id)))
      .putExtra(EXTRA_ALARM, alarm.toJson())
      .putExtra(EXTRA_SINCE, since)
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun broadcast(context: Context, action: String, alarm: Alarm): PendingIntent {
    val kind = action.substringAfterLast('.').lowercase()
    val intent = Intent(context, AlarmReceiver::class.java)
      .setAction(action)
      .setData(Uri.parse("caltal-alarm://" + kind + "/" + Uri.encode(alarm.id)))
      .putExtra(EXTRA_ALARM, alarm.toJson())
    return PendingIntent.getBroadcast(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
