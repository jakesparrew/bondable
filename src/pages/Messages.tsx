import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ClientSelector from "@/components/ClientSelector";
import TherapistSelector from "@/components/TherapistSelector";
import ConversationInterface from "@/components/ConversationInterface";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import LineMeet from "@/components/illustration/LineMeet";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Client } from "@/types/client";
import { Therapist } from "@/services/api";
// Remove import MessagesSkeleton - no longer needed

const Messages = () => {
  const { t } = useTranslation();
  const { userType } = useParams();
  const [searchParams] = useSearchParams();
  const [selectedClient, setSelectedClient] = useOptimizedState<Client | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useOptimizedState<Therapist | null>(
    null
  );
  const [showConversation, setShowConversation] = useOptimizedState(false);
  const isMobile = useIsMobile();
  // Remove loading state - instant UI for better UX

  // Mock therapist tier - in real app this would come from user data
  const isPayingTherapist = true; // Change to false for free tier

  // Get client info from URL parameters
  const clientIdParam = searchParams.get("clientId");
  const clientNameParam = searchParams.get("clientName");

  useOptimizedEffect(() => {
    // If client parameters are provided, auto-select or create the client
    if (clientIdParam && clientNameParam && userType === "therapist") {
      const preselectedClient: Client = {
        id: clientIdParam,
        name: decodeURIComponent(clientNameParam),
        firstName: decodeURIComponent(clientNameParam).split(" ")[0] || "",
        lastName:
          decodeURIComponent(clientNameParam).split(" ").slice(1).join(" ") ||
          "",
        email: `${decodeURIComponent(clientNameParam)
          .toLowerCase()
          .replace(/\s+/g, ".")}@email.com`,
        phone: "+1 (555) 000-0000",
        status: "Active",
        joinDate: new Date().toISOString().split("T")[0],
        lastSession: "Never",
      };
      setSelectedClient(preselectedClient);
      if (isMobile) {
        setShowConversation(true);
      }
    }
  }, [clientIdParam, clientNameParam, userType, isMobile]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleSelectTherapist = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    if (isMobile) {
      setShowConversation(true);
    }
  };

  const handleBackToList = () => {
    setShowConversation(false);
  };

  // Remove loading screen - instant UI for better UX
  if (userType === "client") {
    // Client view - shows therapist selector and conversation
    return (
      <DashboardLayout userType="client" contentClassName="!p-0">
        {isMobile ? (
          <div className="h-screen flex flex-col">
            {!showConversation ? (
              <TherapistSelector
                onSelectTherapist={handleSelectTherapist}
                selectedTherapist={selectedTherapist}
              />
            ) : (
              <div className="flex-1 flex flex-col">
                <ConversationInterface
                  selectedClient={
                    selectedTherapist
                      ? {
                          id: selectedTherapist.id,
                          name: selectedTherapist.name,
                          firstName: selectedTherapist.firstName,
                          lastName: selectedTherapist.lastName,
                          email: selectedTherapist.email,
                          phone: selectedTherapist.phone,
                          status: "Active",
                          joinDate: "2020-01-01",
                          lastSession: "2024-06-01",
                        }
                      : null
                  }
                  onBackClick={handleBackToList}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-screen flex">
            <TherapistSelector
              onSelectTherapist={handleSelectTherapist}
              selectedTherapist={selectedTherapist}
            />
            {selectedTherapist ? (
              <ConversationInterface
                selectedClient={{
                  id: selectedTherapist.id,
                  name: selectedTherapist.name,
                  firstName: selectedTherapist.firstName,
                  lastName: selectedTherapist.lastName,
                  email: selectedTherapist.email,
                  phone: selectedTherapist.phone,
                  status: "Active",
                  joinDate: "2020-01-01",
                  lastSession: "2024-06-01",
                }}
                onBackClick={handleBackToList}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  motif={<LineMeet className="h-28 w-28" />}
                  title={t("messages_empty_title", "Nog geen berichten")}
                  description={t(
                    "messages_empty_body_client",
                    "Hier praat je veilig met je begeleider tussen de sessies door."
                  )}
                />
              </div>
            )}
          </div>
        )}
      </DashboardLayout>
    );
  }

  // Therapist view - shows client selector and conversation
  return (
    <DashboardLayout
      userType={userType as "therapist" | "client"}
      contentClassName="!p-0"
    >
      {isMobile ? (
        <div className="h-screen flex flex-col">
          {!showConversation ? (
            <ClientSelector
              onSelectClient={handleSelectClient}
              selectedClient={selectedClient}
              preselectedClientId={clientIdParam}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              <ConversationInterface
                selectedClient={selectedClient}
                isPayingTherapist={isPayingTherapist}
                onBackClick={handleBackToList}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="h-screen flex">
          <ClientSelector
            onSelectClient={handleSelectClient}
            selectedClient={selectedClient}
            preselectedClientId={clientIdParam}
          />
          {selectedClient ? (
            <ConversationInterface
              selectedClient={selectedClient}
              isPayingTherapist={isPayingTherapist}
              onBackClick={handleBackToList}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                motif={<LineMeet className="h-28 w-28" />}
                title={t("messages_empty_title", "Nog geen berichten")}
                description={t(
                  "messages_empty_body_provider",
                  "Kies een cliënt om veilig verder te praten tussen de sessies door."
                )}
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Messages;
