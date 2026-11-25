import { h } from 'vue'

function svgIcon(path: string) {
  return () =>
    h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 1.65,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': true
      },
      [h('path', { d: path })]
    )
}

export const localIcons = {
  'nova-workspace': svgIcon('M4 5h16v14H4zM4 9h16m-9 0v10m3-6h3m-3 3h3'),
  'nova-workflow': svgIcon('M3 4h6v5H3zm12 11h6v5h-6zM6 9v7h6m-2-2 2 2-2 2M12 6h6v6m-2-2 2 2 2-2'),
  'nova-insights': svgIcon('M4 4v16h16M7 15l4-4 3 2 5-6m-4 0h4v4'),
  'nova-library': svgIcon('M5 4h5v16H5zm5 0h5v16h-5zm7 1 3-1 3 14-3 1M6.5 8h2m3 0h2'),
  'nova-shield': svgIcon('M12 3l7 3v5c0 4.2-2.5 7.6-7 10-4.5-2.4-7-5.8-7-10V6zm-3 9 2 2 4-4'),
  'nova-screen-lock': svgIcon('M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3m-4 4v2'),
  'nova-archive': svgIcon('M4 4h16v4H4zm1 4v12h14V8m-9 4h4m-2 2v3')
}
