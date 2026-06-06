import React from 'react';

interface SubtitleRendererProps {
  text: string | null;
  raised: boolean; // lift above the controls bar when controls are visible
}

const SubtitleRenderer: React.FC<SubtitleRendererProps> = ({ text, raised }) => {
  if (!text) return null;
  return (
    <div className={`enigma-subtitle ${raised ? 'raised' : ''}`}>
      {text.split('\n').map((line, i) => (
        <span key={i}>{line}</span>
      ))}
    </div>
  );
};

export default SubtitleRenderer;
