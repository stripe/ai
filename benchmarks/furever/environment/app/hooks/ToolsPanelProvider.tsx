'use client';
import React, {createContext, useContext, useState, useCallback} from 'react';

type IToolsContext = {
  open: boolean;
  handleOpenChange: (open: boolean) => void;
};

const ToolsContext = createContext<IToolsContext>({
  open: false,
  handleOpenChange: () => {},
});

export const useToolsContext = () => {
  return useContext(ToolsContext);
};

export const ToolsPanelProvider = ({children}: {children: React.ReactNode}) => {
  const localWindow = typeof window !== 'undefined' ? window : null;
  const [open, setOpen] = useState<boolean>(
    Boolean(Number(localWindow?.localStorage.getItem('toolsOpen')))
  );

  const handleOpenChange = useCallback(
    (toolsOpen: boolean) => {
      if (!localWindow) {
        return;
      }

      setOpen(toolsOpen);

      if (toolsOpen) {
        localWindow.localStorage.setItem('toolsOpen', '1');
        setOpen(true);
      } else {
        localWindow.localStorage.setItem('toolsOpen', '0');
        setOpen(false);
      }
    },
    [localWindow]
  );

  return (
    <ToolsContext.Provider value={{open, handleOpenChange}}>
      {children}
    </ToolsContext.Provider>
  );
};
