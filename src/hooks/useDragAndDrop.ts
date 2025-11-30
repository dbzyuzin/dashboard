import { useCallback, useRef } from 'react';
import type { DragData } from '../types';

interface UseDragAndDropReturn {
  dragData: React.MutableRefObject<DragData | null>;
  handleDragStart: (e: React.DragEvent, type: 'link' | 'group', id: string, sourceGroupId: string | null) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (
    e: React.DragEvent,
    targetGroupId: string | null,
    targetIndex: number,
    onMoveLink: (linkId: string, fromGroupId: string | null, toGroupId: string | null, toIndex: number) => void,
    onMoveGroup: (groupId: string, toIndex: number) => void
  ) => void;
}

export function useDragAndDrop(): UseDragAndDropReturn {
  const dragData = useRef<DragData | null>(null);

  const handleDragStart = useCallback((
    e: React.DragEvent,
    type: 'link' | 'group',
    id: string,
    sourceGroupId: string | null
  ) => {
    dragData.current = { type, id, sourceGroupId };
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).classList.add('dragging');
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    dragData.current = null;
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
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      (e.currentTarget as HTMLElement).classList.remove('drag-over');
    }
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    targetGroupId: string | null,
    targetIndex: number,
    onMoveLink: (linkId: string, fromGroupId: string | null, toGroupId: string | null, toIndex: number) => void,
    onMoveGroup: (groupId: string, toIndex: number) => void
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');

    if (!dragData.current) return;

    const { type, id, sourceGroupId } = dragData.current;

    if (type === 'link') {
      onMoveLink(id, sourceGroupId, targetGroupId, targetIndex);
    } else if (type === 'group') {
      onMoveGroup(id, targetIndex);
    }

    dragData.current = null;
  }, []);

  return {
    dragData,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
