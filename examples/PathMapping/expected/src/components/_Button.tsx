import React from 'react';

// Base component template
// Component: Button
export interface ButtonProps {
  id: string;
  className?: string;
}

export const Button: React.FC<ButtonProps> = (props) => {
  return (
    <div id={props.id} className={props.className}>
      <span />
    </div>
  );
};