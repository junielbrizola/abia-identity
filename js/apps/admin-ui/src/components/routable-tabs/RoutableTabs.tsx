import {
  Tab,
  TabProps,
  Tabs,
  TabsComponent,
  TabsProps,
} from "@patternfly/react-core";
import {
  Children,
  JSXElementConstructor,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  isValidElement,
  useId,
} from "react";
import {
  Path,
  generatePath,
  matchPath,
  useNavigate,
  useHref,
  useLocation,
  useParams,
} from "react-router-dom";
import { useServerInfo } from "../../context/server-info/ServerInfoProvider";
import { PageHandler } from "../../page/PageHandler";
import { TAB_PROVIDER } from "../../page/constants";
import useIsFeatureEnabled, { Feature } from "../../utils/useIsFeatureEnabled";
import { useTranslation } from "react-i18next";
import "./routable-tabs.css";

// TODO: Remove the custom 'children' props and type once the following issue has been resolved:
// https://github.com/patternfly/patternfly-react/issues/6766
type ChildElement = ReactElement<TabProps, JSXElementConstructor<TabProps>>;
type Child = ChildElement | boolean | null | undefined;

// TODO: Figure out why we need to omit 'ref' from the props.
type RoutableTabsProps = {
  children: Child | Child[];
  defaultLocation?: Partial<Path>;
  mobileSelect?: boolean;
} & Omit<
  TabsProps,
  "ref" | "activeKey" | "defaultActiveKey" | "component" | "children"
>;

export const RoutableTabs = ({
  children,
  defaultLocation,
  mobileSelect = false,
  className,
  ...otherProps
}: RoutableTabsProps) => {
  const { pathname } = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const mobileSelectId = useId();
  const { componentTypes } = useServerInfo();
  const tabs = componentTypes?.[TAB_PROVIDER] || [];
  const isFeatureEnabled = useIsFeatureEnabled();
  const { t } = useTranslation();

  const matchedTabs = tabs
    .filter((tab) => matchPath({ path: tab.metadata.path }, pathname))
    .map((t) => ({
      ...t,
      pathname: generatePath(t.metadata.path, {
        ...params,
        ...t.metadata.params,
      }),
    }));
  // Extract all keys from matchedTabs
  const matchedTabsKeys = matchedTabs.map((t) => t.pathname);

  // Extract event keys from children
  const tabChildren = Children.toArray(children).filter(
    (child): child is ChildElement => isValidElement(child),
  );
  const eventKeys = tabChildren.map((child) =>
    child.props.eventKey.toString(),
  );

  const allKeys = [...eventKeys, ...matchedTabsKeys];

  // Determine if there is an exact match.
  const exactMatch = allKeys.find(
    (eventKey) => eventKey === decodeURI(pathname),
  );

  // Determine which event keys at least partially match the current path, then sort them so the nearest match ends up on top.
  const nearestMatch = eventKeys
    .filter((eventKey) => pathname.includes(eventKey))
    .sort((a, b) => a.length - b.length)
    .pop();

  const activeTabKey =
    exactMatch ?? nearestMatch ?? defaultLocation?.pathname ?? pathname;
  const mobileTabOptions = [
    ...tabChildren.map((child) => ({
      key: child.props.eventKey.toString(),
      label: getTabLabel(child.props.title),
    })),
    ...(isFeatureEnabled(Feature.DeclarativeUI)
      ? matchedTabs.map((tab) => ({ key: tab.pathname, label: t(tab.id) }))
      : []),
  ].filter((option) => option.label.length > 0);
  const uniqueMobileTabOptions = Array.from(
    new Map(mobileTabOptions.map((option) => [option.key, option])).values(),
  );

  return (
    <>
      {mobileSelect && uniqueMobileTabOptions.length > 1 && (
        <select
          id={mobileSelectId}
          className="abia-routable-tabs__mobile-select pf-v5-c-form-control"
          aria-label={t("selectSection")}
          value={
            uniqueMobileTabOptions.some(({ key }) => key === activeTabKey)
              ? activeTabKey
              : uniqueMobileTabOptions[0].key
          }
          onChange={(event) => navigate(event.currentTarget.value)}
        >
          {uniqueMobileTabOptions.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      )}
      <Tabs
        activeKey={activeTabKey}
        component={TabsComponent.nav}
        className={[
          "abia-routable-tabs__tabs",
          mobileSelect && uniqueMobileTabOptions.length > 1
            ? "abia-routable-tabs__tabs--mobile-select"
            : undefined,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        inset={{
          default: "insetNone",
          xl: "insetLg",
          "2xl": "inset2xl",
        }}
        unmountOnExit
        mountOnEnter
        {...otherProps}
      >
        {children as any}
        {isFeatureEnabled(Feature.DeclarativeUI) &&
          matchedTabs.map<any>((tab) => (
            <DynamicTab key={tab.id} eventKey={tab.pathname} title={t(tab.id)}>
              <PageHandler page={tab} providerType={TAB_PROVIDER} />
            </DynamicTab>
          ))}
      </Tabs>
    </>
  );
};

const getTabLabel = (value: ReactNode): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(getTabLabel).filter(Boolean).join(" ");
  }
  if (isValidElement<{ children?: ReactNode }>(value)) {
    return getTabLabel(value.props.children);
  }
  return "";
};

type DynamicTabProps = {
  title: string;
  eventKey: string;
};

const DynamicTab = ({
  children,
  ...props
}: PropsWithChildren<DynamicTabProps>) => {
  const href = useHref(props.eventKey);

  return (
    <Tab href={href} {...props}>
      {children}
    </Tab>
  );
};

export const useRoutableTab = (to: Partial<Path>) => ({
  eventKey: to.pathname ?? "",
  href: useHref(to),
});
