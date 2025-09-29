import React from 'react';

// Base component template
// Component: Card
export interface CardProps {
  id: string;
  className?: string;
}

export const Card: React.FC<CardProps> = (props) => {
  return (
    <div id={props.id} className={props.className}>
      <header />
      <section />
      <footer />
    </div>
  );
};