import { useState, useEffect } from "react";
import console from "@/lib/production-console";
import { 
  useOptimizedState, 
  useOptimizedEffect, 
  useOptimizedCallback 
} from "@/hooks/performance/useOptimizedComponents";

import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bot, Info, DollarSign, Zap, Eye, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIModel {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  pricing: {
    input: string;
    output: string;
  };
  features: string[];
  category: "flagship" | "fast" | "reasoning" | "legacy";
}

const AI_MODELS: AIModel[] = [
  {
    id: "o3-2025-04-16",
    name: "o3",
    description:
      "Very powerful reasoning model for complex multi-step problems",
    capabilities: ["Text", "Code", "Images", "Advanced reasoning"],
    pricing: {
      input: "$60.00 / 1M tokens",
      output: "$240.00 / 1M tokens",
    },
    features: ["Advanced reasoning", "Multi-step analysis", "Research-grade"],
    category: "reasoning",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Older powerful model with vision capabilities",
    capabilities: ["Text", "Vision", "Function calling"],
    pricing: {
      input: "$5.00 / 1M tokens",
      output: "$15.00 / 1M tokens",
    },
    features: ["Vision capable", "Reliable", "Established"],
    category: "legacy",
  },
  {
    id: "o4-mini-2025-04-16",
    name: "o4 Mini",
    description: "Fast reasoning model optimized for coding and visual tasks",
    capabilities: ["Text", "Code", "Images", "Fast reasoning"],
    pricing: {
      input: "$3.00 / 1M tokens",
      output: "$12.00 / 1M tokens",
    },
    features: [
      "Fast reasoning",
      "Coding optimized",
      "Visual tasks",
      "Efficient",
    ],
    category: "reasoning",
  },
  {
    id: "gpt-4.1-2025-04-14",
    name: "GPT-4.1",
    description: "The flagship model with superior reasoning and intelligence",
    capabilities: ["Text", "Vision", "Function calling", "JSON mode"],
    pricing: {
      input: "$0.50 / 1M tokens",
      output: "$2.00 / 1M tokens",
    },
    features: [
      "Most capable",
      "Best reasoning",
      "Supports images",
      "200K context",
    ],
    category: "flagship",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Affordable and fast model with vision capabilities",
    capabilities: ["Text", "Vision", "Function calling"],
    pricing: {
      input: "$0.15 / 1M tokens",
      output: "$0.60 / 1M tokens",
    },
    features: ["Fast", "Vision capable", "Cost-effective", "128K context"],
    category: "fast",
  },
  {
    id: "gpt-4.1-mini-2025-04-14",
    name: "GPT-4.1 Mini",
    description: "Most affordable model balancing speed and intelligence",
    capabilities: ["Text", "Vision", "Function calling"],
    pricing: {
      input: "$0.10 / 1M tokens",
      output: "$0.40 / 1M tokens",
    },
    features: [
      "Fastest",
      "Most cost-effective",
      "Good for most tasks",
      "128K context",
    ],
    category: "fast",
  },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "flagship":
      return "bg-neutral-600 hover:bg-neutral-700 text-white";
    case "fast":
      return "bg-neutral-600 hover:bg-neutral-700 text-white";
    case "reasoning":
      return "bg-neutral-600 hover:bg-neutral-700 text-white";
    case "legacy":
      return "bg-neutral-600 hover:bg-neutral-700 text-white";
    default:
      return "bg-neutral-600 hover:bg-neutral-700 text-white";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "flagship":
      return <Brain className="h-4 w-4" />;
    case "fast":
      return <Zap className="h-4 w-4" />;
    case "reasoning":
      return <Bot className="h-4 w-4" />;
    case "legacy":
      return <Eye className="h-4 w-4" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

const AdminAISettings = () => {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useOptimizedState(true);
  const [selectedModel, setSelectedModel] = useOptimizedState("gpt-4.1-2025-04-14");
  const [loading, setLoading] = useOptimizedState(false); // Always false for instant loading
  const [saving, setSaving] = useOptimizedState(false);

  useOptimizedEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const { data: settings, error } = await supabase
        .from("ai_settings")
        .select("setting_name, setting_value")
        .in("setting_name", ["ai_api_enabled", "ai_model_config"]);

      if (error) throw error;

      settings?.forEach((setting) => {
        if (setting.setting_name === "ai_api_enabled") {
          const value = setting.setting_value as { enabled?: boolean };
          setIsEnabled(value.enabled || false);
        } else if (setting.setting_name === "ai_model_config") {
          const value = setting.setting_value as { model?: string };
          setSelectedModel(value.model || "gpt-4.1-2025-04-14");
        }
      });
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      toast.error("Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingName: string, settingValue: any) => {
    try {
      const { error } = await supabase.from("ai_settings").upsert(
        {
          setting_name: settingName,
          setting_value: settingValue,
        },
        {
          onConflict: "setting_name",
        }
      );

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating ${settingName}:`, error);
      throw error;
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      setSaving(true);
      await updateSetting("ai_api_enabled", { enabled });
      setIsEnabled(enabled);
      toast.success(t(enabled ? "ai_api_enabled" : "ai_api_disabled"));
    } catch (error) {
      toast.error("Failed to update AI API status");
    } finally {
      setSaving(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    try {
      setSaving(true);
      await updateSetting("ai_model_config", {
        model: modelId,
        max_tokens: 1000,
        temperature: 0.7,
      });
      setSelectedModel(modelId);
      toast.success(t("ai_model_updated"));
    } catch (error) {
      toast.error("Failed to update AI model");
    } finally {
      setSaving(false);
    }
  };

  const selectedModelData = AI_MODELS.find((m) => m.id === selectedModel);

  if (loading) {
    return (
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-[#1f1f23] rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-[#1f1f23] rounded mb-4"></div>
            <div className="h-4 bg-[#1f1f23] rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI API Status */}
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-white text-lg">
              {t('ai_api_configuration')}
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400 text-sm">
            {t('control_ai_functionality')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">{t('enable_ai_api')}</h4>
              <p className="text-sm text-gray-400">
                {t('allow_users_to_interact')}
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving}
            />
          </div>

          <div className="pt-4 border-t border-[#1f1f23]">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-medium text-white">{t('current_status')}</h4>
              <Badge
                variant={isEnabled ? "default" : "secondary"}
                className={
                  isEnabled
                    ? "bg-neutral-100 text-gray-700 border-neutral-200 hover:bg-neutral-100"
                    : "bg-[#1f1f23] text-gray-400 border-[#333] hover:bg-[#1f1f23]"
                }
              >
                {isEnabled ? t('active') : t('disabled')}
              </Badge>
            </div>
            {isEnabled && selectedModelData && (
              <div className="text-sm text-gray-300">
                {t('using')}{" "}
                <span className="font-medium text-white">
                  {selectedModelData.name}
                </span>{" "}
                - {selectedModelData.description}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-white text-lg">
              {t('ai_model_selection')}
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400 text-sm">
            {t('choose_ai_model')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              {t('select_model')}
            </label>
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
              disabled={saving}
            >
              <SelectTrigger className="bg-[#0a0a0a] border-[#1f1f23] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-[#1f1f23]">
                {AI_MODELS.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="text-white hover:bg-[#1f1f23] focus:bg-[#1f1f23]"
                  >
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(model.category)}
                      <span>{model.name}</span>
                      <Badge
                        className={`ml-2 ${getCategoryColor(
                          model.category
                        )} text-xs`}
                      >
                        {model.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Details */}
          {selectedModelData && (
            <div className="mt-6 p-4 border border-[#1f1f23] rounded-lg bg-[#0a0a0a]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="font-medium text-white flex items-center gap-2">
                    {selectedModelData.name}
                    <Badge
                      className={`${getCategoryColor(
                        selectedModelData.category
                      )}`}
                    >
                      {selectedModelData.category}
                    </Badge>
                  </h5>
                  <p className="text-sm text-gray-400 mt-1">
                    {selectedModelData.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 border border-[#1f1f23] rounded-lg bg-[#0a0a0a]">
                {/* Flex container for Key Features, Capabilities, and Pricing */}
                <div className="flex flex-col md:flex-row gap-4 mb-1">
                  {/* Left side: Key Features */}
                  <div className="flex-1">
                    <h6 className="text-sm font-medium text-white mb-2">
                      {t('key_features')}
                    </h6>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {selectedModelData.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* First vertical line (hidden on mobile) */}
                  <div className="border-l border-gray-500 mx-4 md:block hidden" />
                  {/* Horizontal line between sections on mobile */}
                  <div className="md:hidden border-t border-gray-500 mt-4" />

                  {/* Center: Capabilities */}
                  <div className="flex-1">
                    <h6 className="text-sm font-medium text-white mb-2">
                      {t('capabilities')}
                    </h6>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {selectedModelData.capabilities.map((cap, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Second vertical line (hidden on mobile) */}
                  <div className="border-l border-gray-500 mx-4 md:block hidden" />

                  {/* Horizontal line after Capabilities (on mobile) */}
                  <div className="md:hidden border-t border-gray-500 mt-4" />

                  {/* Right side: Pricing */}
                  <div className="flex-1">
                    <h6 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {t('pricing')}
                    </h6>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>{t('input')}: {selectedModelData.pricing.input}</div>
                      <div>{t('output')}: {selectedModelData.pricing.output}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison */}
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Info className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-white text-lg">
              {t('model_comparison')}
            </CardTitle>
          </div>
          <CardDescription className="text-gray-400 text-sm">
            {t('compare_ai_models')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {AI_MODELS.map((model) => (
              <div
                key={model.id}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedModel === model.id
                    ? "border-neutral-500 bg-neutral-400/20"
                    : "border-[#1f1f23] bg-[#0a0a0a] hover:border-neutral-500"
                }`}
                onClick={() => handleModelChange(model.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h6 className="font-medium text-white flex items-center gap-2">
                    {getCategoryIcon(model.category)}
                    {model.name}
                  </h6>
                  <Badge
                    className={`${getCategoryColor(model.category)} text-xs`}
                  >
                    {model.category}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {model.description}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">
                    {t('input')}: {model.pricing.input}
                  </span>
                  <span className="text-gray-300">
                    {t('output')}: {model.pricing.output}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAISettings;
