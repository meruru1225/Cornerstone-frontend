import { defineStore } from 'pinia'
import { getPostDetailApi } from '../api/post'
import { getPostCommentsApi } from '../api/post-action'

export const usePostCacheStore = defineStore('post-cache', () => {
    const detailCache = new Map<number, Promise<any>>()
    const commentsCache = new Map<number, Promise<any>>()

    const prefetch = (postId: number | null | undefined) => {
        if (postId === null || postId === undefined) return
        if (!Number.isFinite(postId)) return
        const idStr = postId.toString()

        if (!commentsCache.has(postId)) {
            commentsCache.set(postId, getPostCommentsApi(idStr, { page: 1, page_size: 50 }))
        }
    }

    const getDetail = (postId: number) => {
        if (!detailCache.has(postId)) {
            const idStr = postId.toString()
            detailCache.set(postId, getPostDetailApi(idStr))
        }
        return detailCache.get(postId)!
    }

    const getComments = (postId: number) => {
        if (!commentsCache.has(postId)) {
            prefetch(postId)
        }
        return commentsCache.get(postId)!
    }

    const clearCache = (postId: number) => {
        detailCache.delete(postId)
        commentsCache.delete(postId)
    }

    const clearComments = (postId: number) => {
        commentsCache.delete(postId)
    }

    return {
        prefetch,
        getDetail,
        getComments,
        clearCache,
        clearComments
    }
})
