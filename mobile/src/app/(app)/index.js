import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import DayTasks from '../../components/DayTasks';
import MonthCalendar from '../../components/MonthCalendar';
import PlaceRemindersBanner from '../../components/PlaceRemindersBanner';
import ProfileMenu from '../../components/ProfileMenu';
import SavePlaceModal from '../../components/SavePlaceModal';
import SearchBar from '../../components/SearchBar';
import TaskDetail from '../../components/TaskDetail';
import TaskForm from '../../components/TaskForm';
import TaskMap from '../../components/TaskMap';
import { PRIVACY_URL } from '../../config';
import { longDay, shortTime, today } from '../../dates';
import { savedPlaceAt, usePlaces } from '../../places';
import { useSession } from '../../session';
import { useSettings } from '../../settings';
import { hasPlace, useTasks } from '../../tasks';
import { colours, floating } from '../../theme';

// Whether the link Caltal was opened with has been dealt with (see
// openLinkedTask). Kept outside the component: it's once per app start.
let initialLinkHandled = false;

// How tall the sheet can be, as a share of the screen: peeking, half, full.
const SNAP_FRACTIONS = [0.16, 0.5, 0.92];
const SNAP_POINTS = SNAP_FRACTIONS.map(fraction => `${fraction * 100}%`);
const HALF = 1;

// Dragging the sheet only starts once a finger has moved 10 points up or down,
// and a sideways move of 10 points rules it out. Without these, the sheet
// grabbed every drag inside it, so the radius slider in the task form could
// be tapped but not slid on Android.
const SHEET_ACTIVE_Y = [-10, 10];
const SHEET_FAIL_X = [-10, 10];

// A blank task for the form, optionally already pinned somewhere. Whether it
// has a time and whether it has a place are two separate switches; the
// reminder type is worked out from them when it's saved.
function newDraft(date, radius, place) {
  return {
    taskId: null,
    name: '',
    date,
    timeOn: false,
    remindAt: '',
    placeOn: place != null,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    radius,
    trigger: null,
    voiceNote: null,
    hadVoiceNote: false,
  };
}

function draftFromTask(task, defaultRadius) {
  return {
    taskId: task.id,
    name: task.name,
    date: task.dueDate,
    timeOn: task.remindAt != null,
    remindAt: shortTime(task.remindAt),
    placeOn: hasPlace(task),
    latitude: task.latitude,
    longitude: task.longitude,
    radius: task.radius ?? defaultRadius,
    trigger:
      task.triggerLatitude != null
        ? {
            latitude: task.triggerLatitude,
            longitude: task.triggerLongitude,
            radius: task.triggerRadius,
          }
        : null,
    // The saved note, if there is one: no file on this phone (fileUri null),
    // it plays from the server
    voiceNote: task.voiceNoteMs != null ? { durationMs: task.voiceNoteMs, fileUri: null } : null,
    hadVoiceNote: task.voiceNoteMs != null,
  };
}

// After the task itself is saved: upload a new recording, or delete the note
// if it was removed. A saved note that wasn't touched stays as it is.
async function applyVoiceNote(taskId, draft, { saveVoiceNote, removeVoiceNote }) {
  if (draft.voiceNote?.fileUri) {
    await saveVoiceNote(taskId, draft.voiceNote.fileUri, draft.voiceNote.durationMs);
  } else if (draft.voiceNote == null && draft.hadVoiceNote) {
    await removeVoiceNote(taskId);
  }
}

