import {
  KeycloakMasthead,
  useEnvironment,
  useHelp,
} from "@keycloak/keycloak-ui-shared";
import { DropdownItem, ToolbarItem } from "@patternfly/react-core";
import { HelpIcon } from "@patternfly/react-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHref } from "react-router-dom";
import { PageHeaderClearCachesModal } from "./PageHeaderClearCachesModal";
import { HelpHeader } from "./components/help-enabler/HelpHeader";
import { useAccess } from "./context/access/Access";
import { useRealm } from "./context/realm-context/RealmContext";
import { toDashboard } from "./dashboard/routes/Dashboard";
import type { Environment } from "./environment-types";
import { usePreviewLogo } from "./realm-settings/themes/LogoContext";
import { joinPath } from "./utils/joinPath";
import { useIsFeatureDisabled, Feature } from "./utils/useIsFeatureEnabled";
import useToggle from "./utils/useToggle";

type ThemePreference = "system" | "light" | "dark";
type DensityPreference = "comfortable" | "compact";
type MotionPreference = "system" | "reduced";
type AppearancePreference = {
  theme: ThemePreference;
  density: DensityPreference;
  motion: MotionPreference;
};
const APPEARANCE_STORAGE_KEY = "abia.appearance.v1";
const APPEARANCE_CHANGED_EVENT = "abia:appearance-changed";
const DEFAULT_APPEARANCE: AppearancePreference = {
  theme: "system",
  density: "comfortable",
  motion: "system",
};

function normalizeAppearancePreference(value: unknown): AppearancePreference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_APPEARANCE };
  }
  const stored = value as Record<string, unknown>;
  return {
    theme: stored.theme === "light" || stored.theme === "dark" || stored.theme === "system"
      ? stored.theme
      : DEFAULT_APPEARANCE.theme,
    density: stored.density === "compact" || stored.density === "comfortable"
      ? stored.density
      : DEFAULT_APPEARANCE.density,
    motion: stored.motion === "reduced" || stored.motion === "system"
      ? stored.motion
      : DEFAULT_APPEARANCE.motion,
  };
}

function readAppearancePreference(): AppearancePreference {
  try {
    const value = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return value ? normalizeAppearancePreference(JSON.parse(value)) : { ...DEFAULT_APPEARANCE };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

function applyAppearancePreference(preference: AppearancePreference) {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = preference.theme === "system"
    ? systemPrefersDark ? "dark" : "light"
    : preference.theme;
  const root = document.getElementById("app");
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference.theme;
  document.documentElement.dataset.density = preference.density;
  document.documentElement.dataset.motion = preference.motion;
  document.documentElement.classList.toggle("pf-v5-theme-dark", theme === "dark");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  if (root) {
    root.dataset.theme = theme;
    root.dataset.themePreference = preference.theme;
    root.dataset.density = preference.density;
    root.dataset.motion = preference.motion;
  }
}

function storeAppearancePreference(preference: AppearancePreference) {
  applyAppearancePreference(preference);
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Keep the selected appearance for the current page when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT, { detail: preference }));
}

const AppearanceDropdownItem = () => {
  const { t } = useTranslation();
  const [preference, setPreference] = useState<AppearancePreference>(readAppearancePreference);

  useEffect(() => {
    const applyStoredAppearance = (event?: Event) => {
      const isAppearanceEvent = event?.type === APPEARANCE_CHANGED_EVENT;
      const requestedPreference = isAppearanceEvent
        ? normalizeAppearancePreference((event as CustomEvent<unknown>).detail)
        : readAppearancePreference();
      applyAppearancePreference(requestedPreference);
      setPreference(requestedPreference);
    };

    applyStoredAppearance();
    window.addEventListener("storage", applyStoredAppearance);
    window.addEventListener(APPEARANCE_CHANGED_EVENT, applyStoredAppearance);
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      if (readAppearancePreference().theme === "system") {
        applyAppearancePreference(readAppearancePreference());
      }
    };
    colorScheme.addEventListener("change", applySystemTheme);
    return () => {
      window.removeEventListener("storage", applyStoredAppearance);
      window.removeEventListener(APPEARANCE_CHANGED_EVENT, applyStoredAppearance);
      colorScheme.removeEventListener("change", applySystemTheme);
    };
  }, []);

  const updatePreference = (next: AppearancePreference) => {
    setPreference(next);
    storeAppearancePreference(next);
  };

  const selectTheme = (theme: ThemePreference) => {
    updatePreference({ ...preference, theme });
  };

  const selectDensity = (density: DensityPreference) => {
    updatePreference({ ...preference, density });
  };

  const toggleMotion = () => {
    updatePreference({
      ...preference,
      motion: preference.motion === "reduced" ? "system" : "reduced",
    });
  };

  return (
    <>
      <DropdownItem key="theme-system" isSelected={preference.theme === "system"} onClick={() => selectTheme("system")}>
        {t("abiaThemeSystem")}
      </DropdownItem>
      <DropdownItem key="theme-light" isSelected={preference.theme === "light"} onClick={() => selectTheme("light")}>
        {t("abiaThemeLight")}
      </DropdownItem>
      <DropdownItem key="theme-dark" isSelected={preference.theme === "dark"} onClick={() => selectTheme("dark")}>
        {t("abiaThemeDark")}
      </DropdownItem>
      <DropdownItem key="density-comfortable" isSelected={preference.density === "comfortable"} onClick={() => selectDensity("comfortable")}>
        {t("abiaDensityComfortable")}
      </DropdownItem>
      <DropdownItem key="density-compact" isSelected={preference.density === "compact"} onClick={() => selectDensity("compact")}>
        {t("abiaDensityCompact")}
      </DropdownItem>
      <DropdownItem key="motion" isSelected={preference.motion === "reduced"} onClick={toggleMotion}>
        {preference.motion === "reduced" ? t("useSystemMotion") : t("reduceMotion")}
      </DropdownItem>
    </>
  );
};

