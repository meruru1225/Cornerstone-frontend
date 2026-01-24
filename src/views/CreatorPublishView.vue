<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPostApi, updatePostApi, getPostDetailApi, type PostMediaPayload } from '../api/post'
import { uploadMediaApi } from '../api/media'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

interface LocalMediaItem {
  url: string
  mime: string
  width?: number
  height?: number
  duration?: number
  previewUrl: string
  coverUrl?: string
}

const route = useRoute()
const router = useRouter()

const title = ref('')
const content = ref('')
const mediaList = ref<LocalMediaItem[]>([])
const isUploading = ref(false)
const isCoverUploading = ref(false)
const isSaving = ref(false)
const editorRef = ref<HTMLDivElement | null>(null)
const contentText = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const coverTargetIndex = ref<number | null>(null)
const codeLang = ref('plaintext')
const isHighlighting = ref(false)

const codeLangOptions = [
  { value: 'plaintext', label: '文本' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'markdown', label: 'Markdown' }
]

const editingId = computed(() => {
  const raw = route.query.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
})

const resetForm = async () => {
  title.value = ''
  content.value = ''
  mediaList.value = []
  await setEditorHtml('')
}

const toPayload = (): PostMediaPayload[] =>
  mediaList.value.map(media => ({
    url: media.url,
    mime_type: media.mime || undefined,
    width: media.width,
    height: media.height,
    duration: media.duration,
    cover_url: media.mime?.includes('video')
      ? (media.coverUrl || `${media.url}?vframe/jpg/offset/1`)
      : undefined
  }))

const triggerUpload = () => {
  fileInputRef.value?.click()
}

const triggerCoverUpload = (index: number) => {
  coverTargetIndex.value = index
  coverInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const files = Array.from(input.files)
  isUploading.value = true
  try {
    const uploads = await Promise.all(
      files.map(async file => {
        const previewUrl = URL.createObjectURL(file)
        const res: any = await uploadMediaApi(file)
        if (!res?.data) {
          URL.revokeObjectURL(previewUrl)
          return null
        }
        return {
          url: res.data.url,
          mime: res.data.mime,
          width: res.data.width,
          height: res.data.height,
          duration: res.data.duration,
          previewUrl,
          coverUrl: undefined
        } as LocalMediaItem
      })
    )
    const valid = uploads.filter(Boolean) as LocalMediaItem[]
    mediaList.value = mediaList.value.concat(valid)
  } catch (e) {
    ElMessage.error('上传失败，请稍后重试')
  } finally {
    isUploading.value = false
    if (input) input.value = ''
  }
}

const removeMedia = (index: number) => {
  const target = mediaList.value[index]
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl)
  }
  mediaList.value.splice(index, 1)
}

const removeCover = (index: number) => {
  const target = mediaList.value[index]
  if (!target) return
  target.coverUrl = undefined
}

const handleCoverChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const index = coverTargetIndex.value
  if (index === null || !input.files || input.files.length === 0) return
  const file = input.files[0]
  if (!file) return
  isCoverUploading.value = true
  try {
    const res: any = await uploadMediaApi(file)
    if (res?.data?.url) {
      const target = mediaList.value[index]
      if (target) {
        target.coverUrl = res.data.url
      }
    } else {
      ElMessage.error('封面上传失败，请稍后重试')
    }
  } catch (e) {
    ElMessage.error('封面上传失败，请稍后重试')
  } finally {
    isCoverUploading.value = false
    if (input) input.value = ''
  }
}

const setEditorHtml = async (value: string) => {
  await nextTick()
  const el = editorRef.value
  if (!el) return
  el.innerHTML = value || ''
  content.value = value || ''
  contentText.value = extractPlainTextFromNode(el)
  applyHighlightInEditor()
}

const updateEditorState = () => {
  const el = editorRef.value
  if (!el) return
  const html = el.innerHTML
  content.value = html === '<br>' ? '' : html
  contentText.value = extractPlainTextFromNode(el)
}

const sanitizeHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')

const extractPlainTextFromNode = (root: HTMLElement) => {
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

const extractPlainTextFromHtml = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html || ''
  return extractPlainTextFromNode(container)
}

