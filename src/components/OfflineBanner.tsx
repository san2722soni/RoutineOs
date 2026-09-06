import { InfoBanner } from "@/src/components/InfoBanner";
import { appTheme } from "@/src/lib/theme";
export function OfflineBanner({ theme }: { theme: ReturnType<typeof appTheme> }) {
  return (
    <InfoBanner
      title="Backup pending"
      body="You are offline. Your changes are saved on this phone."
      theme={theme}
      accent="warning"
    />
  );
}
