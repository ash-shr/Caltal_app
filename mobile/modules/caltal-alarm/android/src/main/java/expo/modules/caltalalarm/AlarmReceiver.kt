package expo.modules.caltalalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Everything that happens to a ringing reminder without the ringing screen:
// it comes due, its minute of ringing ends, a call it was waiting for may have
// ended, or Snooze / Dismiss is pressed on the notification.
class AlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      AlarmScheduler.ACTION_FIRE -> {
        val id = intent.getStringExtra(AlarmScheduler.EXTRA_ID) ?: return
        val alarm = AlarmStore.get(context, id) ?: return
        AlarmStore.remove(context, id)
        Ringer.ring(context, alarm)
      }
      Ringer.ACTION_QUIET -> alarmFrom(intent)?.let { Ringer.quieten(context, it) }
      Ringer.ACTION_AFTER_CALL -> alarmFrom(intent)?.let {
        Ringer.afterCall(context, it, intent.getLongExtra(Ringer.EXTRA_SINCE, System.currentTimeMillis()))
      }
      Ringer.ACTION_SNOOZE -> alarmFrom(intent)?.let { Ringer.snooze(context, it) }
      Ringer.ACTION_DISMISS -> alarmFrom(intent)?.let { Ringer.stop(context, it) }
    }
  }

  private fun alarmFrom(intent: Intent): Alarm? =
    Alarm.fromJson(intent.getStringExtra(Ringer.EXTRA_ALARM))
}
