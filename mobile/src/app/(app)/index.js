import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Linking,
  Platform,
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
import PermissionsSetup from '../../components/PermissionsSetup';
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

// How far the logo and search bar reach down from the top of the safe area,
// with a little room under them. The map keeps circles clear of it.
const TOP_BAR = 66;

// Dragging the sheet only starts once a finger has moved 10 points up or down,
// and a sideways move of 10 points rules it out. Without these, the sheet
// grabbed every drag inside it, so the radius slider in the task form could
// be tapped but not slid on Android.
const SHEET_ACTIVE_Y = [-10, 10];
const SHEET_FAIL_X = [-10, 10];

// Where the phone is, for centring the map at start-up. The last position the
// phone knows is instant, so that's used if it's recent. Otherwise (often on a
// fresh install, or after location was off) it takes a new fix, which can take
// a few seconds, longer indoors; after 15 seconds an older last position will
// do, or nothing.
async function whereAmI() {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 }).catch(
    () => null,
  );
  if (recent) {
    return recent.coords;
  }
  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise(resolve => setTimeout(() => resolve(null), 15000)),
  ]).catch(() => null);
  if (fresh) {
    return fresh.coords;
  }
  const older = await Location.getLastKnownPositionAsync().catch(() => null);
  return older?.coords ?? null;
}