const focusEditor = async () => {
  await nextTick()
  editorRef.value?.focus()
}

const wrapSelection = (tag: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (range.collapsed) return
  const wrapper = document.createElement(tag)
  wrapper.appendChild(range.extractContents())
  range.insertNode(wrapper)
  selection.removeAllRanges()
  const newRange = document.createRange()
  newRange.selectNodeContents(wrapper)
  selection.addRange(newRange)
}

const getCodeLangLabel = (value: string) =>
  codeLangOptions.find(item => item.value === value)?.label || '文本'

const getCodeBlockFromSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const node = selection.anchorNode
  if (!node) return null
  const element = node instanceof Element ? node : node.parentElement
  return element?.closest('.code-block') as HTMLElement | null
}

const getCodeLangFromElement = (element: Element) => {
  const dataLang = element.getAttribute('data-lang')
  if (dataLang) return dataLang
  const classLang = Array.from(element.classList).find(name => name.startsWith('language-'))
  return classLang ? classLang.replace('language-', '') : ''
}

const getOffsetsInElement = (element: HTMLElement) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return null
  const preRange = document.createRange()
  preRange.selectNodeContents(element)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length
  const preRangeEnd = document.createRange()
  preRangeEnd.selectNodeContents(element)
  preRangeEnd.setEnd(range.endContainer, range.endOffset)
  const end = preRangeEnd.toString().length
  return { start, end }
}

const setSelectionByOffsets = (element: HTMLElement, start: number, end: number) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let current = 0
  let startNode: Text | null = null
  let endNode: Text | null = null
  let startOffset = 0
  let endOffset = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const length = node.nodeValue?.length || 0
    if (!startNode && current + length >= start) {
      startNode = node
      startOffset = Math.max(0, start - current)
    }
    if (!endNode && current + length >= end) {
      endNode = node
      endOffset = Math.max(0, end - current)
    }
    if (startNode && endNode) break
    current += length
  }
  if (!startNode || !endNode) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  selection.removeAllRanges()
  selection.addRange(range)
}

const applyCodeLangToBlock = (block: HTMLElement, lang: string) => {
  block.setAttribute('data-lang', lang)
  const label = block.querySelector('.code-block__lang-label') as HTMLElement | null
  if (label) label.textContent = getCodeLangLabel(lang)
  const code = block.querySelector('pre code') as HTMLElement | null
  if (code) {
    code.className = ''
    if (lang && lang !== 'plaintext') {
      code.classList.add(`language-${lang}`)
    }
    code.setAttribute('data-lang', lang)
  }
}

const ensureCodeLangSelector = (block: HTMLElement) => {
  const header = block.querySelector('.code-block__header') as HTMLElement | null
  if (!header) return
  const existing = header.querySelector('.code-block__lang')
  if (existing) return
  const code = block.querySelector('pre code') as HTMLElement | null
  const currentLang = block.getAttribute('data-lang')
    || (code ? getCodeLangFromElement(code) : '')
    || 'plaintext'
  header.innerHTML = ''
  header.appendChild(createCodeLangSelect(block, currentLang))
}

const getActiveCodeElement = () => {
  const selection = window.getSelection()
  if (!selection?.anchorNode) return null
  const element = selection.anchorNode instanceof Element
    ? selection.anchorNode
    : selection.anchorNode.parentElement
  return element?.closest('pre code') as HTMLElement | null
}

const getActiveInlineCodeElement = () => {
  const selection = window.getSelection()
  if (!selection?.anchorNode) return null
  const element = selection.anchorNode instanceof Element
    ? selection.anchorNode
    : selection.anchorNode.parentElement
  const codeElement = element?.closest('code') as HTMLElement | null
  if (!codeElement) return null
  if (codeElement.closest('pre')) return null
  return codeElement
}

const insertTextAtSelection = (text: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

const insertInlineCodeAtSelection = () => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const code = document.createElement('code')
  const placeholder = document.createTextNode('\u200b')
  code.appendChild(placeholder)
  range.insertNode(code)
  const spacer = document.createTextNode(' ')
  code.parentNode?.insertBefore(spacer, code.nextSibling)
  const caret = document.createRange()
  caret.setStart(placeholder, 0)
  caret.setEnd(placeholder, 0)
  selection.removeAllRanges()
  selection.addRange(caret)
}

