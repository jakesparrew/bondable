import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplates, useCreateTemplate, useDeleteTemplate } from "@/hooks/api/useIntakeTemplates";
import { format } from "date-fns";

export default function IntakeTemplatesPage() {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useIntakeTemplates(therapistId);
  const createMut = useCreateTemplate(therapistId);
  const deleteMut = useDeleteTemplate(therapistId);

  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const onCreate = async () => {
    if (!title.trim()) return;
    const row = await createMut.mutateAsync({ title: title.trim(), description: description.trim() || undefined, category: category.trim() || undefined });
    setNewOpen(false);
    setTitle(""); setDescription(""); setCategory("");
    navigate(`/dashboard/therapist/intake-forms/${row.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white font-semibold">{t("intake:title")}</h1>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-gray-100">{t("intake:new_template")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("intake:new_template")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder={t("intake:template_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder={t("intake:template_category")} value={category} onChange={(e) => setCategory(e.target.value)} />
                <Textarea placeholder={t("intake:template_description")} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={onCreate} disabled={!title.trim() || createMut.isPending}>
                  {createMut.isPending ? t("intake:saving") : t("intake:new_template")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-gray-400">{t("intake:saving")}</p>
        ) : templates.length === 0 ? (
          <Card className="bg-[#111] border-[#1f1f23]">
            <CardContent className="p-8 text-center text-gray-400">{t("intake:no_templates")}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="bg-[#111] border-[#1f1f23] hover:border-[#2a2a2a] cursor-pointer"
                    onClick={() => navigate(`/dashboard/therapist/intake-forms/${tpl.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-base">{tpl.title}</CardTitle>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <Badge variant={tpl.is_published ? "default" : "outline"}>
                        {tpl.is_published ? t("intake:published") : t("intake:draft")}
                      </Badge>
                      {tpl.category && <span>· {tpl.category}</span>}
                      <span>· {format(new Date(tpl.updated_at), "PP")}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("intake:delete_template_confirm"))) deleteMut.mutate(tpl.id);
                  }}>{t("intake:delete_template")}</Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
