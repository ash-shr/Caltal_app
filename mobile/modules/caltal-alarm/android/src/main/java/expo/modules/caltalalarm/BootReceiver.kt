package expo.modules.caltalalarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Android forgets scheduled alarms when the phone restarts. This puts back the
// ones still to come (and after an app update, to be safe). It also sets them
// again when the person allows exact alarms, so ones set while it was off,
// as inexact, become exact.
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED ->
        AlarmScheduler.restoreAll(context)
    }
  }
}
