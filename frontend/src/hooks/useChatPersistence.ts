import { useCallback, useEffect, useState } from 'react'

export interface ChatConversation {
  id: string
  name: string
  lastInteraction: string // ISO string
  messages: ChatPersistMessage[]
  documentContent: string
}

export interface ChatPersistMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Collapsed thinking trace steps attached to assistant messages */
  thinkingSteps?: ThinkingStep[]
}

export interface ThinkingStep {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  details?: string
}

const STORAGE_PREFIX = 'qa_mgmt_chats_'

function getStorageKey(featureSlug: string): string {
  return `${STORAGE_PREFIX}${featureSlug}`
}

function loadConversations(featureSlug: string): ChatConversation[] {
  try {
    const raw = localStorage.getItem(getStorageKey(featureSlug))
    if (!raw) return []
    return JSON.parse(raw) as ChatConversation[]
  } catch {
    return []
  }
}

function saveConversations(featureSlug: string, conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(getStorageKey(featureSlug), JSON.stringify(conversations))
  } catch {
    console.warn('Failed to persist chat history to localStorage')
  }
}

/**
 * Hook for persisting and managing chat conversation history in localStorage.
 */
export function useChatPersistence(featureSlug: string) {
  const [conversations, setConversations] = useState<ChatConversation[]>(() =>
    loadConversations(featureSlug),
  )
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const loaded = loadConversations(featureSlug)
    return loaded.length > 0 ? loaded[0].id : null
  })

  // Persist to localStorage whenever conversations change
  useEffect(() => {
    saveConversations(featureSlug, conversations)
  }, [conversations, featureSlug])

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  /**
   * Create a brand new conversation and set it as active.
   */
  const createConversation = useCallback(
    (name?: string): ChatConversation => {
      const newConv: ChatConversation = {
        id: crypto.randomUUID(),
        name: name || `Conversación ${conversations.length + 1}`,
        lastInteraction: new Date().toISOString(),
        messages: [],
        documentContent: '',
      }
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv.id)
      return newConv
    },
    [conversations.length],
  )

  /**
   * Update the active conversation's messages and/or document content.
   */
  const updateConversation = useCallback(
    (updates: Partial<Pick<ChatConversation, 'messages' | 'documentContent' | 'name'>>) => {
      if (!activeConversationId) return
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                ...updates,
                lastInteraction: new Date().toISOString(),
              }
            : c,
        ),
      )
    },
    [activeConversationId],
  )

  /**
   * Rename a conversation.
   */
  const renameConversation = useCallback((id: string, newName: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    )
  }, [])

  /**
   * Delete a conversation.
   */
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        // If we deleted the active one, switch to the first remaining or null
        if (activeConversationId === id) {
          setActiveConversationId(filtered.length > 0 ? filtered[0].id : null)
        }
        return filtered
      })
    },
    [activeConversationId],
  )

  /**
   * Switch to an existing conversation.
   */
  const switchConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    createConversation,
    updateConversation,
    renameConversation,
    deleteConversation,
    switchConversation,
  }
}
