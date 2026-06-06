import React from 'react';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => (
  <div className="enigma-section-header">
    <h2>{title}</h2>
    {action}
  </div>
);

export default SectionHeader;