const insertPairAtSelection = (open: string, close: string) => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(`${open}${close}`)
  range.insertNode(node)
  const caret = document.createRange()
  caret.setStart(node, open.length)
  caret.setEnd(node, open.length)
  selection.removeAllRanges()
  selection.addRange(caret)
}

const createEmptyLine = () => {
  const line = document.createElement('div')
  line.innerHTML = '<br>'
  return line
}

const ensureLineAfterBlock = (block: HTMLElement) => {
  const parent = block.parentNode
  if (!parent) return null
  const next = block.nextSibling
  if (next && next.nodeType === Node.TEXT_NODE) {
    const text = next.textContent || ''
    if (text.trim() === '') {
      parent.removeChild(next)
    }
  }
  const nextElement = block.nextSibling
  if (nextElement instanceof HTMLElement) {
    if (nextElement.innerHTML === '<br>' || nextElement.textContent === '') return nextElement
  }
  const line = createEmptyLine()
  parent.insertBefore(line, block.nextSibling)
  return line
}

const placeCursorInElement = (element: HTMLElement) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

const placeCursorInTextNode = (node: Text, offset: number) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.setStart(node, Math.min(offset, node.data.length))
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

const closeAllCodeLangDropdowns = () => {
  const el = editorRef.value
  if (!el) return
  el.querySelectorAll('.code-block__lang.is-open').forEach(item => {
    item.classList.remove('is-open')
  })
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (!target) return
  if (target.closest('.code-block__lang')) return
  closeAllCodeLangDropdowns()
}

const applyHighlightInEditor = () => {
  const el = editorRef.value
  if (!el) return
  const selection = window.getSelection()
  const activeElement = selection?.anchorNode
    ? (selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement)?.closest('pre code')
    : null
  const activeCode = activeElement ? (activeElement as HTMLElement) : null
  const offsets = activeCode ? getOffsetsInElement(activeCode) : null
  isHighlighting.value = true
  const blocks = el.querySelectorAll('pre code')
  blocks.forEach(block => {
    const codeEl = block as HTMLElement
    const raw = codeEl.textContent || ''
    if (!raw) {
      codeEl.innerHTML = '<br>'
      return
    }
    const lang = getCodeLangFromElement(codeEl)
    const result = lang && hljs.getLanguage(lang)
      ? hljs.highlight(raw, { language: lang }).value
      : hljs.highlightAuto(raw).value
    codeEl.innerHTML = result
    codeEl.classList.add('hljs')
  })
  el.querySelectorAll('.code-block').forEach(block => {
    ensureCodeLangSelector(block as HTMLElement)
  })
  if (activeCode && offsets) {
    setSelectionByOffsets(activeCode, offsets.start, offsets.end)
  }
  isHighlighting.value = false
}

const createCodeLangSelect = (block: HTMLElement, value: string) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block__lang'
  wrapper.contentEditable = 'false'
  const label = document.createElement('span')
  label.className = 'code-block__lang-label'
  label.textContent = getCodeLangLabel(value)
  const arrow = document.createElement('span')
  arrow.className = 'code-block__lang-arrow'
  const dropdown = document.createElement('div')
  dropdown.className = 'code-block__lang-dropdown el-select-dropdown'
  dropdown.addEventListener('click', event => event.stopPropagation())
  codeLangOptions.forEach(option => {
    const item = document.createElement('div')
    item.className = 'code-block__lang-item el-select-dropdown__item'
    item.textContent = option.label
    item.dataset.value = option.value
    item.addEventListener('click', event => {
      event.stopPropagation()
      const lang = option.value || 'plaintext'
      codeLang.value = lang
      label.textContent = getCodeLangLabel(lang)
      applyCodeLangToBlock(block, lang)
      applyHighlightInEditor()
      wrapper.classList.remove('is-open')
    })
    dropdown.appendChild(item)
  })
  wrapper.addEventListener('click', event => {
    event.stopPropagation()
    const opened = wrapper.classList.contains('is-open')
    closeAllCodeLangDropdowns()
    if (!opened) {
      const rect = wrapper.getBoundingClientRect()
      dropdown.style.top = `${rect.bottom + 6}px`
      dropdown.style.left = `${rect.left}px`
      dropdown.style.minWidth = `${rect.width}px`
      wrapper.classList.add('is-open')
    }
  })
  wrapper.appendChild(label)
  wrapper.appendChild(arrow)
  wrapper.appendChild(dropdown)
  return wrapper
}

