import { useBlocker } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '@/shared/i18n/id';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

const text = t.common.leave;

/** Set just before the app itself navigates away on purpose, e.g. after a save or a delete. */
let leaveAllowed = false;

/** Lets the next page change through without asking; call it right before navigating. */
export function allowNextLeave(): void {
  leaveAllowed = true;
}

/**
 * Asks before leaving a form with unsaved changes: a page change inside the app shows a dialog,
 * and closing or reloading the window shows the browser's own warning. Returns the dialog.
 */
export function useLeaveGuard(dirty: boolean): ReactNode {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const blocker = useBlocker({
    shouldBlockFn: () => {
      if (leaveAllowed) {
        leaveAllowed = false;
        return false;
      }
      return dirtyRef.current;
    },
    enableBeforeUnload: () => dirtyRef.current,
    withResolver: true,
  });

  return (
    <Modal open={blocker.status === 'blocked'} onClose={() => blocker.reset?.()} label={text.title}>
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">{text.title}</h2>
          <p className="mt-2 text-sm text-muted">{text.body}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" className="text-danger" onClick={() => blocker.proceed?.()}>
            {text.leave}
          </Button>
          <Button variant="primary" autoFocus onClick={() => blocker.reset?.()}>
            {text.stay}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
