import type ComponentRepresentation from "@keycloak/keycloak-admin-client/lib/defs/componentRepresentation";
import {
  Button,
  useWizardContext,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
} from "@patternfly/react-core";
import { useRef } from "react";
import { useForm, type FieldPath, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import useIsFeatureEnabled, { Feature } from "../utils/useIsFeatureEnabled";
import { LdapSettingsAdvanced } from "./ldap/LdapSettingsAdvanced";
import { LdapSettingsConnection } from "./ldap/LdapSettingsConnection";
import { LdapSettingsGeneral } from "./ldap/LdapSettingsGeneral";
import { LdapSettingsKerberosIntegration } from "./ldap/LdapSettingsKerberosIntegration";
import { LdapSettingsSearching } from "./ldap/LdapSettingsSearching";
import { LdapSettingsSynchronization } from "./ldap/LdapSettingsSynchronization";
import { SettingsCache } from "./shared/SettingsCache";

const UserFedLdapFooter = ({ form, isSubmitting }: { form: WizardForm; isSubmitting: boolean }) => {
  const { t } = useTranslation();
  const { activeStep, goToNextStep, goToPrevStep, close } = useWizardContext();
  const advanceInFlight = useRef(false);
  const advance = async () => {
    if (advanceInFlight.current || isSubmitting) return;
    advanceInFlight.current = true;
    try {
      await validateStepAndAdvance(form, activeStep.index, goToNextStep);
    } finally {
      advanceInFlight.current = false;
    }
  };
  return (
    <WizardFooterWrapper>
      <Button variant="secondary" isDisabled={activeStep.index === 1 || isSubmitting} onClick={goToPrevStep}>
        {t("back")}
      </Button>
      <Button variant="primary" isDisabled={isSubmitting} onClick={() => void advance()}>
        {t("next")}
      </Button>
      <Button variant="link" isDisabled={isSubmitting} onClick={close}>
        {t("cancel")}
      </Button>
    </WizardFooterWrapper>
  );
};
type UserFederationLdapWizardProps = {
  onFinish: (component: ComponentRepresentation) => boolean | void | Promise<boolean | void>;
  isSubmitting: boolean;
};

type WizardForm = UseFormReturn<ComponentRepresentation>;
type WizardFooterProps = UserFederationLdapWizardProps & { form: WizardForm };

async function validateStepAndAdvance(
  form: WizardForm,
  stepIndex: number,
  advance: () => void,
): Promise<void> {
  const fields: string[] = stepIndex === 1
    ? ["name"]
    : stepIndex === 2
      ? [
          "config.connectionUrl.0",
          ...(form.getValues("config.authType.0") === "simple"
            ? ["config.bindDn.0", "config.bindCredential.0"]
            : []),
        ]
      : stepIndex === 3
        ? [
            "config.editMode[0]",
            "config.usersDn.0",
            "config.usernameLDAPAttribute.0",
            "config.rdnLDAPAttribute.0",
            "config.uuidLDAPAttribute.0",
            "config.userObjectClasses.0",
          ]
        : stepIndex === 5 && form.getValues("config.allowKerberosAuthentication.0") === "true"
          ? ["config.kerberosRealm.0", "config.serverPrincipal.0", "config.keyTab.0"]
          : [];

  if (fields.length && !(await form.trigger(fields as FieldPath<ComponentRepresentation>[]))) return;
  advance();
}

const SkipCustomizationFooter = ({
  form,
  onFinish,
  isSubmitting,
}: WizardFooterProps) => {
  const { handleSubmit } = form;
  const { goToNextStep, goToPrevStep, close, activeStep } = useWizardContext();
  const { t } = useTranslation();
  const advanceInFlight = useRef(false);
  const advance = async () => {
    if (advanceInFlight.current || isSubmitting) return;
    advanceInFlight.current = true;
    try {
      await validateStepAndAdvance(form, activeStep.index, goToNextStep);
    } finally {
      advanceInFlight.current = false;
    }
  };
  const finish = handleSubmit(async (component) => {
    if ((await onFinish(component)) !== false) close();
  });
  return (
    <WizardFooterWrapper>
      <Button variant="secondary" isDisabled={isSubmitting} onClick={goToPrevStep}>
        {t("back")}
      </Button>
      <Button variant="primary" type="button" isDisabled={isSubmitting} onClick={() => void advance()}>
        {t("next")}
      </Button>
      <Button
        variant="link"
        type="button"
        isDisabled={isSubmitting}
        onClick={() => void finish()}
      >
        {t("skipCustomizationAndFinish")}
      </Button>
      <Button variant="link" isDisabled={isSubmitting} onClick={close}>
        {t("cancel")}
      </Button>
    </WizardFooterWrapper>
  );
};

const FinishFooter = ({ form, onFinish, isSubmitting }: WizardFooterProps) => {
  const { goToPrevStep, close } = useWizardContext();
  const { t } = useTranslation();
  const finish = form.handleSubmit(async (component) => {
    if ((await onFinish(component)) !== false) close();
  });
  return (
    <WizardFooterWrapper>
      <Button variant="secondary" isDisabled={isSubmitting} onClick={goToPrevStep}>
        {t("back")}
      </Button>
      <Button
        variant="primary"
        type="button"
        isDisabled={isSubmitting}
        onClick={() => void finish()}
      >
        {t("finish")}
      </Button>
      <Button variant="link" isDisabled={isSubmitting} onClick={close}>
        {t("cancel")}
      </Button>
    </WizardFooterWrapper>
  );
};
export const UserFederationLdapWizard = ({
  onFinish,
  isSubmitting,
}: UserFederationLdapWizardProps) => {
  const form = useForm<ComponentRepresentation>({ mode: "onChange" });
  const { t } = useTranslation();
  const isFeatureEnabled = useIsFeatureEnabled();
  return (
    <Wizard height="100%" footer={<UserFedLdapFooter form={form} isSubmitting={isSubmitting} />}>
      <WizardStep name={t("requiredSettings")} id="ldapRequiredSettingsStep">
        <LdapSettingsGeneral
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
      <WizardStep
        name={t("connectionAndAuthenticationSettings")}
        id="ldapConnectionSettingsStep"
      >
        <LdapSettingsConnection
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
      <WizardStep
        name={t("ldapSearchingAndUpdatingSettings")}
        id="ldapSearchingSettingsStep"
      >
        <LdapSettingsSearching
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
      <WizardStep
        name={t("synchronizationSettings")}
        id="ldapSynchronizationSettingsStep"
        footer={<SkipCustomizationFooter form={form} onFinish={onFinish} isSubmitting={isSubmitting} />}
      >
        <LdapSettingsSynchronization
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
      <WizardStep
        name={t("kerberosIntegration")}
        id="ldapKerberosIntegrationSettingsStep"
        isDisabled={!isFeatureEnabled(Feature.Kerberos)}
        footer={<SkipCustomizationFooter form={form} onFinish={onFinish} isSubmitting={isSubmitting} />}
      >
        <LdapSettingsKerberosIntegration
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
      <WizardStep
        name={t("cacheSettings")}
        id="ldapCacheSettingsStep"
        footer={<SkipCustomizationFooter form={form} onFinish={onFinish} isSubmitting={isSubmitting} />}
      >
        <SettingsCache form={form} showSectionHeading showSectionDescription />
      </WizardStep>
      <WizardStep
        name={t("advancedSettings")}
        id="ldapAdvancedSettingsStep"
        footer={<FinishFooter form={form} onFinish={onFinish} isSubmitting={isSubmitting} />}
      >
        <LdapSettingsAdvanced
          form={form}
          showSectionHeading
          showSectionDescription
        />
      </WizardStep>
    </Wizard>
  );
};