// A blank task for the form, optionally already pinned somewhere. Whether it
// has a time and whether it has a place are two separate switches; the
// reminder type is worked out from them when it's saved.
//   placeName  what the pinned spot is called, when it came from a search
//              (a saved place's name is looked up from the place itself)
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
    placeName: place?.name ?? null,
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
    placeName: null,
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
  const { user, signOut, homeReady, waiting } = useSession();
  const { settings, loaded: settingsLoaded } = useSettings();
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
  // Set once the map has been moved on purpose: dragged by the person, or
  // moved to show a task or a place. After that, finding where the person is
  // (which can take a few seconds) doesn't pull the map away.
  const mapMoved = useRef(false);
  // Goes up each time the person drags or zooms the map themselves
  const userMoves = useRef(0);

  // What the sheet shows: 'calendar', 'task' (one task's details) or 'form'
  const [mode, setMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  // The spot being saved as a place, while the "Save this place" box is open
  const [savingSpot, setSavingSpot] = useState(null);
  const [placeBannerHidden, setPlaceBannerHidden] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(HALF);
  const [menuOpen, setMenuOpen] = useState(false);
  const [canShowLocation, setCanShowLocation] = useState(false);
  // While the "Show where I am" button is finding the phone
  const [locating, setLocating] = useState(false);
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

  // The first time the map opens on this phone, the set-up screen asks for
  // every permission in turn. It waits for the splash to go.
  const showSetup = settingsLoaded && !settings.setupShown && !waiting;
  const setupDone = settingsLoaded && settings.setupShown;

  // Once set-up is done (or was skipped), the map starts where the person is
  // and shows the blue dot. Location "while using the app" is asked for here
  // only if the set-up screen didn't get an answer.
  useEffect(() => {
    if (!setupDone) {
      return undefined;
    }
    let cancelled = false;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted' || cancelled) {
        return;
      }
      setCanShowLocation(true);

      const here = await whereAmI();
      if (here && !cancelled && !mapMoved.current) {
        map.current?.flyTo(here.latitude, here.longitude, {
          zoom: 14,
          bottomInset: Dimensions.get('window').height * SNAP_FRACTIONS[HALF],
        });
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setupDone]);

  // Move the map so a point sits in the visible part above the sheet. If the
  // sheet is pulled up to full screen, lower it first so the map can be seen.
  const showOnMap = useCallback(
    (latitude, longitude, zoom = 15) => {
      mapMoved.current = true;
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

  // Show a reminder circle whole, in the space between the search bar and the
  // sheet. The sheet comes to half height if it isn't already, so the map
  // above it and the form (or task) in it can both be seen.
  //   sheetAt  the sheet position to fit above; HALF unless the sheet is to
  //            stay where it is
  const showCircle = (latitude, longitude, radius, { easing = 'fly', sheetAt = HALF } = {}) => {
    mapMoved.current = true;
    if (sheetAt === HALF && sheetIndex !== HALF) {
      sheet.current?.snapToIndex(HALF);
    }
    map.current?.fitCircle(latitude, longitude, radius, {
      top: insets.top + TOP_BAR,
      bottom: height * SNAP_FRACTIONS[sheetAt],
      easing,
    });
  };

  // ---- Moving between calendar, task and form ----

  // play: start its voice note straight away (from a ringing reminder)
  const openTask = (task, { play = false } = {}) => {
    Keyboard.dismiss();
    setAutoPlayId(play && task.voiceNoteMs != null ? task.id : null);
    setSelectedId(task.id);
    setSelectedDate(task.dueDate);
    setMode('task');
    if (hasPlace(task)) {
      showCircle(task.latitude, task.longitude, task.radius ?? settings.defaultRadius);
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

  // place: where the task goes, or null to choose later. With a place, the
  // form opens straight away with its circle on the map and the distance
  // slider showing, ready for a name.
  const startNewTask = place => {
    Keyboard.dismiss();
    setDraft(newDraft(selectedDate, settings.defaultRadius, place));
    setSelectedId(null);
    setMode('form');
    if (place) {
      showCircle(place.latitude, place.longitude, settings.defaultRadius);
    } else {
      sheet.current?.snapToIndex(HALF);
    }
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
    changeDraft({
      placeOn: true,
      latitude: place.latitude,
      longitude: place.longitude,
      placeName: place.name ?? null,
    });

  // A place chosen while the form is open: pin the task there and bring the
  // circle into view, at the distance already set.
  const moveDraftTo = place => {
    Keyboard.dismiss();
    pinDraftAt(place);
    showCircle(place.latitude, place.longitude, draft.radius);
  };

  // After the distance slider is let go: zoom so the new circle fits. Only
  // when the map can be seen, not with the sheet pulled up to full screen.
  const fitNewRadius = radius => {
    if (draft?.placeOn && draft.latitude != null && sheetIndex <= HALF) {
      showCircle(draft.latitude, draft.longitude, radius, { easing: 'ease', sheetAt: sheetIndex });
    }
  };

  // ---- The map ----

  // A tap (or press and hold) on the map. Outside the form it starts a new
  // task right there; in the form it moves the task's pin (adding a place if
  // it had none), without moving the map out from under the finger.
  const pressMap = place => {
    // With the keyboard up, a tap on the map is usually just "put the keyboard
    // away", so that's all the first tap does.
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    if (mode === 'form') {
      pinDraftAt(place);
    } else {
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
      pinDraftAt(
        savedPlaceAt(places, task.latitude, task.longitude) ?? {
          latitude: task.latitude,
          longitude: task.longitude,
        },
      );
      return true;
    }
    return false;
  };

  // A search result or a saved place: a new task there, or, with the form
  // already open, the task's place moved there.
  const choosePlace = place => {
    if (mode === 'form') {
      moveDraftTo(place);
    } else {
      startNewTask(place);
    }
  };

  // A saved place's dot on the map: in the form it moves the pin there,
  // otherwise it starts a task there, just like a search result.
  const pressPlace = id => {
    const place = places.find(candidate => candidate.id === id);
    if (!place) {
      return false;
    }
    choosePlace(place);
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


  // ---- Show where I am ----

  // The button under the profile picture. The phone's last known position
  // is instant, so the map moves straight away; a fresh fix then sharpens it,
  // unless the person has started moving the map in the meantime. Asks for
  // location if Caltal doesn't have it, and offers to switch the phone's
  // location on if it's off, rather than doing nothing.
  const locateMe = async () => {
    if (locating) {
      return;
    }
    setLocating(true);
    const movesAtStart = userMoves.current;

    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        Alert.alert(
          'Caltal can’t see your location',
          'To show where you are, allow Caltal to use your location in your phone’s settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      setCanShowLocation(true);

      if (!(await Location.hasServicesEnabledAsync())) {
        if (Platform.OS === 'android') {
          // Android's own "Turn on location?" box
          await Location.enableNetworkProviderAsync().catch(() => {});
        }
        if (!(await Location.hasServicesEnabledAsync())) {
          Alert.alert(
            'Location is switched off',
            'Turn on Location in your phone’s settings to see where you are on the map.',
          );
          return;
        }
      }

      const known = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60 * 1000 }).catch(
        () => null,
      );
      if (known) {
        showOnMap(known.coords.latitude, known.coords.longitude, 16);
      }

      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise(resolve => setTimeout(() => resolve(null), 10000)),
      ]).catch(() => null);

      if (userMoves.current !== movesAtStart) {
        return;
      }
      if (fresh) {
        showOnMap(fresh.coords.latitude, fresh.coords.longitude, 16);
        return;
      }
      if (known) {
        return;
      }

      const older = await Location.getLastKnownPositionAsync().catch(() => null);
      if (older) {
        showOnMap(older.coords.latitude, older.coords.longitude, 16);
      } else {
        Alert.alert(
          'Couldn’t find you just now',
          'Your phone couldn’t get a location. Try again in a moment, ideally near a window or outside.',
        );
      }
    } finally {
      setLocating(false);
    }
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
        draft={mode === 'form' ? draft : null}
        showUser={canShowLocation}
        attributionTop={insets.top + 124}
        onPress={pressMap}
        onLongPress={pressMap}
        onPinPress={pressPin}
        places={places}
        onPlacePress={pressPlace}
        onUserMove={() => {
          mapMoved.current = true;
          userMoves.current += 1;
          Keyboard.dismiss();
        }}
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
          <Pressable
            onPress={locateMe}
            style={styles.roundButton}
            accessibilityLabel="Show where I am"
            accessibilityState={{ busy: locating }}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colours.orange} />
            ) : (
              <Ionicons name="navigate" size={18} color={colours.ink} />
            )}
          </Pressable>
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
        {/* The keyboard goes away when the sheet's contents are scrolled, or
            when a blank part of it is tapped (keyboardShouldPersistTaps
            "handled" leaves taps on buttons to the buttons themselves) */}
        <BottomSheetScrollView
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
              onShowOnMap={() =>
                showCircle(
                  selectedTask.latitude,
                  selectedTask.longitude,
                  selectedTask.radius ?? settings.defaultRadius,
                )
              }
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
              onPickPlace={moveDraftTo}
              onRadiusSet={fitNewRadius}
              onSavePlace={() =>
                setSavingSpot({
                  latitude: draft.latitude,
                  longitude: draft.longitude,
                  name: draft.placeName ?? undefined,
                })
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
        <SavePlaceModal spot={savingSpot} onClose={() => setSavingSpot(null)} />
      )}

      <PermissionsSetup visible={showSetup} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  logo: { width: 48, height: 48 },
  avatarButton: { borderRadius: 24, ...floating },
  // The "show where I am" button, on the right under the profile button
  secondRow: { flexDirection: 'row', justifyContent: 'flex-end' },
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
