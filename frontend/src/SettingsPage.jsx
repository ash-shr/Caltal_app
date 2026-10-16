import { useEffect, useState } from 'react';
import PageLayout, { Section } from './PageLayout';
import RadiusSlider from './RadiusSlider';
import Icon from './icons';
import {
  changePassword,
  deleteAccount,
  getMe,
  sendConfirmationEmail,
  updateName,
} from './api';
import { getDefaultRadius, setDefaultRadius } from './settings';
import {
  buttonClass,
  dangerButtonClass,
  inputClass,
  quietDangerButtonClass,
  secondaryButtonClass,
} from './ui';

const labelClass = 'block text-sm font-medium text-stone-800';
const hintClass = 'text-sm leading-relaxed text-stone-500';

// The same settings as the phone app's Settings screen, apart from the ones
// only a phone has (background reminders).
//   onUserChange      the name changed, so the menu button's initials can too
//   onAccountDeleted  the account is gone and this browser is signed out
function SettingsPage({ user, onUserChange, onAccountDeleted }) {
  // Whether there's a password (Google-only accounts have none) and whether
  // the email is confirmed come from the server
  const [me, setMe] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setLoadError("Your account details couldn't be loaded right now."));
  }, []);

  const hasPassword = me?.hasPassword !== false;

  // ---- Name ----
  const [name, setName] = useState(user.name);
  const [nameState, setNameState] = useState({ busy: false, message: '' });

  const saveName = async event => {
    event.preventDefault();
    setNameState({ busy: true, message: '' });
    try {
      const saved = await updateName(name.trim());
      onUserChange({ name: saved.name, email: saved.email });
      setNameState({ busy: false, message: 'Saved.' });
    } catch (failure) {
      setNameState({ busy: false, message: failure.message });
    }
  };

  // ---- Email confirmation ----
  const [confirmState, setConfirmState] = useState({ busy: false, sent: false, message: '' });

  const sendConfirmation = async () => {
    setConfirmState({ busy: true, sent: false, message: '' });
    try {
      await sendConfirmationEmail();
      setConfirmState({ busy: false, sent: true, message: 'Sent. Open the link in the email.' });
    } catch (failure) {
      setConfirmState({ busy: false, sent: false, message: failure.message });
    }
  };

  // ---- Password ----
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [passwordState, setPasswordState] = useState({ busy: false, message: '' });

  const savePassword = async event => {
    event.preventDefault();
    if (next !== repeat) {
      setPasswordState({ busy: false, message: "The new passwords don't match." });
      return;
    }
    setPasswordState({ busy: true, message: '' });
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setRepeat('');
      setPasswordOpen(false);
      setPasswordState({
        busy: false,
        message: 'Password changed. Every other device has been signed out.',
      });
    } catch (failure) {
      setPasswordState({ busy: false, message: failure.message });
    }
  };

  // ---- This browser ----
  const [radius, setRadius] = useState(getDefaultRadius);

  // ---- Delete account ----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteState, setDeleteState] = useState({ busy: false, message: '' });

  const reallyDelete = async event => {
    event.preventDefault();
    setDeleteState({ busy: true, message: '' });
    try {
      await deleteAccount(hasPassword ? deletePassword : null);
      onAccountDeleted();
    } catch (failure) {
      setDeleteState({ busy: false, message: failure.message });
    }
  };

  return (
    <PageLayout title="Settings">
      <Section title="Account">
        <form onSubmit={saveName} className="space-y-2">
          <label htmlFor="settings-name" className={labelClass}>
            Name
          </label>
          <input
            id="settings-name"
            className={inputClass}
            value={name}
            onChange={event => setName(event.target.value)}
            maxLength={100}
            autoComplete="name"
          />
          <button
            type="submit"
            disabled={nameState.busy || name.trim() === '' || name.trim() === user.name}
            className={secondaryButtonClass}
          >
            {nameState.busy ? 'Saving…' : 'Save name'}
          </button>
          {nameState.message !== '' && <p className={hintClass}>{nameState.message}</p>}
        </form>

        <div className="h-px bg-stone-100" />

        <div className="space-y-2">
          <p className={labelClass}>Email</p>
          <p className="text-[15px] text-stone-600">{user.email}</p>

          {me?.emailVerified === true && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-teal-600">
              <Icon name="check" size={16} strokeWidth={2.25} />
              Confirmed
            </p>
          )}

          {me?.emailVerified === false && (
            <div className="space-y-2">
              <p className={hintClass}>
                Not confirmed yet. Confirming it means you can reset your password by email if
                you ever forget it.
              </p>
              {!confirmState.sent && (
                <button
                  type="button"
                  onClick={sendConfirmation}
                  disabled={confirmState.busy}
                  className={secondaryButtonClass}
                >
                  {confirmState.busy ? 'Sending…' : 'Send confirmation email'}
                </button>
              )}
              {confirmState.message !== '' && (
                <p className={confirmState.sent ? hintClass : 'text-sm text-red-600'}>
                  {confirmState.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-stone-100" />

        <div className="space-y-2">
          <p className={labelClass}>Password</p>

          {loadError !== '' ? (
            <p className={hintClass}>{loadError}</p>
          ) : !hasPassword ? (
            <p className={hintClass}>
              {"You sign in with Google, so there's no password to change."}
            </p>
          ) : passwordOpen ? (
            <form onSubmit={savePassword} className="space-y-2">
              <input
                className={inputClass}
                type="password"
                value={current}
                onChange={event => setCurrent(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                maxLength={72}
              />
              <input
                className={inputClass}
                type="password"
                value={next}
                onChange={event => setNext(event.target.value)}
                placeholder="New password (8 or more characters)"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
              />
              <input
                className={inputClass}
                type="password"
                value={repeat}
                onChange={event => setRepeat(event.target.value)}
                placeholder="New password again"
                autoComplete="new-password"
                maxLength={72}
              />
              <button type="submit" disabled={passwordState.busy} className={buttonClass}>
                {passwordState.busy ? 'Saving…' : 'Change password'}
              </button>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="w-full py-1 text-sm text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPasswordState({ busy: false, message: '' });
                setPasswordOpen(true);
              }}
              className={secondaryButtonClass}
            >
              Change password
            </button>
          )}

          {passwordState.message !== '' && <p className={hintClass}>{passwordState.message}</p>}
        </div>
      </Section>

      <Section title="This browser">
        <RadiusSlider
          label="Default reminder radius"
          value={radius}
          onChange={setRadius}
          onCommit={setDefaultRadius}
        />
        <p className={hintClass}>
          Where new place tasks start. You can still change it for each task. The phone app keeps
          its own.
        </p>
      </Section>

      <Section title="Delete account" tone="danger">
        {!deleteOpen ? (
          <>
            <p className={hintClass}>
              Removes your account and all of your tasks and saved places from Caltal for good.
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className={quietDangerButtonClass}
            >
              Delete my account
            </button>
          </>
        ) : (
          <form onSubmit={reallyDelete} className="space-y-2">
            <p className="text-sm font-medium text-red-700">
              This can&rsquo;t be undone. Your tasks and saved places go with it.
            </p>
            {hasPassword && (
              <input
                className={inputClass}
                type="password"
                value={deletePassword}
                onChange={event => setDeletePassword(event.target.value)}
                placeholder="Type your password to confirm"
                autoComplete="current-password"
                maxLength={72}
              />
            )}
            <button
              type="submit"
              disabled={deleteState.busy || (hasPassword && deletePassword === '')}
              className={dangerButtonClass}
            >
              {deleteState.busy ? 'Deleting…' : 'Delete my account for good'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="w-full py-1 text-sm text-stone-500 hover:text-stone-800"
            >
              Keep my account
            </button>
            {deleteState.message !== '' && (
              <p className="text-sm text-red-600">{deleteState.message}</p>
            )}
          </form>
        )}
      </Section>
    </PageLayout>
  );
}

export default SettingsPage;
