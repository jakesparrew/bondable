import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const SendTestPushButton = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Not signed in", description: "Please sign in to send a test push." });
        return;
      }

      const { data, error } = await supabase.functions.invoke("send-push", {
        body: {
          userId: user.id,
          title: "Test notification",
          body: "If you see this, push works!",
          data: { kind: "test" },
        },
      });

      if (error) throw error as any;

      const sent = (data as any)?.sent ?? 0;
      toast({ title: "Push sent", description: `Sent to ${sent} device(s).` });
    } catch (e: any) {
      toast({ title: "Failed to send push", description: String(e.message || e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleSend} disabled={loading} aria-label="Send test push">
      {loading ? "Sending..." : "Send test push"}
    </Button>
  );
};

export default SendTestPushButton;
