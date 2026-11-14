import { ProfileForm } from '@/features/settings/components/ProfileForm';
import { t } from '@/shared/i18n/id';
import type { Settings } from '@/shared/types';
import { LogoMark } from '@/shared/ui/icons';

/** First start: the profile is filled in before the rest of the app is shown. */
export function Onboarding({ settings }: { settings: Settings }) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-canvas p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg p-8">
        <LogoMark className="size-10" />
        <h1 className="mt-6 text-2xl leading-tight font-semibold">{t.settings.welcome.title}</h1>
        <p className="mt-2 mb-8 text-muted">{t.settings.welcome.body}</p>
        <ProfileForm settings={settings} submitLabel={t.settings.profile.continue} />
      </div>
    </div>
  );
}
