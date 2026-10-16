import { useRef, useState } from 'react';
import { SHEET_HALF as HALF, SHEET_STOPS } from './config';

// Where the calendar, a task's details and the task form live. On a computer
// it's a card down the left of the map; on a phone, a sheet along the bottom
// that can be dragged up and down, like the app's.
function Panel({ wide, stop, onStop, children }) {
  if (wide) {
    return (
      <aside className="absolute bottom-4 left-4 top-20 z-20 flex w-[400px] flex-col overflow-hidden rounded-3xl bg-stone-50/95 shadow-xl ring-1 ring-stone-900/5 backdrop-blur">
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5">{children}</div>
      </aside>
    );
  }

  return (
    <Sheet stop={stop} onStop={onStop}>
      {children}
    </Sheet>
  );
}

function Sheet({ stop, onStop, children }) {
  // While a finger is on the handle: where it started, and the height now
  const [drag, setDrag] = useState(null);
  const moved = useRef(false);

  const startDrag = event => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moved.current = false;
    setDrag({
      startY: event.clientY,
      startHeight: window.innerHeight * SHEET_STOPS[stop],
      height: window.innerHeight * SHEET_STOPS[stop],
    });
  };

  const moveDrag = event => {
    if (!drag) return;
    const distance = drag.startY - event.clientY;
    if (Math.abs(distance) > 4) {
      moved.current = true;
    }
    const lowest = window.innerHeight * SHEET_STOPS[0];
    const highest = window.innerHeight * SHEET_STOPS[SHEET_STOPS.length - 1];
    setDrag({
      ...drag,
      height: Math.min(highest, Math.max(lowest, drag.startHeight + distance)),
    });
  };

  const endDrag = () => {
    if (!drag) return;

    if (!moved.current) {
      // A tap on the handle steps up, and from the top back down to half
      onStop(stop < SHEET_STOPS.length - 1 ? stop + 1 : HALF);
    } else {
      // Settle on whichever stop is nearest to where it was let go
      const fraction = drag.height / window.innerHeight;
      let nearest = 0;
      SHEET_STOPS.forEach((candidate, index) => {
        if (Math.abs(candidate - fraction) < Math.abs(SHEET_STOPS[nearest] - fraction)) {
          nearest = index;
        }
      });
      onStop(nearest);
    }
    setDrag(null);
  };

  return (
    <section
      style={{ height: drag ? `${drag.height}px` : `${SHEET_STOPS[stop] * 100}dvh` }}
      className={
        'fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-stone-50 ' +
        'shadow-[0_-8px_30px_rgba(0,0,0,0.12)] ' +
        (drag ? '' : 'transition-[height] duration-300 ease-out')
      }
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="button"
        tabIndex={0}
        aria-label="Resize the panel"
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onStop(stop < SHEET_STOPS.length - 1 ? stop + 1 : HALF);
          }
        }}
        className="flex flex-none cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
      >
        <span className="h-1.5 w-11 rounded-full bg-stone-300" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">{children}</div>
    </section>
  );
}

export default Panel;
