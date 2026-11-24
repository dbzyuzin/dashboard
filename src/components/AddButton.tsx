interface AddButtonProps {
  onClick: () => void;
  title: string;
  label?: string;
}

export function AddButton({ onClick, title, label }: AddButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-text-muted
               hover:text-accent hover:bg-bg-tertiary transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
      {label && <span>{label}</span>}
    </button>
  );
}
