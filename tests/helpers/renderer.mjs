import { createRenderer } from 'vue'

export const node = (type) => ({ type, parent: null, children: [], props: {}, text: '' })
const remove = (child) => {
  if (!child.parent) return
  const siblings = child.parent.children
  siblings.splice(siblings.indexOf(child), 1)
  child.parent = null
}
export const renderer = createRenderer({
  createElement: node,
  createText: (text) => ({ ...node('text'), text }),
  createComment: (text) => ({ ...node('comment'), text }),
  setText: (target, text) => {
    target.text = text
  },
  setElementText: (target, text) => {
    target.text = text
    target.children = []
  },
  parentNode: (target) => target.parent,
  nextSibling: (target) =>
    target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _old, value) => {
    target.props[key] = value
  },
  remove,
  insert: (child, parent, anchor = null) => {
    remove(child)
    const position = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(position < 0 ? parent.children.length : position, 0, child)
    child.parent = parent
  }
})
