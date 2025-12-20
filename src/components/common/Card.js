import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  className = '',
  hoverable = false,
  padding = 'md',
  onClick
}) => {
  const cardClasses = `
    card 
    card-padding-${padding}
    ${hoverable ? 'card-hoverable' : ''}
    ${onClick ? 'card-clickable' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
