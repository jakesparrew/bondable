/**
 * WelcomeModal — shows ONCE per role, ever (R15 sanctions a modal for the
 * role-welcome moment). Calm, no confetti, no exclamation marks. Uses a line
 * motif, not mint (this is not an AI surface).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import LineLoop from '@/components/illustration/LineLoop';
import LineBranch from '@/components/illustration/LineBranch';
import { onboardingService } from './onboardingService';
import type { OnboardingRole } from './types';

interface WelcomeModalProps {
  role: OnboardingRole;
}

const WelcomeModal = ({ role }: WelcomeModalProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!onboardingService.hasSeenWelcome(role)) {
      const id = window.setTimeout(() => setOpen(true), 350);
      return () => window.clearTimeout(id);
    }
  }, [role]);

  const close = () => {
    onboardingService.markWelcomeSeen(role);
    setOpen(false);
  };

  const isProvider = role === 'provider';

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? close() : setOpen(o))}>
      <DialogContent className="max-w-md">
        <div className="flex justify-center pt-2">
          {isProvider ? (
            <LineBranch className="h-20 w-20 text-primary/50" />
          ) : (
            <LineLoop className="h-20 w-20 text-primary/50" />
          )}
        </div>
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-display text-display-md">
            {isProvider
              ? t('ob_welcome_prov_title', 'Welkom bij Bondable')
              : t('ob_welcome_cli_title', 'Welkom, fijn dat je er bent')}
          </DialogTitle>
          <DialogDescription className="text-body">
            {isProvider
              ? t(
                  'ob_welcome_prov_body',
                  'Beheer je praktijk op één plek: cliënten, sessies, taken en je publieke profiel. We loodsen je in een paar stappen op weg.',
                )
              : t(
                  'ob_welcome_cli_body',
                  'Dit is jouw plek. Alles wat je hier deelt, blijft tussen jou en je begeleider. We houden het rustig en op jouw tempo.',
                )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className="w-full" onClick={close}>
            {isProvider
              ? t('ob_welcome_prov_cta', 'Aan de slag')
              : t('ob_welcome_cli_cta', 'Laat maar zien')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeModal;
