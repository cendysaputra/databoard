import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { t } from '@/shared/i18n/id';
import type { Settings } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { FormError } from '@/shared/ui/FormError';
import { FormField } from '@/shared/ui/FormField';
import { Input } from '@/shared/ui/Input';
import { useUpdateSettings } from '../api';

const text = t.settings.profile;
const MAX_LEN = 80;

interface ProfileFormProps {
  settings: Settings;
  /** Label of the submit button. */
  submitLabel: string;
  onSaved?(): void;
}

/** The user's profile. It is stored with the other settings, on this computer only. */
export function ProfileForm({ settings, submitLabel, onSaved }: ProfileFormProps) {
  const update = useUpdateSettings();
  const [name, setName] = useState(settings.profile_name);
  const [nickname, setNickname] = useState(settings.profile_nickname);
  const [role, setRole] = useState(settings.profile_role);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      {
        ...settings,
        profile_name: name.trim(),
        profile_nickname: nickname.trim(),
        profile_role: role.trim(),
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <FormField label={text.name} required>
        {(id) => (
          <Input
            id={id}
            required
            autoFocus={!settings.profile_name}
            maxLength={MAX_LEN}
            placeholder={text.namePlaceholder}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        )}
      </FormField>
      <FormField label={text.nickname} hint={text.nicknameHint}>
        {(id) => (
          <Input
            id={id}
            maxLength={MAX_LEN}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
          />
        )}
      </FormField>
      <FormField label={text.role}>
        {(id) => (
          <Input
            id={id}
            maxLength={MAX_LEN}
            placeholder={text.rolePlaceholder}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          />
        )}
      </FormField>

      <p className="flex items-start gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        {text.privacy}
      </p>

      <FormError error={update.error} />

      <Button
        type="submit"
        variant="primary"
        className="w-fit"
        disabled={update.isPending || !name.trim()}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
