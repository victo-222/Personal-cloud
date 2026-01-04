// User Messaging & Complaint System
// Allows users to send complaints/reviews to admin and receive responses

export type MessageType = 'complaint' | 'review' | 'bug_report' | 'feature_request' | 'general';
export type MessageStatus = 'new' | 'read' | 'in_progress' | 'resolved' | 'closed';
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserMessage {
  id: string;
  userId: string;
  username: string;
  email?: string;
  type: MessageType;
  subject: string;
  message: string;
  priority: MessagePriority;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  attachments?: string[]; // file URLs
  metadata: {
    rating?: number; // 1-5 for reviews
    category?: string;
    tags?: string[];
  };
}

export interface AdminResponse {
  id: string;
  messageId: string;
  adminId: string;
  adminName: string;
  response: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  isResolution: boolean; // true if this closes the message
}

export interface ConversationThread {
  messageId: string;
  userMessage: UserMessage;
  adminResponses: AdminResponse[];
  totalResponses: number;
}

export class UserMessagingService {
  private userMessages: Map<string, UserMessage> = new Map();
  private adminResponses: Map<string, AdminResponse[]> = new Map();
  private messageStats: Map<string, any> = new Map();

  constructor() {
    // Initialize service
  }

  // ============================================
  // MESSAGE CREATION
  // ============================================

  /**
   * Create new message from user
   */
  createUserMessage(
    userId: string,
    username: string,
    type: MessageType,
    subject: string,
    message: string,
    priority: MessagePriority = 'medium',
    email?: string
  ): UserMessage {
    const id = `msg-${userId}-${Date.now()}-${Math.random()}`;

    const userMessage: UserMessage = {
      id,
      userId,
      username,
      email,
      type,
      subject,
      message,
      priority,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.userMessages.set(id, userMessage);
    this.adminResponses.set(id, []);

    return userMessage;
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): UserMessage | null {
    return this.userMessages.get(messageId) || null;
  }

  /**
   * Get all messages for user
   */
  getUserMessages(userId: string): UserMessage[] {
    return Array.from(this.userMessages.values()).filter((m) => m.userId === userId);
  }

  /**
   * Get all unread messages
   */
  getAllUnreadMessages(): UserMessage[] {
    return Array.from(this.userMessages.values()).filter((m) => m.status === 'new');
  }

  /**
   * Get all messages (for admin)
   */
  getAllMessages(filter?: { type?: MessageType; status?: MessageStatus; priority?: MessagePriority }): UserMessage[] {
    let messages = Array.from(this.userMessages.values());

    if (filter?.type) {
      messages = messages.filter((m) => m.type === filter.type);
    }

    if (filter?.status) {
      messages = messages.filter((m) => m.status === filter.status);
    }

    if (filter?.priority) {
      messages = messages.filter((m) => m.priority === filter.priority);
    }

    return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ============================================
  // MESSAGE STATUS MANAGEMENT
  // ============================================

  /**
   * Mark message as read
   */
  markAsRead(messageId: string, adminId?: string): UserMessage | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    message.status = 'read';
    message.readAt = new Date();
    message.updatedAt = new Date();

    return message;
  }

  /**
   * Mark message as in progress
   */
  markAsInProgress(messageId: string, adminId: string): UserMessage | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    message.status = 'in_progress';
    message.updatedAt = new Date();

    return message;
  }

  /**
   * Mark message as resolved
   */
  markAsResolved(messageId: string, adminId: string): UserMessage | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    message.status = 'resolved';
    message.updatedAt = new Date();

