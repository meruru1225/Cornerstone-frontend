export const extractPlainTextFromNode = (root: HTMLElement) => {
  const container = root.cloneNode(true) as HTMLElement
  container.querySelectorAll('.code-block__header, .code-block__lang-dropdown').forEach(node => node.remove())
  container.querySelectorAll('pre').forEach(pre => {
    const codeEls = Array.from(pre.querySelectorAll('code'))
    if (codeEls.length > 1) {
      const lines = codeEls.map(codeEl => codeEl.textContent || '')
      pre.textContent = lines.join('\n')
    }
  })
  container.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  container.querySelectorAll('div, p, li, blockquote, pre, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.after(document.createTextNode('\n'))
  })
  const text = container.textContent || ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export const extractPlainTextFromHtml = (html: string) => {
  if (!html) return ''
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const container = document.createElement('div')
  container.innerHTML = html || ''
  return extractPlainTextFromNode(container)
}
