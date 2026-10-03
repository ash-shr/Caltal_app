import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
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
import ProfileMenu from '../../components/ProfileMenu';
import SearchBar from '../../components/SearchBar';
import TaskDetail from '../../components/TaskDetail';
import TaskForm, { needsPlace } from '../../components/TaskForm';
import TaskMap from '../../components/TaskMap';
import { longDay, shortTime, today } from '../../dates';
import { useSession } from '../../session';
import { useSettings } from '../../settings';
import { hasPlace, useTasks } from '../../tasks';
import { colours, floating } from '../../theme';

// How tall the sheet can be, as a share of the screen: peeking, half, full.
const SNAP_FRACTIONS = [0.16, 0.5, 0.92];
const SNAP_POINTS = SNAP_FRACTIONS.map(fraction => `${fraction * 100}%`);
const HALF = 1;

// A blank task for the form, optionally already pinned somewhere.
function newDraft(date, radius, place) {
  return {
    taskId: null,
    name: '',
    date,
    reminderType: 'LOCATION',
    remindAt: '',
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    radius,
    trigger: null,
  };
}

function draftFromTask(task, defaultRadius) {
  return {
    taskId: task.id,
    name: task.name,
    date: task.dueDate,
    reminderType: task.reminderType ?? 'LOCATION',
    remindAt: shortTime(task.remindAt),
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
  };
}

// The home screen: the map fills the screen, and everything else sits on top
// of it — the search bar and profile button at the top, and a sheet at the
// bottom that holds the calendar, a task's details, or the task form.
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user, signOut } = useSession();
  const { settings } = useSettings();
  const { tasks, error, refresh, create, update, complete, remove } = useTasks();

  const map = useRef(null);
  const sheet = useRef(null);

  // What the sheet shows: 'calendar', 'task' (one task's details) or 'form'
  const [mode, setMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [searched, setSearched] = useState(null);
  const [sheetIndex, setSheetIndex] = useState(HALF);
  const [menuOpen, setMenuOpen] = useState(false);
  const [canShowLocation, setCanShowLocation] = useState(false);

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

  const openTask = task => {
    Keyboard.dismiss();
    setSelectedId(task.id);
    setSelectedDate(task.dueDate);
    setMode('task');
    if (hasPlace(task)) {
      showOnMap(task.latitude, task.longitude);
    } else if (sheetIndex < HALF) {
      sheet.current?.snapToIndex(HALF);
    }
  };

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
    if (draft.taskId != null) {
      const saved = await update(draft.taskId, payload);
      setSelectedId(saved.id);
      setSelectedDate(saved.dueDate);
      setMode('task');
    } else {
      const saved = await create(payload);
      setSelectedDate(saved.dueDate);
      setMode('calendar');
    }
    Keyboard.dismiss();
    setDraft(null);
  };

  const changeDraft = changes => setDraft(current => ({ ...current, ...changes }));

  // ---- The map ----

  const pressMap = place => {
    Keyboard.dismiss();
    // While the form wants a place, a tap on the map puts the pin there.
    if (mode === 'form' && needsPlace(draft.reminderType)) {
      changeDraft(place);
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
    if (task && mode !== 'form') {
      openTask(task);
      return true;
    }
    return false;
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
    if (mode === 'form' && needsPlace(draft.reminderType)) {
      changeDraft({ latitude: place.latitude, longitude: place.longitude });
    } else {
      setSearched(place);
    }
    showOnMap(place.latitude, place.longitude, 16);
  };

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
        draft={mode === 'form' && needsPlace(draft?.reminderType) ? draft : null}
        searched={searched}
        showUser={canShowLocation}
        attributionTop={insets.top + 124}
        onPress={pressMap}
        onLongPress={holdMap}
        onPinPress={pressPin}
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
            onSelect={choosePlace}
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
            <Pressable
              onPress={() => startNewTask(searched)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.chipText}>Add a task here</Text>
            </Pressable>
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
        onSignOut={confirmSignOut}
      />
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
