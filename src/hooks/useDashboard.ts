import { useCallback } from 'react';
import type { DashboardData, Link, LinkGroup } from '../types';

interface UseDashboardReturn {
  addGroup: (name: string, color: string) => void;
  deleteGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<LinkGroup>) => void;
  addLink: (link: Omit<Link, 'id' | 'createdAt'>, groupId: string | null) => void;
  deleteLink: (linkId: string, groupId: string | null) => void;
  updateLink: (linkId: string, groupId: string | null, updates: Partial<Link>) => void;
  moveLink: (linkId: string, fromGroupId: string | null, toGroupId: string | null, toIndex: number) => void;
  moveGroup: (groupId: string, toIndex: number) => void;
}

export function useDashboard(
  data: DashboardData | null,
  updateDashboard: (data: DashboardData) => Promise<void>
): UseDashboardReturn {
  const addGroup = useCallback((name: string, color: string) => {
    if (!data) return;

    const newGroup: LinkGroup = {
      id: crypto.randomUUID(),
      name,
      color,
      links: [],
      order: data.groups.length,
      isCollapsed: false,
    };

    updateDashboard({
      ...data,
      groups: [...data.groups, newGroup],
    });
  }, [data, updateDashboard]);

  const deleteGroup = useCallback((groupId: string) => {
    if (!data) return;

    const group = data.groups.find(g => g.id === groupId);
    const linksToMove = group?.links || [];

    updateDashboard({
      ...data,
      groups: data.groups.filter(g => g.id !== groupId),
      rootLinks: [...data.rootLinks, ...linksToMove],
    });
  }, [data, updateDashboard]);

  const updateGroup = useCallback((groupId: string, updates: Partial<LinkGroup>) => {
    if (!data) return;

    updateDashboard({
      ...data,
      groups: data.groups.map(g =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    });
  }, [data, updateDashboard]);

  const addLink = useCallback((link: Omit<Link, 'id' | 'createdAt'>, groupId: string | null) => {
    if (!data) return;

    const newLink: Link = {
      ...link,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    if (groupId) {
      updateDashboard({
        ...data,
        groups: data.groups.map(g =>
          g.id === groupId ? { ...g, links: [...g.links, newLink] } : g
        ),
      });
    } else {
      updateDashboard({
        ...data,
        rootLinks: [...data.rootLinks, newLink],
      });
    }
  }, [data, updateDashboard]);

  const deleteLink = useCallback((linkId: string, groupId: string | null) => {
    if (!data) return;

    if (groupId) {
      updateDashboard({
        ...data,
        groups: data.groups.map(g =>
          g.id === groupId
            ? { ...g, links: g.links.filter(l => l.id !== linkId) }
            : g
        ),
      });
    } else {
      updateDashboard({
        ...data,
        rootLinks: data.rootLinks.filter(l => l.id !== linkId),
      });
    }
  }, [data, updateDashboard]);

  const updateLink = useCallback((linkId: string, groupId: string | null, updates: Partial<Link>) => {
    if (!data) return;

    if (groupId) {
      updateDashboard({
        ...data,
        groups: data.groups.map(g =>
          g.id === groupId
            ? {
                ...g,
                links: g.links.map(l =>
                  l.id === linkId ? { ...l, ...updates } : l
                ),
              }
            : g
        ),
      });
    } else {
      updateDashboard({
        ...data,
        rootLinks: data.rootLinks.map(l =>
          l.id === linkId ? { ...l, ...updates } : l
        ),
      });
    }
  }, [data, updateDashboard]);

  const moveLink = useCallback((
    linkId: string,
    fromGroupId: string | null,
    toGroupId: string | null,
    toIndex: number
  ) => {
    if (!data) return;

    let link: Link | undefined;

    if (fromGroupId) {
      const group = data.groups.find(g => g.id === fromGroupId);
      link = group?.links.find(l => l.id === linkId);
    } else {
      link = data.rootLinks.find(l => l.id === linkId);
    }

    if (!link) return;

    let newData = { ...data };

    if (fromGroupId) {
      newData = {
        ...newData,
        groups: newData.groups.map(g =>
          g.id === fromGroupId
            ? { ...g, links: g.links.filter(l => l.id !== linkId) }
            : g
        ),
      };
    } else {
      newData = {
        ...newData,
        rootLinks: newData.rootLinks.filter(l => l.id !== linkId),
      };
    }

    if (toGroupId) {
      newData = {
        ...newData,
        groups: newData.groups.map(g => {
          if (g.id !== toGroupId) return g;
          const links = [...g.links];
          links.splice(toIndex, 0, link!);
          return { ...g, links };
        }),
      };
    } else {
      const rootLinks = [...newData.rootLinks];
      rootLinks.splice(toIndex, 0, link);
      newData = { ...newData, rootLinks };
    }

    updateDashboard(newData);
  }, [data, updateDashboard]);

  const moveGroup = useCallback((groupId: string, toIndex: number) => {
    if (!data) return;

    const groupIndex = data.groups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;

    const groups = [...data.groups];
    const [group] = groups.splice(groupIndex, 1);
    groups.splice(toIndex, 0, group);

    updateDashboard({
      ...data,
      groups: groups.map((g, i) => ({ ...g, order: i })),
    });
  }, [data, updateDashboard]);

  return {
    addGroup,
    deleteGroup,
    updateGroup,
    addLink,
    deleteLink,
    updateLink,
    moveLink,
    moveGroup,
  };
}
