import { useCallback } from 'react';

export interface DragItem {
  type: 'link' | 'group';
  id: string;
  sourceGroupId: string | null;
}

export function useDragAndDrop() {
  const handleDragStart = useCallback((
    e: React.DragEvent,
    item: DragItem
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      (e.currentTarget as HTMLElement).classList.remove('drag-over');
    }
  }, []);

  const getDragItem = useCallback((e: React.DragEvent): DragItem | null => {
    try {
      const data = e.dataTransfer.getData('application/json');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  return {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    getDragItem,
  };
}
