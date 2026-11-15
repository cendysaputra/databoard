import { X } from 'lucide-react';
import { useState } from 'react';
import { useUpdateSettings } from '@/shared/hooks/use-settings';
import { t } from '@/shared/i18n/id';
import type { Settings } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';

const text = t.portfolio.options;

interface OptionListProps {
  title: string;
  placeholder: string;
  names: string[];
  busy: boolean;
  onChange(names: string[]): void;
}

/** One pick list: its names as removable chips, and a field to add a name. */
function OptionList({ title, placeholder, names, busy, onChange }: OptionListProps) {
  const [name, setName] = useState('');
  const fresh = name.trim();
  const canAdd = fresh !== '' && !names.includes(fresh);

  const add = () => {
    if (!canAdd) return;
    onChange([...names, fresh]);
    setName('');
  };

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {names.length === 0 ? (
        <p className="mb-3 text-sm text-muted">{text.none}</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {names.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 rounded-sm bg-surface-hover py-1 pr-1 pl-3 text-xs font-medium"
            >
              {item}
              <button
                type="button"
                aria-label={text.remove(item)}
                title={text.remove(item)}
                disabled={busy}
                onClick={() => onChange(names.filter((other) => other !== item))}
                className="flex size-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-border hover:text-text disabled:opacity-50"
              >
                <X aria-hidden className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={placeholder}
          placeholder={placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button disabled={busy || !canAdd} onClick={add}>
          {text.add}
        </Button>
      </div>
    </section>
  );
}

interface OptionManagerProps {
  open: boolean;
  onClose(): void;
  settings: Settings;
}

/**
 * Dialog to add and remove the kinds and tools offered for projects. Taking a name off a
 * list does not change the projects that already use it.
 */
export function OptionManager({ open, onClose, settings }: OptionManagerProps) {
  const update = useUpdateSettings();
  const save = (changes: Partial<Settings>) => update.mutate({ ...settings, ...changes });

  return (
    <Modal open={open} onClose={onClose} label={text.manage} className="max-w-md">
      <div className="flex flex-col gap-7 p-6">
        <h2 className="text-xl font-semibold">{text.manage}</h2>
        <OptionList
          title={text.kinds}
          placeholder={text.newKind}
          names={settings.project_kinds}
          busy={update.isPending}
          onChange={(project_kinds) => save({ project_kinds })}
        />
        <OptionList
          title={text.tools}
          placeholder={text.newTool}
          names={settings.project_tools}
          busy={update.isPending}
          onChange={(project_tools) => save({ project_tools })}
        />
        <FormError error={update.error} />
        <div className="flex justify-end">
          <Button onClick={onClose}>{text.close}</Button>
        </div>
      </div>
    </Modal>
  );
}
