
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (mode: boolean) => void;
  pendingPasswordChange: boolean;
  setPendingPasswordChange: (pending: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

interface EditModeProviderProps {
  children: ReactNode;
}

export const EditModeProvider: React.FC<EditModeProviderProps> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingPasswordChange, setPendingPasswordChange] = useState(false);

  return (
    <EditModeContext.Provider 
      value={{ 
        isEditMode, 
        setIsEditMode, 
        pendingPasswordChange, 
        setPendingPasswordChange 
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
};

export const useEditMode = () => {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
};
