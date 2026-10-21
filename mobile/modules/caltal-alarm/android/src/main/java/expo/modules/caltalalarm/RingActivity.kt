package expo.modules.caltalalarm

import android.app.Activity
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

// The full-screen ringing screen: the task's name in big letters on Caltal's
// orange, with Answer, Snooze and Dismiss. Shown over the lock screen.
//
// Answer opens Caltal on the task (unlocking first if needed) and plays its
// voice note if it has one. Opened with answer = true (from the notification's
// Answer button), it does that straight away without showing itself.
class RingActivity : Activity() {
  private var alarm: Alarm? = null
  private var listening = false

  // Told to close when the reminder is dealt with somewhere else (from the
  // notification, or when its minute of ringing runs out)
  private val closer = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    showOverLockScreen()
    handle(intent)
  }

  // A second reminder ringing while this screen is up replaces the first
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handle(intent)
  }

  override fun onDestroy() {
    stopListening()
    super.onDestroy()
  }

  private fun handle(intent: Intent) {
    val alarm = Alarm.fromJson(intent.getStringExtra(Ringer.EXTRA_ALARM))
    if (alarm == null) {
      finish()
      return
    }
    this.alarm = alarm

    if (intent.getBooleanExtra(EXTRA_ANSWER, false)) {
      answer(alarm)
      return
    }

    setContentView(screen(alarm))
    startListening()
  }

  private fun answer(alarm: Alarm) {
    stopListening()
    Ringer.stop(this, alarm, closeScreen = false)

    val keyguard = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard.isKeyguardLocked) {
      // Caltal itself only opens once the phone is unlocked
      keyguard.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
        override fun onDismissSucceeded() {
          openApp(alarm)
        }

        override fun onDismissCancelled() {
          finish()
        }

        override fun onDismissError() {
          openApp(alarm)
        }
      })
    } else {
      openApp(alarm)
    }
  }

  // caltal://?task=12&play=1 : the home screen opens task 12 and plays its
  // voice note if it has one. (It checks for itself: a note may have been
  // added since this reminder was set.)
  private fun openApp(alarm: Alarm) {
    var link = "caltal://"
    if (alarm.taskId != null) {
      link += "?task=" + alarm.taskId + "&play=1"
    }

    val view = Intent(Intent.ACTION_VIEW, Uri.parse(link))
      .setPackage(packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      startActivity(view)
    } catch (error: ActivityNotFoundException) {
      packageManager.getLaunchIntentForPackage(packageName)?.let {
        startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
    finish()
  }

  private fun snooze(alarm: Alarm) {
    stopListening()
    Ringer.snooze(this, alarm)
    finish()
  }

  private fun dismiss(alarm: Alarm) {
    stopListening()
    Ringer.stop(this, alarm)
    finish()
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    window.decorView.setBackgroundColor(Ringer.ORANGE)
  }

  private fun startListening() {
    if (listening) {
      return
    }
    val filter = IntentFilter(Ringer.ACTION_CLOSE_SCREEN)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(closer, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(closer, filter)
    }
    listening = true
  }

  private fun stopListening() {
    if (listening) {
      unregisterReceiver(closer)
      listening = false
    }
  }

  // Built in code rather than an XML layout: it's one simple screen
  private fun screen(alarm: Alarm): View {
    val root = LinearLayout(this)
    root.orientation = LinearLayout.VERTICAL
    root.gravity = Gravity.CENTER_HORIZONTAL
    root.setBackgroundColor(Ringer.ORANGE)
    root.setPadding(dp(28), dp(120), dp(28), dp(56))

    root.addView(text("Caltal reminder", 16f, Color.argb(220, 255, 255, 255), bold = false))

    val title = text(alarm.title, 34f, Color.WHITE, bold = true)
    title.setPadding(0, dp(16), 0, dp(12))
    root.addView(title)

    if (alarm.body.isNotEmpty()) {
      root.addView(text(alarm.body, 17f, Color.argb(235, 255, 255, 255), bold = false))
    }
    if (alarm.hasVoiceNote) {
      val hint = text("Answer to hear your voice note", 15f, Color.argb(200, 255, 255, 255), bold = false)
      hint.setPadding(0, dp(12), 0, 0)
      root.addView(hint)
    }

    // Pushes the buttons to the bottom of the screen
    root.addView(View(this), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

    root.addView(button("Answer", Color.WHITE, INK) { answer(alarm) })
    root.addView(button("Snooze 10 minutes", Color.argb(60, 255, 255, 255), Color.WHITE) { snooze(alarm) })
    root.addView(button("Dismiss", Color.TRANSPARENT, Color.WHITE) { dismiss(alarm) })
    return root
  }

  private fun text(value: String, size: Float, colour: Int, bold: Boolean): TextView {
    val view = TextView(this)
    view.text = value
    view.textSize = size
    view.setTextColor(colour)
    view.gravity = Gravity.CENTER
    if (bold) {
      view.typeface = Typeface.DEFAULT_BOLD
    }
    return view
  }

  private fun button(label: String, background: Int, textColour: Int, onPress: () -> Unit): Button {
    val shape = GradientDrawable()
    shape.cornerRadius = dp(28).toFloat()
    shape.setColor(background)

    val view = Button(this)
    view.text = label
    view.setAllCaps(false)
    view.textSize = 17f
    view.setTextColor(textColour)
    view.background = shape
    view.stateListAnimator = null
    view.setOnClickListener { onPress() }

    val layout = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56))
    layout.topMargin = dp(12)
    view.layoutParams = layout
    return view
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  companion object {
    const val EXTRA_ANSWER = "answer"
    private val INK = Color.rgb(41, 37, 36)

    fun pendingIntent(context: Context, alarm: Alarm, answer: Boolean): PendingIntent {
      val kind = if (answer) "answer" else "ring"
      val intent = Intent(context, RingActivity::class.java)
        .setData(Uri.parse("caltal-alarm://" + kind + "/" + Uri.encode(alarm.id)))
        .putExtra(Ringer.EXTRA_ALARM, alarm.toJson())
        .putExtra(EXTRA_ANSWER, answer)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      return PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