const insertCodeBlock = () => {
  const selection = window.getSelection()
  const el = editorRef.value
  if (!el || !selection) return
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  const wrapper = document.createElement('div')
  wrapper.className = 'code-block'
  wrapper.setAttribute('data-lang', codeLang.value)
  const header = document.createElement('div')
  header.className = 'code-block__header'
  header.contentEditable = 'false'
  header.appendChild(createCodeLangSelect(wrapper, codeLang.value))
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  if (codeLang.value && codeLang.value !== 'plaintext') {
    code.classList.add(`language-${codeLang.value}`)
  }
  code.setAttribute('data-lang', codeLang.value)
  pre.appendChild(code)
  wrapper.appendChild(header)
  wrapper.appendChild(pre)
  if (range && !range.collapsed) {
    const content = range.extractContents()
    code.appendChild(content)
    range.insertNode(wrapper)
  } else {
    code.innerHTML = '<br>'
    if (range) {
      range.insertNode(wrapper)
    } else {
      el.appendChild(wrapper)
    }
  }
  ensureLineAfterBlock(wrapper)
  const newRange = document.createRange()
  newRange.selectNodeContents(code)
  newRange.collapse(false)
  selection.removeAllRanges()
  selection.addRange(newRange)
  applyHighlightInEditor()
}

const handleFormat = async (type: 'bold' | 'italic' | 'strike' | 'code' | 'quote' | 'list' | 'ordered' | 'codeblock') => {
  await focusEditor()
  if (type === 'bold') document.execCommand('bold')
  if (type === 'italic') document.execCommand('italic')
  if (type === 'strike') document.execCommand('strikeThrough')
  if (type === 'code') {
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (range && range.collapsed) {
      insertInlineCodeAtSelection()
    } else {
      wrapSelection('code')
    }
  }
  if (type === 'quote') document.execCommand('formatBlock', false, 'blockquote')
  if (type === 'list') document.execCommand('insertUnorderedList')
  if (type === 'ordered') document.execCommand('insertOrderedList')
  if (type === 'codeblock') insertCodeBlock()
  updateEditorState()
}

const handleEditorKeydown = (event: KeyboardEvent) => {
  if (isHighlighting.value) return
  if (event.key === '(' || event.key === '{') {
    const codeElement = getActiveCodeElement()
    if (!codeElement) return
    const offsets = getOffsetsInElement(codeElement)
    const raw = codeElement.textContent || ''
    const nextChar = offsets ? raw[offsets.start] : ''
    const close = event.key === '(' ? ')' : '}'
    if (nextChar === close) return
    event.preventDefault()
    insertPairAtSelection(event.key, close)
    updateEditorState()
    applyHighlightInEditor()
    updateEditorState()
    return
  }
  if (event.key === 'Tab') {
    const codeElement = getActiveCodeElement()
    if (!codeElement) return
    event.preventDefault()
    insertTextAtSelection('    ')
    updateEditorState()
    applyHighlightInEditor()
    updateEditorState()
    return
  }
  if (event.key === 'ArrowDown') {
    const codeElement = getActiveCodeElement()
    if (!codeElement) return
    const offsets = getOffsetsInElement(codeElement)
    const raw = codeElement.textContent || ''
    if (!offsets || offsets.end < raw.length) return
    event.preventDefault()
    const block = codeElement.closest('.code-block') as HTMLElement | null
    if (!block) return
    const line = ensureLineAfterBlock(block)
    if (line) {
      placeCursorInElement(line)
      updateEditorState()
    }
  }
  if (event.key === 'ArrowRight') {
    const inlineCode = getActiveInlineCodeElement()
    if (!inlineCode) return
    const offsets = getOffsetsInElement(inlineCode)
    const raw = inlineCode.textContent || ''
    if (!offsets || offsets.end < raw.length) return
    event.preventDefault()
    const parent = inlineCode.parentNode
    if (!parent) return
    let next = inlineCode.nextSibling
    if (next?.nodeType === Node.TEXT_NODE) {
      const textNode = next as Text
      if (!textNode.data.startsWith(' ')) {
        textNode.data = ` ${textNode.data}`
      }
      placeCursorInTextNode(textNode, 1)
      updateEditorState()
      return
    }
    const spacer = document.createTextNode(' ')
    parent.insertBefore(spacer, inlineCode.nextSibling)
    placeCursorInTextNode(spacer, 1)
    updateEditorState()
  }
}