    return message;
  }

  /**
   * Mark message as closed
   */
  markAsClosed(messageId: string, adminId: string): UserMessage | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    message.status = 'closed';
    message.updatedAt = new Date();

    return message;
  }

  /**
   * Update message priority
   */
  updatePriority(messageId: string, priority: MessagePriority, adminId: string): UserMessage | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    message.priority = priority;
    message.updatedAt = new Date();

    return message;
  }

  // ============================================
  // ADMIN RESPONSES
  // ============================================

  /**
   * Add admin response to message
   */
  addAdminResponse(
    messageId: string,
    adminId: string,
    adminName: string,
    response: string,
    isResolution: boolean = false,
    attachments?: string[]
  ): AdminResponse | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    const adminResponse: AdminResponse = {
      id: `resp-${messageId}-${Date.now()}`,
      messageId,
      adminId,
      adminName,
      response,
      attachments,
      createdAt: new Date(),
      updatedAt: new Date(),
      isResolution,
    };

    const responses = this.adminResponses.get(messageId) || [];
    responses.push(adminResponse);
    this.adminResponses.set(messageId, responses);

    // Update message status
    if (isResolution) {
      message.status = 'resolved';
    } else {
      message.status = 'in_progress';
    }
    message.updatedAt = new Date();

    return adminResponse;
  }

  /**
   * Get all responses for message
   */
  getMessageResponses(messageId: string): AdminResponse[] {
    return this.adminResponses.get(messageId) || [];
  }

  /**
   * Get full conversation thread
   */
  getConversationThread(messageId: string): ConversationThread | null {
    const message = this.userMessages.get(messageId);
    if (!message) return null;

    const responses = this.adminResponses.get(messageId) || [];

    return {
      messageId,
      userMessage: message,
      adminResponses: responses,
      totalResponses: responses.length,
    };
  }

  /**
   * Update admin response
   */
  updateAdminResponse(
    messageId: string,
    responseId: string,
    newResponse: string,
    adminId: string
  ): AdminResponse | null {
    const responses = this.adminResponses.get(messageId);
    if (!responses) return null;

    const response = responses.find((r) => r.id === responseId);
    if (!response) return null;

    response.response = newResponse;
    response.updatedAt = new Date();

    return response;
  }

  /**
   * Delete admin response
   */
  deleteAdminResponse(messageId: string, responseId: string, adminId: string): boolean {
    const responses = this.adminResponses.get(messageId);
    if (!responses) return false;

    const index = responses.findIndex((r) => r.id === responseId);
    if (index === -1) return false;

    responses.splice(index, 1);
    return true;
  }

  // ============================================
  // ANALYTICS & STATISTICS
  // ============================================

  /**
   * Get messaging statistics
   */
  getMessagingStatistics(): {
    totalMessages: number;
    newMessages: number;
    readMessages: number;
    inProgressMessages: number;
    resolvedMessages: number;
    closedMessages: number;
    totalResponses: number;
    averageResponseTime: number;
    messagesByType: Record<MessageType, number>;
    messagesByPriority: Record<MessagePriority, number>;
  } {
    const messages = Array.from(this.userMessages.values());
    const responses = Array.from(this.adminResponses.values()).flat();

    const calculateAverageResponseTime = (): number => {
      let totalTime = 0;
      let count = 0;

      messages.forEach((msg) => {
        const resps = this.adminResponses.get(msg.id) || [];
        if (resps.length > 0) {
          const firstResponse = resps[0];
          const responseTime = firstResponse.createdAt.getTime() - msg.createdAt.getTime();
          totalTime += responseTime;
          count++;
        }
      });

      return count > 0 ? totalTime / count / 1000 / 60 : 0; // minutes
    };

    const messagesByType: Record<MessageType, number> = {
      complaint: 0,
      review: 0,
      bug_report: 0,
      feature_request: 0,
      general: 0,
    };

    const messagesByPriority: Record<MessagePriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    messages.forEach((msg) => {
      messagesByType[msg.type]++;
      messagesByPriority[msg.priority]++;
    });

    return {
      totalMessages: messages.length,
      newMessages: messages.filter((m) => m.status === 'new').length,
      readMessages: messages.filter((m) => m.status === 'read').length,
      inProgressMessages: messages.filter((m) => m.status === 'in_progress').length,
      resolvedMessages: messages.filter((m) => m.status === 'resolved').length,
      closedMessages: messages.filter((m) => m.status === 'closed').length,
      totalResponses: responses.length,
      averageResponseTime: calculateAverageResponseTime(),
      messagesByType,
      messagesByPriority,
    };
  }

  /**
   * Get user satisfaction (from reviews)
   */
  getUserSatisfaction(): { averageRating: number; totalReviews: number; ratingDistribution: Record<number, number> } {
    const reviews = Array.from(this.userMessages.values()).filter((m) => m.type === 'review' && m.metadata.rating);

    const ratingDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalRating = 0;
    reviews.forEach((review) => {
      if (review.metadata.rating) {
        totalRating += review.metadata.rating;
        ratingDistribution[review.metadata.rating]++;
      }
    });

    return {
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }

  /**
   * Get messages by user
   */
  getMessageStats(userId: string): {
    totalMessages: number;
    complaints: number;
    reviews: number;
    bugReports: number;
    featureRequests: number;
    resolved: number;
    pending: number;
  } {
    const userMsgs = this.getUserMessages(userId);

    return {
      totalMessages: userMsgs.length,
      complaints: userMsgs.filter((m) => m.type === 'complaint').length,
      reviews: userMsgs.filter((m) => m.type === 'review').length,
      bugReports: userMsgs.filter((m) => m.type === 'bug_report').length,
      featureRequests: userMsgs.filter((m) => m.type === 'feature_request').length,
      resolved: userMsgs.filter((m) => m.status === 'resolved' || m.status === 'closed').length,
      pending: userMsgs.filter((m) => m.status === 'new' || m.status === 'in_progress').length,
    };
  }

  /**
   * Export messages for admin
   */
  exportMessages(filters?: { type?: MessageType; status?: MessageStatus }): string {
    const messages = this.getAllMessages(filters);

    const exportData = messages.map((msg) => ({
      ...msg,
      responses: this.adminResponses.get(msg.id) || [],
    }));

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Clear old messages (older than X days)
   */
  clearOldMessages(daysOld: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    const idsToDelete: string[] = [];

    this.userMessages.forEach((msg, id) => {
      if (msg.status === 'closed' && msg.updatedAt < cutoffDate) {
        idsToDelete.push(id);
        deletedCount++;
      }
    });

    idsToDelete.forEach((id) => {
      this.userMessages.delete(id);
      this.adminResponses.delete(id);
    });

    return deletedCount;
  }
}

// Singleton instance
export const userMessagingService = new UserMessagingService();