const ManageAccountDropdownItem = () => {
  const { keycloak } = useEnvironment();
  const { t } = useTranslation();
  const isFeatureDisabled = useIsFeatureDisabled();

  if (isFeatureDisabled(Feature.AccountV3)) {
    return null;
  }

  return (
    <DropdownItem
      key="manage account"
      id="manage-account"
      onClick={() => keycloak.accountManagement()}
    >
      {t("manageAccount")}
    </DropdownItem>
  );
};

const ServerInfoDropdownItem = () => {
  const { realm } = useRealm();
  const { t } = useTranslation();

  return (
    <DropdownItem
      key="server info"
      component={(props) => <Link {...props} to={toDashboard({ realm })} />}
    >
      {t("realmInfo")}
    </DropdownItem>
  );
};

const ClearCachesDropdownItem = () => {
  const { t } = useTranslation();
  const [open, toggleModal] = useToggle();

  return (
    <>
      <DropdownItem key="clear caches" onClick={() => toggleModal()}>
        {t("clearCachesTitle")}
      </DropdownItem>
      {open && <PageHeaderClearCachesModal onClose={() => toggleModal()} />}
    </>
  );
};

const HelpDropdownItem = () => {
  const { t } = useTranslation();
  const { enabled, toggleHelp } = useHelp();
  return (
    <DropdownItem
      data-testId="helpIcon"
      icon={<HelpIcon />}
      onClick={toggleHelp}
    >
      {enabled ? t("helpEnabled") : t("helpDisabled")}
    </DropdownItem>
  );
};

const kebabDropdownItems = (isMasterRealm: boolean, isManager: boolean) => [
  <AppearanceDropdownItem key="kebab Appearance" />,
  <ManageAccountDropdownItem key="kebab Manage Account" />,
  <ServerInfoDropdownItem key="kebab Server Info" />,
  ...(isMasterRealm && isManager
    ? [<ClearCachesDropdownItem key="Clear Caches" />]
    : []),
  <HelpDropdownItem key="kebab Help" />,
];

const userDropdownItems = (isMasterRealm: boolean, isManager: boolean) => [
  <AppearanceDropdownItem key="Appearance" />,
  <ManageAccountDropdownItem key="Manage Account" />,
  <ServerInfoDropdownItem key="Server info" />,
  ...(isMasterRealm && isManager
    ? [<ClearCachesDropdownItem key="Clear Caches" />]
    : []),
];

export const Header = () => {
  const { environment, keycloak } = useEnvironment<Environment>();
  const { t, i18n } = useTranslation();
  const { realm } = useRealm();
  const { hasAccess } = useAccess();

  useEffect(() => {
    const updateDocumentLanguage = (language?: string) => {
      if (!language) return;
      document.documentElement.lang = language.replace(/_/g, "-");
    };

    updateDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
    i18n.on("languageChanged", updateDocumentLanguage);
    return () => {
      i18n.off("languageChanged", updateDocumentLanguage);
    };
  }, [i18n]);

  const contextLogo = usePreviewLogo();
  const customLogo = contextLogo?.logo;

  const isMasterRealm = realm === environment.masterRealm;
  const isManager = hasAccess("manage-realm");

  const abiaLogo = "abia-admin-logo.svg";
  const logo = environment.logo || abiaLogo;
  const usesAbiaLogo = !customLogo?.trim() && logo === abiaLogo;
  const url = useHref(toDashboard({ realm }));
  const logoUrl = environment.logoUrl ? environment.logoUrl : url;

  return (
    <KeycloakMasthead
      data-testid="page-header"
      keycloak={keycloak}
      features={{ hasManageAccount: false }}
      brand={{
        href: logoUrl,
        src: customLogo?.trim()
          ? customLogo
          : joinPath(environment.resourceUrl, logo),
        alt: usesAbiaLogo ? "ABIA" : t("logo"),
        className: "keycloak__pageheader_brand",
      }}
      dropdownItems={userDropdownItems(isMasterRealm, isManager)}
      kebabDropdownItems={kebabDropdownItems(isMasterRealm, isManager)}
      toolbarItems={[
        <ToolbarItem
          key="help"
          align={{ default: "alignRight" }}
          visibility={{
            default: "hidden",
            md: "visible",
          }} /** the settings and help icon buttons are only visible on desktop sizes and replaced by a kebab dropdown for other sizes */
        >
          <HelpHeader />
        </ToolbarItem>,
      ]}
    />
  );
};