const handleEditorInput = () => {
  if (isHighlighting.value) return
  updateEditorState()
  applyHighlightInEditor()
  updateEditorState()
}

const handleCompositionEnd = () => {
  if (isHighlighting.value) return
  updateEditorState()
  applyHighlightInEditor()
  updateEditorState()
}

const handleSelectionChange = () => {
  const selection = window.getSelection()
  const el = editorRef.value
  if (!selection || !el) return
  const node = selection.anchorNode
  if (!node || !el.contains(node)) return
  const block = getCodeBlockFromSelection()
  if (!block) return
  const lang = block.getAttribute('data-lang') || 'plaintext'
  if (codeLang.value !== lang) {
    codeLang.value = lang
  }
}

const wordCount = computed(() => contentText.value.length)
const draftTags = computed(() => {
  const text = contentText.value.trim()
  if (!text) return []
  const match = text.match(/(?:^|\s)(#\S+(?:\s+#\S+)*)\s*$/)
  if (!match?.[1]) return []
  return match[1].split(/\s+/).filter(Boolean)
})

const handleSubmit = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  const plain = editorRef.value ? extractPlainTextFromNode(editorRef.value).trim() : extractPlainTextFromHtml(content.value).trim()
  if (!plain) {
    ElMessage.warning('请输入内容')
    return
  }
  isSaving.value = true
  try {
    let rawContent = content.value
    if (contentText.value.endsWith('\n')) {
      const container = document.createElement('div')
      container.innerHTML = rawContent
      const last = container.lastChild
      if (last instanceof HTMLElement) {
        const lastText = last.textContent || ''
        if (last.innerHTML === '<br>' || lastText.trim() === '') {
          container.removeChild(last)
          rawContent = container.innerHTML
        }
      }
    }
    const safeContent = sanitizeHtml(rawContent)
    const safePlain = extractPlainTextFromHtml(safeContent)
    const payload = toPayload()
    if (editingId.value) {
      await updatePostApi({
        id: editingId.value,
        title: title.value.trim(),
        content: safeContent,
        plain_content: safePlain,
        medias: payload
      })
      ElMessage.success('修改成功')
    } else {
      await createPostApi({
        title: title.value.trim(),
        content: safeContent,
        plain_content: safePlain,
        medias: payload
      })
      ElMessage.success('发布成功')
    }
    router.push('/creator/manage')
  } catch (e) {
    ElMessage.error('提交失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
}

const loadEditPost = async () => {
  if (!editingId.value) return
  try {
    const res: any = await getPostDetailApi(editingId.value)
    if (!res?.data) return
    title.value = res.data.title || ''
    content.value = res.data.content || ''
    mediaList.value = (res.data.medias || []).map((media: any) => ({
      url: media.url,
      mime: media.mime_type || '',
      width: media.width,
      height: media.height,
      duration: media.duration,
      previewUrl: media.url,
      coverUrl: media.cover_url
    }))
    await setEditorHtml(content.value)
  } catch (e) {
  }
}

onMounted(() => {
  document.addEventListener('selectionchange', handleSelectionChange)
  document.addEventListener('click', handleDocumentClick)
  if (editingId.value) {
    loadEditPost()
  } else {
    resetForm()
  }
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleSelectionChange)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="creator-publish">
    <div class="publish-card">
      <div class="card-header">
        <div>
          <h2>{{ editingId ? '编辑帖子' : '发布帖子' }}</h2>
          <p>在这里分享你的创作灵感</p>
        </div>
        <button class="back-btn" @click="router.push('/creator/manage')">返回管理</button>
      </div>

      <div class="form-section">
        <label class="form-label">标题</label>
        <div class="g-input-item">
          <input v-model="title" type="text" placeholder="输入帖子标题" maxlength="60" />
        </div>
      </div>

      <div class="form-section">
        <label class="form-label">内容</label>
        <div class="format-toolbar">
          <button type="button" class="format-btn" title="加粗" @mousedown.prevent @click="handleFormat('bold')">B</button>
          <button type="button" class="format-btn" title="斜体" @mousedown.prevent @click="handleFormat('italic')">I</button>
          <button type="button" class="format-btn" title="删除线" @mousedown.prevent @click="handleFormat('strike')">S</button>
          <button type="button" class="format-btn" title="行内代码" @mousedown.prevent @click="handleFormat('code')">{ }</button>
          <button type="button" class="format-btn" title="引用" @mousedown.prevent @click="handleFormat('quote')">"</button>
          <button type="button" class="format-btn" title="无序列表" @mousedown.prevent @click="handleFormat('list')">•</button>
          <button type="button" class="format-btn" title="有序列表" @mousedown.prevent @click="handleFormat('ordered')">1.</button>
          <div class="format-group">
            <button type="button" class="format-btn" title="代码块" @mousedown.prevent @click="handleFormat('codeblock')">```</button>
          </div>
        </div>
        <div
          ref="editorRef"
          class="rich-editor"
          contenteditable="true"
          data-placeholder="记录你的想法..."
          @keydown="handleEditorKeydown"
          @input="handleEditorInput"
          @focus="focusEditor"
          @compositionend="handleCompositionEnd"
        ></div>
        <span class="word-count">{{ wordCount }}/2000</span>
        <div v-if="draftTags.length > 0" class="draft-tags">
          <span v-for="tag in draftTags" :key="tag" class="draft-tag">{{ tag }}</span>
        </div>
      </div>

      <div class="form-section">
        <div class="section-row">
          <label class="form-label">媒体附件</label>
          <button class="upload-btn" @click="triggerUpload" :disabled="isUploading">
            {{ isUploading ? '上传中...' : '添加附件' }}
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            style="display: none"
            @change="handleFileChange"
          />
          <input
            ref="coverInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleCoverChange"
          />
        </div>
        <div v-if="mediaList.length > 0" class="media-grid">
          <div
            v-for="(media, index) in mediaList"
            :key="media.url + index"
            class="media-item"
            :class="{ audio: media.mime?.startsWith('audio'), video: media.mime?.startsWith('video') }"
          >
            <img v-if="media.mime?.startsWith('image')" :src="media.previewUrl" alt="preview" />
            <img
              v-else-if="media.mime?.startsWith('video') && media.coverUrl"
              :src="media.coverUrl"
              alt="cover"
            />
            <video v-else-if="media.mime?.startsWith('video')" :src="media.previewUrl" muted></video>
            <div v-else class="audio-placeholder">音频</div>
            <div v-if="media.mime?.startsWith('video')" class="cover-actions">
              <button
                type="button"
                class="cover-btn"
                @click="triggerCoverUpload(index)"
                :disabled="isCoverUploading"
              >
                {{ isCoverUploading ? '上传中' : '设置封面' }}
              </button>
              <button
                v-if="media.coverUrl"
                type="button"
                class="cover-btn ghost"
                @click="removeCover(index)"
              >
                移除
              </button>
            </div>
            <button class="remove-btn" @click="removeMedia(index)">×</button>
          </div>
        </div>
        <div v-else class="media-empty">暂无附件</div>
      </div>

      <div class="action-row">
        <button class="primary-btn" @click="handleSubmit" :disabled="isSaving">
          {{ isSaving ? '提交中...' : (editingId ? '保存修改' : '发布') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.creator-publish {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.publish-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.card-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
}

.card-header p {
  margin: 6px 0 0;
  color: #9499A0;
  font-size: 13px;
}

.back-btn {
  background: #F4F6F8;
  border: none;
  color: #61666D;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: #00AEEC;
}

.form-section {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  color: #61666D;
  margin-bottom: 10px;
  font-weight: 600;
}

.format-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F4F6F8;
  padding: 6px 8px;
  border-radius: 12px;
  margin-bottom: 10px;
}

.format-btn {
  border: none;
  background: #ffffff;
  color: #18191C;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
}

.format-btn:hover {
  color: #00AEEC;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.format-group {
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border-radius: 8px;
  padding: 2px;
  border: 1px solid #E3E5E7;
  overflow: hidden;
  height: 30px;
}

.format-group .format-btn {
  box-shadow: none;
}

.format-group:focus-within {
  border-color: #00AEEC;
  box-shadow: 0 0 0 2px rgba(0, 174, 236, 0.12);
}

.rich-editor {
  width: 100%;
  min-height: 140px;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: text;
  background: #ffffff;
  border: 1px solid #E3E5E7;
  font-size: 14px;
  color: #333;
  line-height: 1.8;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  white-space: pre-wrap;
  word-break: break-word;
  outline: none;
  resize: vertical;
  overflow: auto;
  box-sizing: border-box;
}

.rich-editor:focus {
  border-color: #00AEEC;
  box-shadow: 0 0 0 2px rgba(0, 174, 236, 0.12);
}

.rich-editor:empty::before {
  content: attr(data-placeholder);
  color: #C0C4CC;
}

.rich-editor strong {
  font-weight: 800;
}

.rich-editor em {
  font-style: italic;
}

.rich-editor del {
  text-decoration: line-through;
  color: #8A9099;
}


.rich-editor h1,
.rich-editor h2,
.rich-editor h3,
.rich-editor h4,
.rich-editor h5,
.rich-editor h6 {
  margin: 6px 0;
  font-weight: 800;
  line-height: 1.4;
}

.rich-editor h1 { font-size: 22px; }
.rich-editor h2 { font-size: 20px; }
.rich-editor h3 { font-size: 18px; }
.rich-editor h4 { font-size: 16px; }
.rich-editor h5 { font-size: 15px; }
.rich-editor h6 { font-size: 14px; }

.rich-editor blockquote {
  margin: 8px 0;
  padding: 8px 12px;
  background: #f7f9fb;
  border-left: 4px solid #00AEEC;
  border-radius: 8px;
  color: #4a4f55;
}

.rich-editor ul,
.rich-editor ol {
  margin: 8px 0;
  padding-left: 22px;
}

.rich-editor li {
  margin: 4px 0;
}

.word-count {
  display: block;
  margin-top: 6px;
  text-align: right;
  font-size: 12px;
  color: #C0C4CC;
}

.draft-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.draft-tag {
  color: #00AEEC;
  font-size: 12px;
  background: rgba(0, 174, 236, 0.1);
  padding: 4px 10px;
  border-radius: 999px;
}

.section-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upload-btn {
  background: rgba(0, 174, 236, 0.1);
  color: #00AEEC;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.media-item {
  position: relative;
  background: #F4F6F8;
  border-radius: 12px;
  overflow: hidden;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-item img,
.media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-item.audio {
  background: rgba(0, 174, 236, 0.08);
}

.media-item.video::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px dashed rgba(0, 174, 236, 0.3);
  border-radius: 12px;
  pointer-events: none;
}

.audio-placeholder {
  color: #00AEEC;
  font-weight: 600;
  font-size: 14px;
}

.cover-actions {
  position: absolute;
  left: 6px;
  bottom: 6px;
  display: flex;
  gap: 6px;
}

.cover-btn {
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  cursor: pointer;
  font-weight: 600;
}

.cover-btn.ghost {
  background: rgba(255, 255, 255, 0.85);
  color: #18191C;
}

.cover-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.media-empty {
  margin-top: 12px;
  color: #9499A0;
  font-size: 13px;
}

.action-row {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  background: #00AEEC;
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 12px 32px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.primary-btn:disabled {
  background: #A0DFFE;
  cursor: not-allowed;
}
</style>
