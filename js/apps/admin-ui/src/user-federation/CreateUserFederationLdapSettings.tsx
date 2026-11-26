import type ComponentRepresentation from "@keycloak/keycloak-admin-client/lib/defs/componentRepresentation";
import { AlertVariant, PageSection } from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useAdminClient } from "../admin-client";
import { useAlerts } from "@keycloak/keycloak-ui-shared";
import { useRealm } from "../context/realm-context/RealmContext";
import {
  serializeFormData,
  type LdapComponentRepresentation,
} from "./UserFederationLdapForm";
import { toUserFederation } from "./routes/UserFederation";
import { UserFederationLdapWizard } from "./UserFederationLdapWizard";

export default function CreateUserFederationLdapSettings() {
  const { adminClient } = useAdminClient();
  const submissionInFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { realm } = useRealm();
  const { addAlert, addError } = useAlerts();

  const onFinish = async (formData: ComponentRepresentation): Promise<boolean> => {
    if (submissionInFlight.current) return false;
    submissionInFlight.current = true;
    setIsSubmitting(true);
    try {
      await adminClient.components.create(
        serializeFormData(formData as LdapComponentRepresentation),
      );
      addAlert(t("createUserProviderSuccess"), AlertVariant.success);
      void navigate(toUserFederation({ realm }));
      return true;
    } catch (error) {
      addError("createUserProviderError", error);
      return false;
    } finally {
      submissionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <PageSection variant="light" className="pf-v5-u-p-0">
      <UserFederationLdapWizard onFinish={onFinish} isSubmitting={isSubmitting} />
    </PageSection>
  );
}
