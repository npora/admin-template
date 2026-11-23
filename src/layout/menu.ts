import type { MenuItem } from '@/router/types'

export function containsMenuPath(item: MenuItem, path: string | undefined): boolean {
  return (
    item.path === path || Boolean(item.children?.some((child) => containsMenuPath(child, path)))
  )
}

export function firstMenuPage(item: MenuItem): MenuItem {
  let page = item
  while (page.children?.[0]) page = page.children[0]
  return page
}

export function menuLocation(item: MenuItem) {
  return {
    path: item.path,
    query: Object.fromEntries(
      Object.entries(item.routeQuery ?? {}).map(([key, value]) => [key, String(value)])
    )
  }
}
