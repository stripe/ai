import React from 'react';

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

const Container = ({children, className}: ContainerProps) => {
  return (
    <div className={`bg-screen-foreground ${className} rounded-lg border p-4`}>
      {children}
    </div>
  );
};

export default Container;
