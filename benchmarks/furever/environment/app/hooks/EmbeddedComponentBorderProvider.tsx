'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type IEmbeddedComponentBorderContext = {
  enableBorder: boolean;
  handleEnableBorderChange: (enableBorder: boolean) => void;
};

const EmbeddedComponentBorderContext =
  createContext<IEmbeddedComponentBorderContext>({
    enableBorder: false,
    handleEnableBorderChange: () => {},
  });

export const useEmbeddedComponentBorder = () => {
  return useContext(EmbeddedComponentBorderContext);
};

export const EmbeddedComponentBorderProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const localWindow = typeof window !== 'undefined' ? window : null;

  const [enableBorder, setEnableBorder] = useState<boolean>(
    Boolean(Number(localWindow?.localStorage.getItem('enableBorder')))
  );

  const handleEnableBorderChange = useCallback(
    (enableBorder: boolean) => {
      if (!localWindow) {
        return;
      }

      if (enableBorder) {
        localWindow.localStorage.setItem('enableBorder', '1');
        setEnableBorder(true);
      } else {
        localWindow.localStorage.setItem('enableBorder', '0');
        setEnableBorder(false);
      }
    },
    [localWindow]
  );

  useEffect(() => {
    const handleToggleBorder = (e: KeyboardEvent) => {
      if (e.key === 'b' && e.metaKey && localWindow) {
        if (Number(localWindow.localStorage.getItem('enableBorder'))) {
          handleEnableBorderChange(false);
        } else {
          handleEnableBorderChange(true);
        }
      }
    };

    // Keyboard shortcut to enable/disable border
    document.addEventListener('keydown', handleToggleBorder);
    () => document.removeEventListener('keydown', handleToggleBorder);
  }, [handleEnableBorderChange, localWindow]);

  return (
    <EmbeddedComponentBorderContext.Provider
      value={{enableBorder, handleEnableBorderChange}}
    >
      {children}
    </EmbeddedComponentBorderContext.Provider>
  );
};
