import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserX } from "lucide-react";
import BaseTable from "@/components/tables/BaseTable";
import { ConnectedTherapist } from "@/services/api/clientTherapistService";
import { useDisconnectFromTherapist } from "@/hooks/api/useOptimizedTherapists";
import { useTranslation } from "react-i18next";

interface TherapistsTableProps {
  therapists: ConnectedTherapist[];
}

const TherapistsTable = ({ therapists }: TherapistsTableProps) => {
  const { t } = useTranslation();
  const disconnectMutation = useDisconnectFromTherapist();

  const handleDisconnect = (therapistId: string, therapistName: string) => {
    disconnectMutation.mutate(therapistId);
  };

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "email", label: t("email"), className: "hidden md:table-cell" },
    { key: "phone", label: t("phone"), className: "hidden sm:table-cell" },
    { key: "specialization", label: t("specialization"), className: "hidden lg:table-cell" },
    { key: "status", label: t("status") },
  ];

  const actions = [
    {
      label: t("disconnect"),
      icon: <UserX className="mr-2 h-4 w-4" />,
      onClick: (therapist: ConnectedTherapist) =>
        handleDisconnect(therapist.id, therapist.name),
      className: "text-red-400 focus:text-red-500 cursor-pointer",
    },
  ];

  const renderCell = (therapist: ConnectedTherapist, column: any) => {
    switch (column.key) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={therapist.avatarUrl} alt={therapist.name} />
              <AvatarFallback className="bg-muted text-foreground text-sm">
                {therapist.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-foreground font-medium">{therapist.name}</span>
          </div>
        );
      case "email":
        return <span className="text-muted-foreground">{therapist.email}</span>;
      case "phone":
        return <span className="text-muted-foreground">{therapist.phone || t("n_a")}</span>;
      case "specialization":
        return <span className="text-muted-foreground">{therapist.specialization}</span>;
      case "status":
        return (
          <Badge className="bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/40">
            {t("connected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <BaseTable
      data={therapists}
      columns={columns}
      actions={actions}
      searchPlaceholder={t("search_therapists")}
      emptyMessage={t("no_therapists_connected")}
      renderCell={renderCell}
      getItemKey={(therapist) => therapist.id}
    />
  );
};

export default TherapistsTable;
