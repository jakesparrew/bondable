import DashboardLayout from "@/components/layout/DashboardLayout";
import console from "@/lib/production-console";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Edit,
  Trash2,
  Type,
  Plus,
  Target,
  FileText,
  ArrowRight,
  X,
  MinusIcon,
} from "lucide-react";
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import { useTranslation } from "react-i18next";

interface SessionDetail {
  id: string;
  title: string;
  clientName?: string;
  therapistName?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  address?: AddressType;
  type: "in-person" | "video" | "phone";
  status: "upcoming" | "completed" | "cancelled";
  notes?: string;
  objectives?: string[];
  nextSteps?: string;
}

const SessionDetail = () => {
  const { t } = useTranslation();
  const { userType, sessionId } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useOptimizedState(false);
  const [showObjectives, setShowObjectives] = useOptimizedState(false);
  const [showNotes, setShowNotes] = useOptimizedState(false);
  const [showNextSteps, setShowNextSteps] = useOptimizedState(false);
  const [searchInput, setSearchInput] = useOptimizedState("");
  const hideForNow = false;

  // Mock data - in a real app this would come from an API
  const [session, setSession] = useOptimizedState<SessionDetail>({
    id: sessionId || "1",
    title: t("therapy_session"),
    clientName: userType === "therapist" ? "John Doe" : undefined,
    therapistName: userType === "client" ? "Dr. Sarah Smith" : undefined,
    date: "2025-06-08",
    startTime: "10:00",
    endTime: "11:00",
    location: t("room_101"),
    address: {
      address1: "123 Main St",
      address2: "",
      formattedAddress: "123 Main St, Room 101, City, State 12345",
      city: "City",
      region: "State",
      postalCode: "12345",
      country: "US",
      lat: 0,
      lng: 0,
    },
    type: "in-person",
    status: "upcoming",
    notes: "",
    objectives: [],
    nextSteps: "",
  });

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "phone":
        return <Phone className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-UK", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  const handleBack = () => {
    navigate(`/dashboard/${userType}/sessions`);
  };

  const isTherapist = userType === "therapist";

  const addObjective = () => {
    setSession({
      ...session,
      objectives: [...(session.objectives || []), ""],
    });
    setShowObjectives(true);
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...(session.objectives || [])];
    newObjectives[index] = value;
    setSession({ ...session, objectives: newObjectives });
  };

  const removeObjective = (index: number) => {
    const newObjectives =
      session.objectives?.filter((_, i) => i !== index) || [];
    setSession({ ...session, objectives: newObjectives });
    if (newObjectives.length === 0) {
      setShowObjectives(false);
    }
  };

  const hasAnyContent =
    showObjectives ||
    (session.objectives && session.objectives.length > 0) ||
    showNotes ||
    session.notes ||
    showNextSteps ||
    session.nextSteps;

  // Fixed logic: buttons should show when editing is true
  const shouldShowAddButtons = !hasAnyContent && isEditing;

  const handleAddressChange = (newAddress: AddressType) => {
    setSession({
      ...session,
      address: newAddress,
      location: newAddress.address1 || newAddress.formattedAddress,
    });
  };

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">{session.title}</h1>
              <p className="text-sm text-neutral-400">
                {formatDate(session.date)} • {session.startTime} -{" "}
                {session.endTime}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={getStatusBadgeColor(session.status)}
          >
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </div>

        {/* Session Details Card */}
        <Card className="overflow-visible bg-neutral-900 border border-neutral-800">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 md:divide-y-0 md:divide-x divide-neutral-700 ">
              {/* Date */}
              <div className="p-4 hover:bg-neutral-800 rounded-tl-lg group transition-colors">
                <div className="flex items-center gap-3 mb-3 ">
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-50 transition-colors group-hover:bg-neutral-700">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-neutral-50">
                    {t("date")}
                  </span>
                </div>
                {isEditing && isTherapist ? (
                  <SimpleDatePicker
                    label=""
                    defaultValue={session.date}
                    onChange={(date) => setSession({ ...session, date })}
                    className="bg-neutral-800 border-neutral-700 text-neutral-50 !mt-0"
                  />
                ) : (
                  <p className="font-semibold text-sm leading-tight text-neutral-400">
                    {formatDate(session.date)}
                  </p>
                )}
              </div>

              {/* Time */}
              <div className="p-4 hover:bg-neutral-800 group transition-colors">
                <div className="flex items-center gap-3 mb-1 ">
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-50 transition-colors group-hover:bg-neutral-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-neutral-50">
                    {t("time")}
                  </span>
                </div>
                {isEditing && isTherapist ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <TimePicker
                        label=""
                        value={session.startTime}
                        onChange={(time) =>
                          setSession({ ...session, startTime: time })
                        }
                        className="w-full bg-neutral-800 border-neutral-700 text-neutral-50"
                      />
                    </div>

                    <span className="text-xs text-neutral-400 whitespace-nowrap">
                      {t("to")}
                    </span>

                    <div className="flex-1">
                      <TimePicker
                        label=""
                        value={session.endTime}
                        onChange={(time) =>
                          setSession({ ...session, endTime: time })
                        }
                        className="w-full bg-neutral-800 border-neutral-700 text-neutral-50"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-sm text-neutral-400 pt-2">
                    {session.startTime} - {session.endTime}
                  </p>
                )}
              </div>

              {/* Type */}
              <div className="p-4 hover:bg-neutral-800 group transition-colors">
                <div className="flex items-center gap-3 mb-3 ">
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-50 transition-colors group-hover:bg-neutral-700">
                    {getSessionIcon(session.type)}
                  </div>
                  <span className="text-sm font-medium text-neutral-50">
                    {t("type")}
                  </span>
                </div>
                {isEditing && isTherapist ? (
                  <Select
                    value={session.type}
                    onValueChange={(value: "in-person" | "video" | "phone") =>
                      setSession({ ...session, type: value })
                    }
                  >
                    <SelectTrigger className="w-full bg-neutral-800 border-neutral-700 text-neutral-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem
                        value="in-person"
                        className="text-neutral-400 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                      >
                        {t("in_person")}
                      </SelectItem>
                      <SelectItem
                        value="video"
                        className="text-neutral-400 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                      >
                        {t("video_call")}
                      </SelectItem>
                      <SelectItem
                        value="phone"
                        className="text-neutral-400 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                      >
                        {t("phone_call")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-semibold text-sm capitalize text-neutral-400">
                    {session.type.replace("-", " ")}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="p-4 group hover:bg-neutral-800 rounded-tr-lg transition-colors">
                <div className="flex items-center gap-3 mb-3 ">
                  <div className="p-2 rounded-lg bg-neutral-800 text-neutral-50 transition-colors group-hover:bg-neutral-700">
                    <MapPin className="h-4 w-4 " />
                  </div>
                  <span className="text-sm font-medium text-neutral-50">
                    {t("location")}
                  </span>
                </div>
                {isEditing && isTherapist ? (
                  <div className="relative">
                    <AddressAutoComplete
                      address={
                        session.address || {
                          address1: "",
                          address2: "",
                          formattedAddress: "",
                          city: "",
                          region: "",
                          postalCode: "",
                          country: "",
                          lat: 0,
                          lng: 0,
                        }
                      }
                      setAddress={handleAddressChange}
                      searchInput={searchInput}
                      setSearchInput={setSearchInput}
                      dialogTitle={t("edit_session_location")}
                      placeholder={t("enter_session_location")}
                      className="bg-neutral-800 border-neutral-700 text-neutral-50"
                    />
                  </div>
                ) : (
                  <p className="font-semibold text-sm text-neutral-400">
                    {session.location || t("not_specified")}
                  </p>
                )}
              </div>
            </div>

            {/* Client/Therapist Info */}
            {(session.clientName || session.therapistName) && (
              <div className="px-4 py-3 border-t border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-neutral-800 text-neutral-50">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-neutral-50">
                      {userType === "therapist" ? t("client") : t("therapist")}
                    </span>
                    <p className="font-semibold text-sm text-neutral-400">
                      {session.clientName || session.therapistName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Information - Therapist Only */}
        {isTherapist && hideForNow && (
          <Card className="overflow-hidden bg-neutral-900 border border-neutral-800 shadow-lg">
            <CardHeader className="pb-6 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 border-b border-neutral-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl text-neutral-50 font-semibold">
              {t("session_information")}
                  </CardTitle>
                </div>
                {shouldShowAddButtons && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addObjective}
                      className="h-8 hover:text-neutral-900 hover:bg-neutral-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("add_objective")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNotes(true)}
                      className="h-8 hover:text-neutral-900 hover:bg-neutral-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("add_notes")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNextSteps(true)}
                      className="h-8 hover:text-neutral-900 hover:bg-neutral-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("add_next_steps")}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!hasAnyContent ? (
                <div className="text-center py-12">
                  <div className="text-neutral-50 mb-4">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50 " />
                    <p>No session information added yet</p>
                    {isEditing ? (
                      <p className="text-sm">
                        Use the buttons above to add objectives, notes, or next
                        steps
                      </p>
                    ) : (
                      <p className="text-sm">
                        Enter edit mode to add objectives, notes, or next steps
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Objectives */}
                  {(showObjectives ||
                    (session.objectives && session.objectives.length > 0)) && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-neutral-300" />
                          <h4 className="font-medium text-neutral-300">
                            {t("session_objectives")}
                          </h4>
                        </div>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            {!showNotes && !session.notes && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNotes(true)}
                                className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Notes
                              </Button>
                            )}
                            {!showNextSteps && !session.nextSteps && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNextSteps(true)}
                                className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Next Steps
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addObjective}
                              className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {session.objectives?.map((objective, index) => (
                          <div key={index} className="flex items-stretch gap-2">
                            <div className="w-2 h-2 bg-neutral-300 rounded-full flex-shrink-0 mt-4" />
                            <Input
                              value={objective}
                              onChange={(e) =>
                                updateObjective(index, e.target.value)
                              }
                              placeholder={t("enter_objective")}
                              className="flex-1 bg-neutral-800 border border-neutral-700 text-neutral-50"
                              readOnly={!isEditing}
                            />
                            {isEditing && (
                              <div className="flex flex-col">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeObjective(index)}
                                  className="h-full text-xs bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
                                >
                                  <MinusIcon />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {(showNotes || session.notes) && (
                    <div className="space-y-3 mt-4">
                      {(showObjectives ||
                        (session.objectives &&
                          session.objectives.length > 0)) && (
                        <hr className="-mx-6 w-[calc(100%+3rem)] border-t border-neutral-800 pb-1" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-neutral-300" />
                          <h4 className="font-medium text-neutral-300">
                            {t("session_notes")}
                          </h4>
                        </div>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            {!showObjectives &&
                              (!session.objectives ||
                                session.objectives.length === 0) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={addObjective}
                                  className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Objective
                                </Button>
                              )}
                            {!showNextSteps && !session.nextSteps && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNextSteps(true)}
                                className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Next Steps
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Textarea
                            value={session.notes || ""}
                            onChange={(e) =>
                              setSession({ ...session, notes: e.target.value })
                            }
                            placeholder={t("enter_session_notes")}
                            rows={4}
                            className="w-full bg-neutral-800 border border-neutral-600 text-neutral-50 "
                            readOnly={!isEditing}
                          />
                        </div>
                        {isEditing && (
                          <div className="flex flex-col">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSession({ ...session, notes: "" });
                                setShowNotes(false);
                              }}
                              className="h-full text-xs bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
                            >
                              <MinusIcon />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {(showNextSteps || session.nextSteps) && (
                    <div className="space-y-3 mt-4">
                      {(showNotes || session.notes) && (
                        <hr className="-mx-6 w-[calc(100%+3rem)] border-t border-neutral-800 pb-1" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-neutral-300" />
                          <h4 className="font-medium text-neutral-300">
                            {t("next_steps")}
                          </h4>
                        </div>
                        {isEditing && (
                          <div className="flex items-center gap-2">
                            {!showObjectives &&
                              (!session.objectives ||
                                session.objectives.length === 0) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={addObjective}
                                  className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Objective
                                </Button>
                              )}
                            {!showNotes && !session.notes && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNotes(true)}
                                className="h-8 text-xs hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Notes
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-stretch">
                        <Textarea
                          value={session.nextSteps || ""}
                          onChange={(e) =>
                            setSession({
                              ...session,
                              nextSteps: e.target.value,
                            })
                          }
                          placeholder={t("enter_next_steps")}
                          rows={3}
                          className="w-full bg-neutral-800 border border-neutral-600 text-neutral-50 "
                          readOnly={!isEditing}
                        />
                        {isEditing && (
                          <div className="flex flex-col justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSession({ ...session, nextSteps: "" });
                                setShowNextSteps(false);
                              }}
                              className="h-full text-xs bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-200"
                            >
                              <MinusIcon />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* Action Buttons - Therapist Only */}
      {isTherapist && (
        <div className="flex justify-end gap-3 mt-4">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-200 transition-all duration-200"
              >
                {t("cancel")}
              </Button>

              <Button
                onClick={() => {
                  setIsEditing(false);
                  console.log("Saving session changes:", session);
                }}
                className="hover:text-neutral-900 hover:bg-neutral-200 text-neutral-950 bg-neutral-50"
              >
                {t("save_changes")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-200 transition-all duration-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t("edit")}
              </Button>

              <Button
                variant="outline"
                className="px-6 py-2 bg-red-900/50 border-red-700/50 text-red-300 hover:bg-red-800/60 hover:border-red-600/60 hover:text-red-200 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("cancel_session")}
              </Button>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SessionDetail;