// The home screen: the map fills the screen, and everything else sits on top
// of it — the search bar and profile button at the top, and a sheet at the
// bottom that holds the calendar, a task's details, or the task form.
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, signOut, homeReady } = useSession();
  const { settings } = useSettings();
  const {
    tasks,
    loading,
    error,
    refresh,
    create,
    update,
    complete,
    remove,
    saveVoiceNote,
    removeVoiceNote,
  } = useTasks();
  const { places } = usePlaces();

  // The splash stays up after sign-in until the tasks are here, so the map
  // doesn't appear empty and then fill in.
  useEffect(() => {
    if (!loading) {
      homeReady();
    }
  }, [loading, homeReady]);

  const map = useRef(null);
  const sheet = useRef(null);

  // What the sheet shows: 'calendar', 'task' (one task's details) or 'form'
  const [mode, setMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [searched, setSearched] = useState(null);
  // The spot being saved as a place, while the "Save this place" box is open
  const [savingSpot, setSavingSpot] = useState(null);
  const [placeBannerHidden, setPlaceBannerHidden] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(HALF);
  const [menuOpen, setMenuOpen] = useState(false);
  const [canShowLocation, setCanShowLocation] = useState(false);
  // The task whose voice note should start by itself (after answering a
  // ringing reminder)
  const [autoPlayId, setAutoPlayId] = useState(null);

  const selectedTask = tasks.find(task => task.id === selectedId) ?? null;

  // Calendar dots: orange if anything that day is still to do, grey if done.
  const marks = useMemo(() => {
    const result = {};
    for (const task of tasks) {
      if (!task.complete) {
        result[task.dueDate] = 'open';
      } else if (!result[task.dueDate]) {
        result[task.dueDate] = 'done';
      }
    }
    return result;
  }, [tasks]);

  const dayTasks = tasks.filter(task => task.dueDate === selectedDate);

  // Worth nagging about only if there's something with a place still to do
  const showPlaceBanner =
    !placeBannerHidden &&
    !settings.placeReminders &&
    tasks.some(task => !task.complete && hasPlace(task));

  // Ask for "while using the app" location once, so the map can start where
  // the person is and show the blue dot. Background location is only asked
  // for if they turn on place reminders in Settings.
  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        return;
      }
      setCanShowLocation(true);

      const here = await Location.getLastKnownPositionAsync();
      if (here) {
        map.current?.flyTo(here.coords.latitude, here.coords.longitude, {
          zoom: 14,
          bottomInset: Dimensions.get('window').height * SNAP_FRACTIONS[HALF],
        });
      }
    })().catch(() => {});
  }, []);

  // Move the map so a point sits in the visible part above the sheet. If the
  // sheet is pulled up to full screen, lower it first so the map can be seen.
  const showOnMap = useCallback(
    (latitude, longitude, zoom = 15) => {
      const index = Math.min(sheetIndex, HALF);
      if (sheetIndex > HALF) {
        sheet.current?.snapToIndex(HALF);
      }
      map.current?.flyTo(latitude, longitude, {
        zoom,
        bottomInset: height * SNAP_FRACTIONS[index],
      });
    },
    [sheetIndex, height],
  );

  // ---- Moving between calendar, task and form ----

  // play: start its voice note straight away (from a ringing reminder)
  const openTask = (task, { play = false } = {}) => {
    Keyboard.dismiss();
    setAutoPlayId(play && task.voiceNoteMs != null ? task.id : null);
    setSelectedId(task.id);
    setSelectedDate(task.dueDate);
    setMode('task');
    if (hasPlace(task)) {
      showOnMap(task.latitude, task.longitude);
    } else if (sheetIndex < HALF) {
      sheet.current?.snapToIndex(HALF);
    }
  };

  // Answering a ringing reminder opens Caltal with caltal://?task=12&play=1:
  // show that task, and play its voice note if it has one. The task list is
  // loaded fresh first, so a task added on the website a moment ago is there.
  const openLinkedTask = useEffectEvent(url => {
    const taskId = /[?&]task=(\d+)/.exec(url)?.[1];
    if (!taskId) {
      return;
    }
    const play = /[?&]play=1\b/.test(url);
    refresh().then(latest => {
      const task = (latest ?? tasks).find(candidate => String(candidate.id) === taskId);
      if (task) {
        openTask(task, { play });
      }
    });
  });

  useEffect(() => {
    // The link Caltal was started with, if it was closed. Only once: the home
    // screen can appear again (after signing in again) in the same session.
    if (!initialLinkHandled) {
      initialLinkHandled = true;
      Linking.getInitialURL()
        .then(url => url && openLinkedTask(url))
        .catch(() => {});
    }
    // Links that arrive while Caltal is already open
    const subscription = Linking.addEventListener('url', ({ url }) => openLinkedTask(url));
    return () => subscription.remove();
  }, []);

  const backToCalendar = () => {
    setMode('calendar');
    setSelectedId(null);
    setDraft(null);
  };

  const startNewTask = place => {
    setDraft(newDraft(selectedDate, settings.defaultRadius, place));
    setSelectedId(null);
    setSearched(null);
    setMode('form');
    sheet.current?.snapToIndex(HALF);
  };

  const startEditing = task => {
    setDraft(draftFromTask(task, settings.defaultRadius));
    setMode('form');
    sheet.current?.snapToIndex(HALF);
  };

  const cancelForm = () => {
    Keyboard.dismiss();
    if (draft?.taskId != null) {
      setMode('task');
    } else {
      setMode('calendar');
    }
    setDraft(null);
  };

  const saveForm = async payload => {
    const editing = draft.taskId != null;
    const saved = editing ? await update(draft.taskId, payload) : await create(payload);

    try {
      await applyVoiceNote(saved.id, draft, { saveVoiceNote, removeVoiceNote });
    } catch (failure) {
      // The task is saved even though its note isn't. The form stays open to
      // try again, now editing that task, so a retry can't add a second one.
      setDraft(current => ({ ...current, taskId: saved.id }));
      throw new Error(`The task is saved, but its voice note isn't: ${failure.message}`);
    }

    if (editing) {
      setSelectedId(saved.id);
      setSelectedDate(saved.dueDate);
      setMode('task');
    } else {
      setSelectedDate(saved.dueDate);
      setMode('calendar');
    }
    Keyboard.dismiss();
    setDraft(null);
  };

  const changeDraft = changes => setDraft(current => ({ ...current, ...changes }));

  // Gives the task being edited a place at this spot, switching its place
  // part on if it was off.
  const pinDraftAt = place =>
    changeDraft({ placeOn: true, latitude: place.latitude, longitude: place.longitude });

  // ---- The map ----

  const pressMap = place => {
    // With the keyboard up, a tap on the map is usually just "put the keyboard
    // away", so that's all the first tap does.
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    // While the form is open, a tap on the map gives the task a place there
    // (adding one if it had none). Otherwise a tap on empty map lets go of the
    // last search result.
    if (mode === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(null);
    }
  };

  // Press and hold anywhere to start a task right there.
  const holdMap = place => {
    if (mode !== 'form') {
      startNewTask(place);
    }
  };

  // Returns whether the tap was used, so TaskMap knows whether the map
  // should get it as well.
  const pressPin = id => {
    const task = tasks.find(candidate => candidate.id === id);
    if (!task) {
      return false;
    }
    if (mode !== 'form') {
      openTask(task);
      return true;
    }
    // In the form, a pin is a place like any other: put the new pin on it.
    // If a saved place is there too (often hidden under the task's pin),
    // use its exact spot so the form knows it's that place.
    if (hasPlace(task)) {
      pinDraftAt(savedPlaceAt(places, task.latitude, task.longitude) ?? task);
      return true;
    }
    return false;
  };

  // A saved place's dot on the map: in the form it moves the pin there,
  // otherwise it's picked just like a search result.
  const pressPlace = id => {
    const place = places.find(candidate => candidate.id === id);
    if (!place) {
      return false;
    }
    Keyboard.dismiss();
    if (mode === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(place);
    }
    showOnMap(place.latitude, place.longitude, 16);
    return true;
  };

  // ---- Search ----

  const getNear = useCallback(async () => {
    try {
      return await map.current.centre();
    } catch {
      return null;
    }
  }, []);

  const choosePlace = place => {
    if (mode === 'form') {
      pinDraftAt(place);
    } else {
      setSearched(place);
    }
    showOnMap(place.latitude, place.longitude, 16);
  };

  // A chip in the task form: pin the task at that saved place
  const pickPlaceForTask = place => {
    pinDraftAt(place);
    showOnMap(place.latitude, place.longitude, 16);
  };

  // Offered for a search result that isn't saved yet
  const searchedIsSaved =
    searched !== null && savedPlaceAt(places, searched.latitude, searched.longitude) !== null;

  // ---- Profile menu ----

  const goTo = path => {
    setMenuOpen(false);
    router.push(path);
  };

  const confirmSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  return (
    <View style={styles.screen}>
      <TaskMap
        ref={map}
        tasks={tasks}
        selectedId={mode === 'task' ? selectedId : null}
        draft={mode === 'form' ? draft : null}
        searched={searched}
        showUser={canShowLocation}
        attributionTop={insets.top + 124}
        onPress={pressMap}
        onLongPress={holdMap}
        onPinPress={pressPin}
        places={places}
        onPlacePress={pressPlace}
      />

      {/* box-none: this row's own empty space lets touches through to the map */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            accessibilityLabel="Caltal"
          />

          <SearchBar
            getNear={getNear}
            saved={places}
            onSelect={choosePlace}
            onFocus={() => {
              // Lower the sheet so the results aren't hidden behind it
              if (sheetIndex > 0) {
                sheet.current?.snapToIndex(0);
              }
            }}
            onClear={() => setSearched(null)}
          />

          <Pressable
            onPress={() => setMenuOpen(true)}
            style={styles.avatarButton}
            accessibilityLabel="Open profile menu"
          >
            <Avatar name={user?.name} size={44} />
          </Pressable>
        </View>

        <View style={styles.secondRow} pointerEvents="box-none">
          {searched && mode !== 'form' ? (
            <View style={styles.chipRow} pointerEvents="box-none">
              <Pressable
                onPress={() => startNewTask(searched)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.chipText}>Add a task here</Text>
              </Pressable>

              {!searchedIsSaved && (
                <Pressable
                  onPress={() => setSavingSpot(searched)}
                  style={({ pressed }) => [styles.lightChip, pressed && styles.pressed]}
                >
                  <Ionicons name="bookmark-outline" size={16} color={colours.ink} />
                  <Text style={styles.lightChipText}>Save place</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View />
          )}

          {canShowLocation && (
            <Pressable
              onPress={() =>
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                  .then(here => showOnMap(here.coords.latitude, here.coords.longitude))
                  .catch(() => {})
              }
              style={styles.roundButton}
              accessibilityLabel="Show where I am"
            >
              <Ionicons name="navigate" size={18} color={colours.ink} />
            </Pressable>
          )}
        </View>
      </View>

      <BottomSheet
        ref={sheet}
        index={HALF}
        snapPoints={SNAP_POINTS}
        enableDynamicSizing={false}
        onChange={index => setSheetIndex(index)}
        activeOffsetY={SHEET_ACTIVE_Y}
        failOffsetX={SHEET_FAIL_X}
        style={floating}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.sheet}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'calendar' && (
            <>
              {showPlaceBanner && (
                <PlaceRemindersBanner onHide={() => setPlaceBannerHidden(true)} />
              )}

              <MonthCalendar selected={selectedDate} onSelect={setSelectedDate} marks={marks} />

              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{longDay(selectedDate)}</Text>
                <Pressable
                  onPress={() => startNewTask(null)}
                  style={styles.addButton}
                  accessibilityLabel="Add a task on this day"
                >
                  <Ionicons name="add" size={22} color="#ffffff" />
                </Pressable>
              </View>

              {error !== '' ? (
                <Pressable onPress={refresh}>
                  <Text style={styles.error}>
                    {`Couldn't load your tasks: ${error} Tap to try again.`}
                  </Text>
                </Pressable>
              ) : (
                <DayTasks
                  tasks={dayTasks}
                  onOpen={openTask}
                  onComplete={task => complete(task.id).catch(() => {})}
                />
              )}
            </>
          )}

          {mode === 'task' && selectedTask && (
            <TaskDetail
              task={selectedTask}
              autoPlay={autoPlayId === selectedTask.id}
              onAutoPlayed={() => setAutoPlayId(null)}
              onBack={backToCalendar}
              onEdit={() => startEditing(selectedTask)}
              onComplete={() => complete(selectedTask.id)}
              onDelete={async () => {
                await remove(selectedTask.id);
                backToCalendar();
              }}
              onShowOnMap={() => showOnMap(selectedTask.latitude, selectedTask.longitude)}
            />
          )}

          {mode === 'form' && draft && (
            <TaskForm
              draft={draft}
              onChange={changeDraft}
              onSubmit={saveForm}
              onCancel={cancelForm}
              placeRemindersOn={settings.placeReminders}
              places={places}
              onPickPlace={pickPlaceForTask}
              onSavePlace={() =>
                setSavingSpot({ latitude: draft.latitude, longitude: draft.longitude })
              }
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      <ProfileMenu
        visible={menuOpen}
        user={user}
        onClose={() => setMenuOpen(false)}
        onSettings={() => goTo('/settings')}
        onTerms={() => goTo('/terms')}
        onPlaces={() => goTo('/places')}
        onPrivacy={() => {
          // The policy lives on the website, so it opens in the browser
          setMenuOpen(false);
          Linking.openURL(PRIVACY_URL).catch(() => {});
        }}
        onSignOut={confirmSignOut}
      />

      {savingSpot && (
        <SavePlaceModal
          spot={savingSpot}
          onClose={() => setSavingSpot(null)}
          onSaved={saved => {
            // If it was the searched spot, it's a saved place now
            if (searched && savedPlaceAt([saved], searched.latitude, searched.longitude)) {
              setSearched(saved);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logo: { width: 48, height: 48 },
  avatarButton: { borderRadius: 24, ...floating },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 58,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colours.ink,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...floating,
  },
  chipText: { color: '#ffffff', fontSize: 14, fontWeight: '500' },
  chipRow: { flexDirection: 'row', gap: 8 },
  lightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colours.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...floating,
  },
  lightChipText: { color: colours.ink, fontSize: 14, fontWeight: '500' },
  pressed: { opacity: 0.85 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...floating,
  },
  sheet: { backgroundColor: colours.background, borderRadius: 24 },
  handle: { backgroundColor: colours.border, width: 44 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: colours.faint, textTransform: 'uppercase' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colours.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 14, color: colours.danger, lineHeight: 20 },
});
