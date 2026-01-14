import { createContext, useContext, useState, type ReactNode, type ReactElement } from 'react';

export interface HeaderAction {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  type?: 'button' | 'file-upload';
  accept?: string;
  onFileChange?: (file: File) => void;
}

interface HeaderContextValue {
  actions: HeaderAction[];
  setActions: (actions: HeaderAction[]) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }): ReactElement {
  const [actions, setActions] = useState<HeaderAction[]>([]);

  return (
    <HeaderContext.Provider value={{ actions, setActions }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader(): HeaderContextValue {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}
